export interface Movie {
  Poster: string;
  Title: string;
  Type: string;
  Year: string;
  imdbID: string;
}

export interface OmdbSearchResponse {
  Error?: string;
  Response: "True" | "False";
  Search?: Movie[];
  totalResults?: string;
}

export type MovieType = 'movie' | 'series' | 'game' | '';
