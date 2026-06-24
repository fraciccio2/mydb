import type { Movie } from "../types";

export interface SeenState {
  activeTab: "movies" | "series";
  searchQuery: string;
  selectedGenre: string;
  sortConfig: {
    field: string;
    direction: "asc" | "desc";
  };
  allMovies: Movie[];
  displayCount: number;
  scrollY: number;
  hasCachedData: boolean;
}

const initialState: SeenState = {
  activeTab: "movies",
  searchQuery: "",
  selectedGenre: "",
  sortConfig: {
    field: "WatchedAt",
    direction: "desc",
  },
  allMovies: [],
  displayCount: 12,
  scrollY: 0,
  hasCachedData: false,
};

let currentState: SeenState = { ...initialState };
const listeners = new Set<() => void>();

export const seenStore = {
  getState() {
    return currentState;
  },
  setState(nextState: Partial<SeenState>) {
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
