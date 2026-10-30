import { config } from "../config";
import { fetchWhatsOn } from "./whatson";
import type { Movie, WatchlistItem } from "../types";

export interface ParsedCsvResult {
  format: "imdb" | "letterboxd" | "unknown";
  items: RawImportItem[];
  totalRows: number;
}

export interface RawImportItem {
  rawTitle: string;
  year: string;
  date?: string; // watched date or added date
  imdbId?: string; // present in IMDb
  type?: string; // movie, series
  runtime?: number; // in seconds
  genres?: string[];
  rating?: string;
  source: "imdb" | "letterboxd";
}

export interface EnrichedImportItem {
  rawItem: RawImportItem;
  movieData: Movie | WatchlistItem | null;
  status: "success" | "skipped" | "not_found";
  errorReason?: string;
}

/**
 * Standard RFC 4180 CSV line/file parser that supports:
 * - Commas inside quoted strings
 * - Escaped quotes ("")
 * - CRLF and LF newlines
 */
export function parseCsv(text: string): string[][] {
  const parsedRows: string[][] = [];
  let currentRow: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentRow[currentRow.length - 1] += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push("");
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++; // skip \n in \r\n
      if (currentRow.length > 1 || currentRow[0] !== "") {
        parsedRows.push(currentRow);
      }
      currentRow = [""];
    } else {
      currentRow[currentRow.length - 1] += char;
    }
  }

  if (currentRow.length > 1 || currentRow[0] !== "") {
    parsedRows.push(currentRow);
  }

  return parsedRows;
}

/**
 * Helper to convert runtime string (e.g. "124 min") into seconds
 */
export function fromMinStringToSecond(runtimeStr: string | number): number {
  if (typeof runtimeStr === "number") return runtimeStr;
  const minutes = Number(runtimeStr.replace(/[^0-9]/g, ""));
  return isNaN(minutes) ? 0 : minutes * 60;
}

/**
 * Detect format and map CSV rows to RawImportItems
 */
export function parseExternalCsv(csvText: string): ParsedCsvResult {
  const rows = parseCsv(csvText.trim());
  if (rows.length < 2) {
    return { format: "unknown", items: [], totalRows: 0 };
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  const lowerHeaders = rawHeaders.map((h) => h.toLowerCase());

  // Detect format
  const isImdb =
    lowerHeaders.includes("const") &&
    (lowerHeaders.includes("title") || lowerHeaders.includes("title type"));
  const isLetterboxd =
    lowerHeaders.includes("letterboxd uri") ||
    (lowerHeaders.includes("name") && lowerHeaders.includes("year"));

  const format: "imdb" | "letterboxd" | "unknown" = isImdb
    ? "imdb"
    : isLetterboxd
      ? "letterboxd"
      : "unknown";

  if (format === "unknown") {
    return { format: "unknown", items: [], totalRows: rows.length - 1 };
  }

  const headerIndexMap: Record<string, number> = {};
  lowerHeaders.forEach((h, idx) => {
    headerIndexMap[h] = idx;
  });

  const getCol = (row: string[], colName: string): string => {
    const idx = headerIndexMap[colName.toLowerCase()];
    if (idx !== undefined && row[idx] !== undefined) {
      return row[idx].trim();
    }
    return "";
  };

  const items: RawImportItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    if (format === "imdb") {
      const constId = getCol(row, "const");
      const title = getCol(row, "title");
      let year = getCol(row, "year");
      if (!year && getCol(row, "release date")) {
        year = getCol(row, "release date").split("-")[0];
      }
      const titleType = getCol(row, "title type").toLowerCase();
      const type = titleType.includes("tv") ? "series" : "movie";
      const runtimeMinutes = Number(getCol(row, "runtime (mins)"));
      const runtimeSeconds =
        !isNaN(runtimeMinutes) && runtimeMinutes > 0 ? runtimeMinutes * 60 : 0;
      const rawGenres = getCol(row, "genres");
      const genres = rawGenres
        ? rawGenres.split(",").map((g) => g.trim()).filter(Boolean)
        : [];
      const date =
        getCol(row, "date rated") ||
        getCol(row, "release date") ||
        getCol(row, "created") ||
        getCol(row, "modified");
      const rating = getCol(row, "your rating");

      if (title && constId) {
        items.push({
          rawTitle: title,
          year: year || "N/A",
          imdbId: constId,
          type,
          runtime: runtimeSeconds,
          genres,
          date,
          rating,
          source: "imdb",
        });
      }
    } else if (format === "letterboxd") {
      const name = getCol(row, "name") || getCol(row, "title");
      const year = getCol(row, "year");
      const date =
        getCol(row, "date") ||
        getCol(row, "watched date");
      const rating = getCol(row, "rating");

      if (name) {
        items.push({
          rawTitle: name,
          year: year || "N/A",
          date,
          rating,
          source: "letterboxd",
        });
      }
    }
  }

  return {
    format,
    items,
    totalRows: items.length,
  };
}

/**
 * Enrich single item using OMDb & WhatsOn APIs
 */
