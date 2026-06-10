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
  Error: string;
  Response: "False";
}

export interface OmdbSearchResponse {
  Search?: Movie[];
  totalResults?: string;
  Response: "True" | "False";
  Error?: string;
}

export type MovieType = "movie" | "series" | "game" | "";

export interface WhatsOnPlatformLink {
  link_url: string;
  name: string;
}

export interface WhatsOnItem {
  _id: string;
  allocine?: WhatsOnRating;
  episodes_details?: {
    description: string;
    episode: number;
    id: string;
    release_date: string;
    season: number;
    title: string;
    url: string;
    users_rating: number;
    users_rating_count: number;
  }[];
  id: number;
  image: string;
  imdb?: WhatsOnRating;
  item_type: "movie" | "tvshow";
  letterboxd?: WhatsOnRating;
  metacritic?: WhatsOnRating;
  original_title: string;
  platforms_links?: WhatsOnPlatformLink[];
  popularity_average: number;
  ratings_average: number;
  release_date: string;
  rotten_tomatoes?: {
    critics_certified: boolean;
    critics_rating: number;
    critics_rating_count: number;
    critics_rating_liked_count: number;
    critics_rating_not_liked_count: number;
    id: string;
    url: string;
    users_certified: boolean;
    users_rating: number;
    users_rating_count: number;
    users_rating_liked_count: number;
    users_rating_not_liked_count: number;
  };
  runtime: number;
  seasons_number?: number;
  senscritique?: WhatsOnRating;
  status?: "Ended" | "Canceled" | "Ongoing" | "Pilot" | "Unknown";
  title: string;
  tmdb: WhatsOnRating;
  trailer?: string;
}

export interface WhatsOnRating {
  id: number;
  url: string;
  users_rating: number;
  users_rating_count: number;
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
