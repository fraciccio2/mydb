import type { Movie, WhatsOnItem } from "../types";
import { fetchWhatsOn } from "../services/whatson";

export type RowFetchStatus = "idle" | "loading" | "success" | "error";

export interface GenreRowData {
  items: Movie[];
  page: number;
  hasMore: boolean;
  status: RowFetchStatus;
  error?: string | null;
}

export interface HomeState {
  activeTab: "movies" | "series";
  rows: Record<string, GenreRowData>;
}

export interface RowFetchConfig {
  key: string;
  itemType: "movie" | "tvshow";
  genre?: string;
  isTrending?: boolean;
}

function mapWhatsOnToMovie(item: WhatsOnItem): Movie {
  return {
    Poster: item.image || "N/A",
    Title:
      item.original_title?.toLowerCase() === item.title?.toLowerCase()
        ? item.original_title
        : `${item.original_title} - (${item.title})`,
    Type: item.item_type === "tvshow" ? "series" : item.item_type,
    Year: item.release_date ? item.release_date.split("-")[0] : "N/A",
    imdbID: item.imdb?.id
      ? String(item.imdb.id).startsWith("tt")
        ? String(item.imdb.id)
        : `tt${item.imdb.id}`
      : "",
    Runtime: item.runtime ? Math.round(item.runtime / 60) : 0,
  };
}

const initialState: HomeState = {
  activeTab: "movies",
  rows: {},
};

let currentState: HomeState = { ...initialState };
const listeners = new Set<() => void>();
const inFlightRequests = new Set<string>();

export const homeStore = {
  getState() {
    return currentState;
  },
  setState(nextState: Partial<HomeState>) {
    currentState = { ...currentState, ...nextState };
    listeners.forEach((listener) => listener());
  },
  getRowData(key: string): GenreRowData {
    return (
      currentState.rows[key] || {
        items: [],
        page: 1,
        hasMore: true,
        status: "idle",
      }
    );
  },
  setRowData(key: string, data: Partial<GenreRowData>) {
    const existing = currentState.rows[key] || {
      items: [],
      page: 1,
      hasMore: true,
      status: "idle",
    };
    currentState = {
      ...currentState,
      rows: {
        ...currentState.rows,
        [key]: { ...existing, ...data },
      },
    };
    listeners.forEach((listener) => listener());
  },
  async fetchRowPage(config: RowFetchConfig, pageToFetch: number) {
    const reqKey = `${config.key}_p${pageToFetch}`;

    // 1. Guard against concurrent duplicate requests
    if (inFlightRequests.has(reqKey)) {
      return;
    }

    const currentRow = this.getRowData(config.key);

    // 2. If already loaded or already failed, don't re-fetch page 1
    if (
      pageToFetch === 1 &&
      (currentRow.status === "success" || currentRow.status === "loading")
    ) {
      return;
    }

    // 3. If paginating beyond page 1 and no more items or already at limit, abort
    if (pageToFetch > 1 && (!currentRow.hasMore || currentRow.page >= 3)) {
      return;
    }

    inFlightRequests.add(reqKey);
    this.setRowData(config.key, { status: "loading", error: null });

    try {
      const data = await fetchWhatsOn({
        page: pageToFetch,
        itemType: config.itemType,
        genres: config.genre,
      });

      const rawResults = data.results || [];
      const newItems = rawResults.map(mapWhatsOnToMovie);

      const existingItems = pageToFetch === 1 ? [] : currentRow.items;
      const combinedItems =
        pageToFetch === 1
          ? newItems
          : [
              ...existingItems,
              ...newItems.filter(
                (ni) => !existingItems.some((oi) => oi.imdbID === ni.imdbID),
              ),
            ];

      // Cap at ~60 items (3 pages of 20 items) or end of available results
      const hasMorePages = Boolean(
        pageToFetch < 3 &&
          data.page < data.total_pages &&
          newItems.length > 0 &&
          combinedItems.length < 60,
      );

      this.setRowData(config.key, {
        items: combinedItems,
        page: pageToFetch,
        hasMore: hasMorePages,
        status: "success",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load content";
      console.error(`Error loading row ${config.key}:`, err);
      // Crucial: Mark as error and hasMore = false so it NEVER enters an infinite retry loop
      this.setRowData(config.key, {
        status: "error",
        hasMore: false,
        error: message,
      });
    } finally {
      inFlightRequests.delete(reqKey);
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