export async function enrichExternalItem(
  item: RawImportItem,
  targetType: "seen" | "watchlist",
): Promise<EnrichedImportItem> {
  const apiKeyOMDB = config.omdbApiKey;
  const watchedOrAddedAt = item.date
    ? new Date(item.date).toISOString()
    : new Date().toISOString();

  // 1. If IMDb, we already possess the precise imdbId!
  if (item.source === "imdb" && item.imdbId) {
    let posterUrl: string | null = null;
    let resolvedRuntime = item.runtime || 0;
    let resolvedGenres = item.genres || [];

    try {
      const res = await fetch(
        `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&i=${item.imdbId}`,
      );
      const data = await res.json();
      if (data && data.Response === "True") {
        if (data.Poster && data.Poster !== "N/A") {
          posterUrl = data.Poster;
        }
        if (!resolvedRuntime && data.Runtime) {
          resolvedRuntime = fromMinStringToSecond(data.Runtime);
        }
        if (resolvedGenres.length === 0 && data.Genre) {
          resolvedGenres = data.Genre.split(", ").filter(Boolean);
        }
      }
    } catch {
      // Fallback cleanly: even without network poster, we have title, year, runtime, genres, imdbID
    }

    const movie: Movie = {
      imdbID: item.imdbId,
      Title: item.rawTitle,
      Year: item.year,
      Type: item.type || "movie",
      Poster: posterUrl,
      Runtime: resolvedRuntime,
      Genres: resolvedGenres,
      WatchedAt: targetType === "seen" ? watchedOrAddedAt : undefined,
    };

    if (targetType === "watchlist") {
      (movie as WatchlistItem).addedAt = watchedOrAddedAt;
    }

    return {
      rawItem: item,
      movieData: movie,
      status: "success",
    };
  }

  // 2. If Letterboxd: resolve imdbID, poster, genres, runtime via Title + Year
  try {
    const cleanTitle = item.rawTitle.trim();
    const cleanYear = item.year !== "N/A" ? item.year.trim() : "";

    // Step 2a: Exact OMDb title + year match
    let omdbUrl = `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&t=${encodeURIComponent(cleanTitle)}&type=movie`;
    if (cleanYear) omdbUrl += `&y=${cleanYear}`;

    let res = await fetch(omdbUrl);
    let data = await res.json();

    // Step 2b: If exact match failed, try without type=movie (could be miniseries/special)
    if (!data || data.Response !== "True") {
      let retryUrl = `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&t=${encodeURIComponent(cleanTitle)}`;
      if (cleanYear) retryUrl += `&y=${cleanYear}`;
      res = await fetch(retryUrl);
      data = await res.json();
    }

    // Step 2c: If still failed, search by query
    if (!data || data.Response !== "True") {
      let searchUrl = `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&s=${encodeURIComponent(cleanTitle)}`;
      if (cleanYear) searchUrl += `&y=${cleanYear}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData && searchData.Search && searchData.Search.length > 0) {
        // Fetch details of first match
        const firstMatchId = searchData.Search[0].imdbID;
        const detailsRes = await fetch(
          `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&i=${firstMatchId}`,
        );
        data = await detailsRes.json();
      }
    }

    // Step 2d: Fallback to WhatsOn API if OMDb didn't find it
    if (!data || data.Response !== "True") {
      const whatsonData = await fetchWhatsOn({ title: cleanTitle });
      if (whatsonData && whatsonData.results && whatsonData.results.length > 0) {
        // Find best match with year
        const match =
          whatsonData.results.find((item) =>
            cleanYear ? item.release_date?.startsWith(cleanYear) : true,
          ) || whatsonData.results[0];

        const imdbIdStr = match.imdb?.id
          ? String(match.imdb.id).startsWith("tt")
            ? String(match.imdb.id)
            : `tt${match.imdb.id}`
          : null;

        if (imdbIdStr) {
          const movie: Movie = {
            imdbID: imdbIdStr,
            Title: match.original_title || match.title || cleanTitle,
            Year: match.release_date ? match.release_date.split("-")[0] : cleanYear,
            Type: match.item_type === "tvshow" ? "series" : "movie",
            Poster: match.image || null,
            Runtime: match.runtime ? match.runtime * 60 : 0,
            Genres: [],
            WatchedAt: targetType === "seen" ? watchedOrAddedAt : undefined,
          };

          if (targetType === "watchlist") {
            (movie as WatchlistItem).addedAt = watchedOrAddedAt;
          }

          return {
            rawItem: item,
            movieData: movie,
            status: "success",
          };
        }
      }
    }

    // If OMDb found a match
    if (data && data.Response === "True" && data.imdbID) {
      const movie: Movie = {
        imdbID: data.imdbID,
        Title: data.Title || cleanTitle,
        Year: data.Year ? data.Year.split("–")[0].trim() : cleanYear,
        Type: data.Type === "series" ? "series" : "movie",
        Poster: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
        Runtime: data.Runtime ? fromMinStringToSecond(data.Runtime) : 0,
        Genres: data.Genre && data.Genre !== "N/A" ? data.Genre.split(", ") : [],
        WatchedAt: targetType === "seen" ? watchedOrAddedAt : undefined,
      };

      if (targetType === "watchlist") {
        (movie as WatchlistItem).addedAt = watchedOrAddedAt;
      }

      return {
        rawItem: item,
        movieData: movie,
        status: "success",
      };
    }

    // Not found in any API
    return {
      rawItem: item,
      movieData: null,
      status: "not_found",
      errorReason: `No matching title found on IMDb/OMDb for "${cleanTitle}" (${cleanYear || "N/A"})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    return {
      rawItem: item,
      movieData: null,
      status: "not_found",
      errorReason: errorMsg,
    };
  }
}
