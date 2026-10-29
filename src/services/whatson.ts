import { config } from "../config";
import type { WhatsOnSearchResponse } from "../types";

export interface WhatsOnFetchOptions {
  page?: number;
  itemType?: "movie" | "tvshow";
  genres?: string;
  platforms?: string;
  title?: string;
}

/**
 * Normalizes genre names to match TMDB/WhatsOn API conventions:
 * - Movies use "Science Fiction"
 * - TV shows use "Sci-Fi & Fantasy"
 */
export function normalizeGenre(
  genre?: string,
  itemType?: "movie" | "tvshow",
): string | undefined {
  if (!genre) return undefined;
  const lower = genre.toLowerCase().trim();
  if (lower === "sci-fi" || lower === "scifi" || lower === "science fiction") {
    return itemType === "tvshow" ? "Sci-Fi & Fantasy" : "Science Fiction";
  }
  return genre;
}

/**
 * Fetch data from WhatsOn API with automatic fallback:
 * - If the configured API key hits a rate limit (HTTP 429), it retries without the key.
 * - If HTTP 404 is returned ("No matching items found"), it cleanly returns an empty result set.
 */
export async function fetchWhatsOn(
  options: WhatsOnFetchOptions = {},
): Promise<WhatsOnSearchResponse> {
  const { page = 1, itemType, genres, platforms, title } = options;
  const apiKey = config.whatsonApiKey;
  const normalizedGenre = normalizeGenre(genres, itemType);

  const buildUrl = (useKey: boolean) => {
    let url = `https://whatson-api.onrender.com/?page=${page}&append_to_response=original_title`;
    if (useKey && apiKey) {
      url += `&api_key=${apiKey}`;
    }
    if (itemType) {
      url += `&item_type=${itemType}`;
    }
    if (normalizedGenre) {
      url += `&genres=${encodeURIComponent(normalizedGenre)}`;
    }
    if (platforms) {
      url += `&platforms=${encodeURIComponent(platforms)}`;
    }
    if (title) {
      url += `&title=${encodeURIComponent(title)}`;
    }
    return url;
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(true));
  } catch (err) {
    console.warn("Primary WhatsOn fetch failed, trying fallback:", err);
    response = await fetch(buildUrl(false));
  }

  // If rate limited with the key (429), retry immediately without the key
  if (response.status === 429) {
    console.warn(
      "WhatsOn API key rate limit (429) reached. Retrying without API key...",
    );
    try {
      response = await fetch(buildUrl(false));
    } catch (err) {
      console.error("Fallback WhatsOn fetch failed:", err);
      return { page, results: [], total_pages: 0, total_results: 0 };
    }
  }

  // WhatsOn API returns 404 with {"message": "No matching items found..."} when results are empty
  if (response.status === 404) {
    return { page, results: [], total_pages: 0, total_results: 0 };
  }

  if (!response.ok) {
    console.error(`WhatsOn API error: HTTP ${response.status}`);
    return { page, results: [], total_pages: 0, total_results: 0 };
  }

  try {
    const data: WhatsOnSearchResponse = await response.json();
    return {
      page: data.page || page,
      results: Array.isArray(data.results) ? data.results : [],
      total_pages: data.total_pages || 0,
      total_results: data.total_results || 0,
    };
  } catch (err) {
    console.error("Error parsing WhatsOn response:", err);
    return { page, results: [], total_pages: 0, total_results: 0 };
  }
}
