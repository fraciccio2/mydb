import { useState, useRef, useCallback, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import type {
  WhatsOnSearchResponse,
  MovieType,
  Movie,
  OmdbSearchResponse,
} from "../types";
import MovieCard from "../components/MovieCard";
import * as React from "react";

function Search() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MovieType>("");
  const [genres, setGenres] = useState("");

  // State for movies and pagination
  const [movies, setMovies] = useState<Movie[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isDiscovery, setIsDiscovery] = useState(true);
  const [source, setSource] = useState<"whatson" | "omdb">("whatson");

  const observer = useRef<IntersectionObserver | null>(null);

  const fetchMovies = useCallback(
    async (pageNum: number, isNewSearch: boolean, searchTitle?: string) => {
      if (isNewSearch) {
        setLoading(true);
        setMovies([]);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      setError("");

      try {
        const apiKeyWhatsON = "d0b8b76f-d505-4d36-82ea-e8f968a2dbd1";
        const apiKeyOMDB = "704c9e59";

        const currentTitle = searchTitle !== undefined ? searchTitle : title;
        let currentSource = isNewSearch ? "whatson" : source;

        if (isNewSearch) {
          setSource("whatson");
        }

        // --- Step 1: Try WhatsON if it's the current source ---
        if (currentSource === "whatson") {
          const currentType = type === "series" ? "tvshow" : type;

          let url = `https://whatson-api.onrender.com/?page=${pageNum}&api_key=${apiKeyWhatsON}`;
          if (currentTitle) url += `&title=${encodeURIComponent(currentTitle)}`;
          if (currentType) url += `&item_type=${currentType}`;
          if (genres) url += `&genres=${encodeURIComponent(genres)}`;

          const response = await fetch(url);
          const data: WhatsOnSearchResponse = await response.json();

          if (data.results && data.results.length > 0) {
            const mappedMovies: Movie[] = data.results.map((item) => ({
              Poster: item.image,
              Title:
                item.original_title.toLowerCase() === item.title.toLowerCase()
                  ? item.original_title
                  : item.original_title + " - (" + item.title + ")",
              Type: item.item_type === "tvshow" ? "series" : item.item_type,
              Year: item.release_date ? item.release_date.split("-")[0] : "N/A",
              imdbID: item.imdb?.id.toString() || "",
              Runtime: 0,
            }));

            if (isNewSearch) {
              setMovies(mappedMovies);
              setTotalResults(data.total_results);
            } else {
              setMovies((prev) => [...prev, ...mappedMovies]);
            }
            setPage(pageNum);
            return; // Exit if results found
          } else if (isNewSearch && currentTitle) {
            // If new search returns no results and we have a title, fallback to OMDb
            currentSource = "omdb";
            setSource("omdb");
          } else {
            // No results and no fallback criteria met
            if (isNewSearch) {
              setError("No results found");
              setTotalResults(0);
            }
            return;
          }
        }

        // --- Step 2: Try OMDb if source is omdb ---
        if (currentSource === "omdb") {
          let omdbUrl = `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&s=${encodeURIComponent(currentTitle)}&page=${pageNum}`;
          if (type) omdbUrl += `&type=${type}`;

          const response = await fetch(omdbUrl);
          const data: OmdbSearchResponse = await response.json();

          if (data.Response === "True" && data.Search) {
            if (isNewSearch) {
              setMovies(data.Search);
              setTotalResults(parseInt(data.totalResults || "0", 10));
            } else {
              setMovies((prev) => [...prev, ...(data.Search ?? [])]);
            }
            setPage(pageNum);
          } else {
            if (isNewSearch) {
              setError("No results found");
              setTotalResults(0);
            }
          }
        }
      } catch (err) {
        setError("There was an error searching. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [title, type, genres, source],
  );

  // Discovery search on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMovies(1, true, "").catch((e) => console.error(e));
  }, []);

  const lastMovieElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        const firstEntry = entries[0];
        if (
          firstEntry &&
          firstEntry.isIntersecting &&
          movies.length < totalResults
        ) {
          fetchMovies(page + 1, false).catch((e) => console.error(e));
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, movies.length, totalResults, page, fetchMovies],
  );

  const handleReset = () => {
    setTitle("");
    setType("");
    setGenres("");
    setIsDiscovery(true);
    fetchMovies(1, true, "").catch((e) => console.error(e));
  };

  const handleSearch = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDiscovery(false);
    fetchMovies(1, true).catch((e) => console.error(e));
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 pb-20">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Explore
        </h2>
        <p className="text-zinc-400">Find your next favorite titles</p>
      </header>

      <form
        onSubmit={handleSearch}
        className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 shadow-2xl mb-16 relative overflow-hidden"
      >
        {/* Subtle red accent line at the top of the form */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600/50" />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2.5 ml-1">
              Title Film / Series
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Search on MYDB..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3.5 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all placeholder:text-zinc-500 focus:bg-zinc-700/50"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2.5 ml-1">
              Category
            </label>
            <div className="relative group">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MovieType)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3.5 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all appearance-none cursor-pointer focus:bg-zinc-700/50 [&>option]:bg-zinc-800"
              >
                <option value="">Any</option>
                <option value="movie">Film</option>
                <option value="series">TV series</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-red-600 transition-colors">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2.5 ml-1">
              Genre
            </label>
            <div className="relative group">
              <select
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-4 py-3.5 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all appearance-none cursor-pointer focus:bg-zinc-700/50 [&>option]:bg-zinc-800"
              >
                <option value="">All Genres</option>
                <option value="Action">Action</option>
                <option value="Adventure">Adventure</option>
                <option value="Animation">Animation</option>
                <option value="Comedy">Comedy</option>
                <option value="Crime">Crime</option>
                <option value="Documentary">Documentary</option>
                <option value="Drama">Drama</option>
                <option value="Family">Family</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Horror">Horror</option>
                <option value="Mystery">Mystery</option>
                <option value="Romance">Romance</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Thriller">Thriller</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-red-600 transition-colors">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="md:col-span-6 flex flex-col sm:flex-row justify-end gap-4 mt-4 pt-6 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleReset}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold py-3 px-8 rounded-md transition-all active:scale-95 border border-zinc-700"
            >
              CLEAR FILTERS
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-w-50 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-3 px-10 rounded-md transition-all shadow-xl hover:shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  RESEARCH...
                </>
              ) : (
                "START SEARCH"
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="bg-red-950/40 border border-red-900 text-red-200 p-4 rounded-md mb-12 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {movies.length > 0 && (
        <div className="space-y-10">
          <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {isDiscovery ? "Current headlines" : "Search results"}
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                {totalResults} titles found
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-12">
            {movies.map((movie, index) => {
              if (movies.length === index + 1) {
                return (
                  <div
                    ref={lastMovieElementRef}
                    key={`${movie.imdbID}-${index}`}
                  >
                    <MovieCard movie={movie} />
                  </div>
                );
              } else {
                return (
                  <MovieCard key={`${movie.imdbID}-${index}`} movie={movie} />
                );
              }
            })}
          </div>

          {loadingMore && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce"></div>
              </div>
              <p className="text-red-600 font-bold text-xs uppercase tracking-widest animate-pulse">
                Loading titles...
              </p>
            </div>
          )}

          {!loadingMore &&
            movies.length >= totalResults &&
            totalResults > 0 && (
              <div className="text-center py-16 text-zinc-600 text-sm font-medium border-t border-zinc-900 mt-8">
                END OF RESULTS
              </div>
            )}
        </div>
      )}

      {movies.length === 0 && !loading && !error && (
        <div className="text-center py-32 bg-zinc-900/20 border border-zinc-800 rounded-lg">
          <div className="flex justify-center mb-6">
            <MagnifyingGlassIcon className="w-16 h-16 text-zinc-800" />
          </div>
          <p className="text-zinc-500 font-medium tracking-widest uppercase text-sm">
            Find a title to get started
          </p>
        </div>
      )}
    </div>
  );
}

export default Search;
