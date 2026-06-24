import type { Movie, MovieType } from "../types";

export interface SearchState {
  title: string;
  type: MovieType;
  genres: string;
  movies: Movie[];
  totalResults: number;
  page: number;
  isDiscovery: boolean;
  source: "whatson" | "omdb";
  error: string;
  scrollY: number;
  hasCachedData: boolean;
}

const initialState: SearchState = {
  title: "",
  type: "",
  genres: "",
  movies: [],
  totalResults: 0,
  page: 1,
  isDiscovery: true,
  source: "whatson",
  error: "",
  scrollY: 0,
  hasCachedData: false,
};

let currentState: SearchState = { ...initialState };
const listeners = new Set<() => void>();

export const searchStore = {
  getState() {
    return currentState;
  },
  setState(nextState: Partial<SearchState>) {
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
