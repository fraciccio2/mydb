import type { WatchlistItem } from "../types";

export interface WatchlistState {
  activeTab: "movies" | "series";
  searchQuery: string;
  selectedGenre: string;
  sortConfig: {
    field: string;
    direction: "asc" | "desc";
  };
  items: WatchlistItem[];
  displayCount: number;
  scrollY: number;
  hasCachedData: boolean;
}

const initialState: WatchlistState = {
  activeTab: "movies",
  searchQuery: "",
  selectedGenre: "",
  sortConfig: {
    field: "addedAt",
    direction: "desc",
  },
  items: [],
  displayCount: 24,
  scrollY: 0,
  hasCachedData: false,
};

let currentState: WatchlistState = { ...initialState };
const listeners = new Set<() => void>();

export const watchlistStore = {
  getState() {
    return currentState;
  },
  setState(nextState: Partial<WatchlistState>) {
    currentState = { ...currentState, ...nextState };
    listeners.forEach((listener) => listener());
  },
  reset() {
    currentState = { ...initialState };
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
