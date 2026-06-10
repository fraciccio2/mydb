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

export interface WhatsOnPlatformLink {
  name: string;
  url: string;
}

export interface WhatsOnItem {
  id: number;
  _id: string;
  title: string;
  original_title: string;
  item_type: 'movie' | 'tvshow';
  image: string;
  release_date: string;
  runtime: number;
  popularity_average: number;
  ratings_average: number;
  status?: string;
  seasons_number?: number;
  episodes_stats?: {
    highest_rated?: {
      title: string;
      rating: number;
      season_number: number;
      episode_number: number;
    };
    lowest_rated?: {
      title: string;
      rating: number;
      season_number: number;
      episode_number: number;
    };
  };
  imdb?: { id: string; score: number; votes: number };
  tmdb: { id: number; score: number; votes: number };
  rotten_tomatoes?: { score: number; votes: number };
  metacritic?: { score: number; votes: number };
  allocine?: { score: number; votes: number };
  letterboxd?: { score: number; votes: number };
  senscritique?: { score: number; votes: number };
  platforms_links?: WhatsOnPlatformLink[];
}

export interface WhatsOnSearchResponse {
  page: number;
  results: WhatsOnItem[];
  total_pages: number;
  total_results: number;
}

// Hybrid Type for Details Page
export interface HybridMovieDetails extends MovieDetails {
  whatson?: WhatsOnItem;
}
