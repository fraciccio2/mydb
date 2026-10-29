import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  FilmIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { MovieType, Movie, OmdbSearchResponse } from "../types";
import MovieCard from "../components/MovieCard";
import { searchStore } from "../store/searchStore";
import { config } from "../config";
import { fetchWhatsOn } from "../services/whatson";

function Search() {
  const {
    title,
    type,
    genres,
    movies,
    totalResults,
    page,
    source,
    error,
    hasCachedData,
  } = useSyncExternalStore(searchStore.subscribe, searchStore.getState);

  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q");

  const setTitle = (val: string) => searchStore.setState({ title: val });
  const setType = (val: MovieType) => searchStore.setState({ type: val });
  const setGenres = (val: string) => searchStore.setState({ genres: val });
  const setMovies = (val: Movie[] | ((prev: Movie[]) => Movie[])) => {
    if (typeof val === "function") {
      searchStore.setState({ movies: val(searchStore.getState().movies) });
    } else {
      searchStore.setState({ movies: val });
    }
  };
  const setTotalResults = (val: number) =>
    searchStore.setState({ totalResults: val });
  const setPage = (val: number) => searchStore.setState({ page: val });
  const setSource = (val: "whatson" | "omdb") =>
    searchStore.setState({ source: val });
  const setError = (val: string) => searchStore.setState({ error: val });

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(
    Boolean(hasCachedData && movies.length > 0),
  );

  const observer = useRef<IntersectionObserver | null>(null);

  const fetchMovies = useCallback(
    async (pageNum: number, isNewSearch: boolean, searchTitle?: string) => {
      if (isNewSearch) {
        setLoading(true);
        setMovies([]);
        setPage(1);
        setHasSearched(true);
      } else {
        setLoadingMore(true);
      }

      setError("");

      try {
        const apiKeyOMDB = config.omdbApiKey;
        const currentTitle = searchTitle !== undefined ? searchTitle : title;
        let currentSource = isNewSearch ? "whatson" : source;

        if (isNewSearch) {
          setSource("whatson");
        }

        // --- Step 1: Try WhatsON if it's the current source ---
        if (currentSource === "whatson") {
          const currentType =
            type === "series"
              ? "tvshow"
              : type === "movie"
                ? "movie"
                : undefined;

          const data = await fetchWhatsOn({
            page: pageNum,
            itemType: currentType,
            genres: genres || undefined,
            title: currentTitle || undefined,
          });

          if (data.results && data.results.length > 0) {
            const mappedMovies: Movie[] = data.results.map((item) => ({
              Poster: item.image,
              Title:
                item.original_title?.toLowerCase() === item.title?.toLowerCase()
                  ? item.original_title
                  : item.original_title + " - (" + item.title + ")",
              Type: item.item_type === "tvshow" ? "series" : item.item_type,
              Year: item.release_date ? item.release_date.split("-")[0] : "N/A",
              imdbID: item.imdb?.id
                ? String(item.imdb.id).startsWith("tt")
                  ? String(item.imdb.id)
                  : `tt${item.imdb.id}`
                : "",
              Runtime: item.runtime || 0,
            }));

            if (isNewSearch) {
              setMovies(mappedMovies);
              setTotalResults(data.total_results);
            } else {
              setMovies((prev) => [...prev, ...mappedMovies]);
            }
            setPage(pageNum);
            return;
          } else if (isNewSearch && currentTitle) {
            // Fallback to OMDb if no WhatsOn results and we have a title query
            currentSource = "omdb";
            setSource("omdb");
          } else {
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
              setError(data.Error || "No results found");
              setTotalResults(0);
            }
          }
        }
      } catch (err) {
        console.error("Search error:", err);
        setError("An error occurred while fetching movies. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        searchStore.setState({ hasCachedData: true });
      }
    },
    [title, type, genres, source],
  );

  // If a URL query exists, execute the search immediately
  useEffect(() => {
    if (urlQuery) {
      setTitle(urlQuery);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMovies(1, true, urlQuery).catch((e) => console.error(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // Save scroll position when unmounting
  useEffect(() => {
    return () => {
      searchStore.setState({ scrollY: window.scrollY });
    };
  }, []);

  // Restore scroll position when cached movies are rendered
  useEffect(() => {
    const cachedState = searchStore.getState();
    if (
      cachedState.hasCachedData &&
      cachedState.scrollY > 0 &&
      movies.length > 0
    ) {
      const timer = setTimeout(() => {
        window.scrollTo(0, cachedState.scrollY);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [movies]);

  // Infinite scroll observer
  const lastMovieElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && movies.length < totalResults) {
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
    setMovies([]);
    setTotalResults(0);
    setError("");
    setPage(1);
    setHasSearched(false);
    searchStore.setState({
      title: "",
      type: "",
      genres: "",
      movies: [],
      totalResults: 0,
      page: 1,
      error: "",
      hasCachedData: false,
      scrollY: 0,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !type && !genres) return;
    fetchMovies(1, true).catch((e) => console.error(e));
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 pb-24">
      {/* Search Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
          Search <span className="text-red-600">Titles</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Find movies and TV series by title or filter by category and genre
        </p>
      </header>

      {/* Filter Form */}
      <form
        onSubmit={handleSearch}
        className="bg-zinc-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-zinc-800 shadow-2xl mb-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {/* Title Input */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              Movie / TV Series Title
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Type a title (e.g. Interstellar, The Office...)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pl-11 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all placeholder:text-zinc-600 text-sm focus:border-transparent"
              />
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              {title && (
                <button
                  type="button"
                  onClick={() => setTitle("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Select */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              Category
            </label>
            <div className="relative group">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MovieType)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all appearance-none cursor-pointer text-sm focus:border-transparent [&>option]:bg-zinc-900"
              >
                <option value="">All</option>
                <option value="movie">Movies</option>
                <option value="series">TV Series</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Genre Select */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              Genre
            </label>
            <div className="relative group">
              <select
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all appearance-none cursor-pointer text-sm focus:border-transparent [&>option]:bg-zinc-900"
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
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-6 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-zinc-700/60 cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  <span>Search Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error display */}
      {error && (
        <div className="bg-red-950/40 border border-red-900/80 text-red-300 p-4 rounded-xl mb-10 text-sm flex items-center gap-3">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Active Search Results */}
      {movies.length > 0 && (
        <div className="space-y-8">
          <div className="flex justify-between items-baseline border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Search Results
              </h2>
              <p className="text-zinc-500 text-xs font-semibold mt-1">
                {totalResults} titles found
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
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
              }
              return (
                <MovieCard key={`${movie.imdbID}-${index}`} movie={movie} />
              );
            })}
          </div>

          {loadingMore && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
              </div>
              <p className="text-red-500 font-bold text-xs uppercase tracking-widest animate-pulse">
                Loading more results...
              </p>
            </div>
          )}

          {!loadingMore &&
            movies.length >= totalResults &&
            totalResults > 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs font-bold uppercase tracking-widest border-t border-zinc-900 mt-8">
                End of results
              </div>
            )}
        </div>
      )}

      {/* Empty State: Not searched yet */}
      {movies.length === 0 && !loading && !error && !hasSearched && (
        <div className="text-center py-24 sm:py-32 bg-zinc-900/20 border border-zinc-800/60 rounded-2xl max-w-xl mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mx-auto mb-5 text-red-500">
            <MagnifyingGlassIcon className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            Start Your Search
          </h2>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed">
            Type a title above or select a category and genre to explore the
            catalog.
          </p>
        </div>
      )}

      {/* Empty State: Searched but 0 results */}
      {movies.length === 0 && !loading && !error && hasSearched && (
        <div className="text-center py-20 bg-zinc-900/20 border border-zinc-800/60 rounded-2xl max-w-xl mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <FilmIcon className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">
            No titles found
          </h2>
          <p className="text-zinc-500 text-xs">
            Try adjusting your filters or checking the spelling of the title.
          </p>
        </div>
      )}
    </div>
  );
}

export default Search;
