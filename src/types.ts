export interface Movie {
  Poster: string;
  Title: string;
  Type: string;
  Year: string;
  imdbID: string;
}

export interface Rating {
  Source: string;
  Value: string;
}

export interface MovieDetails extends Movie {
  Actors: string;
  Awards: string;
  BoxOffice: string;
  Country: string;
  Director: string;
  Error?: string;
  Genre: string;
  Language: string;
  Metascore: string;
  Plot: string;
  Production: string;
  Rated: string;
  Ratings: Rating[];
  Released: string;
  Response: string;
  Runtime: string;
  Website: string;
  Writer: string;
  imdbRating: string;
  imdbVotes: string;
}

export interface OmdbErrorResponse {
  Response: "False";
  Error: string;
}

export interface OmdbSearchResponse {
  Response: "True" | "False";
  Error?: string;
  Search?: Movie[];
  totalResults?: string;
}

export type MovieType = 'movie' | 'series' | 'game' | '';
