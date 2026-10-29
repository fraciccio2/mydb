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
  TvIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import type {
  MovieType,
  Movie,
  OmdbSearchResponse,
} from "../types";
import MovieCard from "../components/MovieCard";
import { searchStore } from "../store/searchStore";
import { config } from "../config";
import { fetchWhatsOn } from "../services/whatson";

function Search() {
  const {
    title,
    type,
    genres,
    platform,
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
  const setPlatform = (val: string) => searchStore.setState({ platform: val });
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
  const [isScrolledPastForm, setIsScrolledPastForm] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver to detect when the search form is scrolled out of view
  useEffect(() => {
    const target = formRef.current;
    if (!target) return;

    const formObserver = new IntersectionObserver(
      ([entry]) => {
        setIsScrolledPastForm(!entry.isIntersecting && entry.boundingClientRect.top < 80);
      },
      {
        threshold: 0,
        rootMargin: "-80px 0px 0px 0px", // 80px accounts for 64px header + 16px top margin
      },
    );

    formObserver.observe(target);
    return () => formObserver.disconnect();
  }, []);

  const fetchMovies = useCallback(
    async (
      pageNum: number,
      isNewSearch: boolean,
      searchTitle?: string,
      overrideFilters?: { type?: MovieType; genres?: string; platform?: string },
    ) => {
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
        const currentTypeRaw =
          overrideFilters?.type !== undefined ? overrideFilters.type : type;
        const currentGenres =
          overrideFilters?.genres !== undefined ? overrideFilters.genres : genres;
        const currentPlatform =
          overrideFilters?.platform !== undefined
            ? overrideFilters.platform
            : platform;

        let currentSource = isNewSearch ? "whatson" : source;

        if (isNewSearch) {
          setSource("whatson");
        }

        // --- Step 1: Try WhatsON if it's the current source ---
        if (currentSource === "whatson") {
          const currentType =
            currentTypeRaw === "series"
              ? "tvshow"
              : currentTypeRaw === "movie"
                ? "movie"
                : undefined;

          const data = await fetchWhatsOn({
            page: pageNum,
            itemType: currentType,
            genres: currentGenres || undefined,
            platforms: currentPlatform || undefined,
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
          } else if (isNewSearch && currentTitle && !currentPlatform) {
            // Fallback to OMDb if no WhatsOn results and we have a title query (and no platform filter)
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
          if (currentTypeRaw) omdbUrl += `&type=${currentTypeRaw}`;

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
    [title, type, genres, platform, source],
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
    setPlatform("");
    setMovies([]);
    setTotalResults(0);
    setError("");
    setPage(1);
    setHasSearched(false);
    searchStore.setState({
      title: "",
      type: "",
      genres: "",
      platform: "",
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
    if (!title.trim() && !type && !genres && !platform) return;
    fetchMovies(1, true).catch((e) => console.error(e));
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = formRef.current.querySelector("input");
      if (input) {
        setTimeout(() => input.focus(), 350);
      }
    }
  };

  const handleRemoveFilter = (
    filterKey: "title" | "type" | "genres" | "platform",
  ) => {
    let nextTitle = title;
    let nextType = type;
    let nextGenres = genres;
    let nextPlatform = platform;

    if (filterKey === "title") {
      nextTitle = "";
      setTitle("");
    } else if (filterKey === "type") {
      nextType = "";
      setType("");
    } else if (filterKey === "genres") {
      nextGenres = "";
      setGenres("");
    } else if (filterKey === "platform") {
      nextPlatform = "";
      setPlatform("");
    }

    if (nextTitle.trim() || nextType || nextGenres || nextPlatform) {
      searchStore.setState({
        title: nextTitle,
        type: nextType,
        genres: nextGenres,
        platform: nextPlatform,
      });
      fetchMovies(1, true, nextTitle, {
        type: nextType,
        genres: nextGenres,
        platform: nextPlatform,
      }).catch((e) => console.error(e));
    } else {
      handleReset();
    }
  };

  const hasActiveFilters = Boolean(
    title.trim() || type || genres || platform,
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 pb-24">
      {/* Search Header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
          Search <span className="text-red-600">Titles</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Find movies and TV series by title, or filter by category, genre, and streaming platform
        </p>
      </header>

      {/* Filter Form */}
      <form
        ref={formRef}
        onSubmit={handleSearch}
        className="bg-zinc-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-zinc-800 shadow-2xl mb-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Title Input */}
          <div className="sm:col-span-2 lg:col-span-4">
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
          <div className="sm:col-span-1 lg:col-span-2">
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
          <div className="sm:col-span-1 lg:col-span-3">
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

          {/* Streaming Platform Select */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              Streaming Platform
            </label>
            <div className="relative group">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-red-600 outline-none text-white transition-all appearance-none cursor-pointer text-sm focus:border-transparent [&>option]:bg-zinc-900"
              >
                <option value="">All Platforms</option>
                <option value="Netflix">Netflix</option>
                <option value="Prime Video">Prime Video</option>
                <option value="Disney+">Disney+</option>
                <option value="Paramount+">Paramount+</option>
                <option value="Apple TV">Apple TV</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <ChevronDownIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sm:col-span-2 lg:col-span-12 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-zinc-800/80">
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

      {/* Compact Sticky Chips Bar: visible when scrolled past form with active filters */}
      {isScrolledPastForm && hasActiveFilters && (
        <div className="sticky top-20 z-40 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl py-2 px-3 sm:px-4 shadow-2xl mb-8 transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            {/* Active Filter Chips Scrollable Track */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500 shrink-0 hidden sm:inline mr-1">
                Active:
              </span>

              {/* Title Chip */}
              {title && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-950 border border-zinc-800 text-white shrink-0">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-red-500" />
                  <span className="max-w-32 sm:max-w-44 truncate font-medium">"{title}"</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFilter("title")}
                    aria-label="Remove title filter"
                    className="text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {/* Category Chip */}
              {type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-950 border border-zinc-800 text-white shrink-0">
                  {type === "series" ? (
                    <TvIcon className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <FilmIcon className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span>{type === "series" ? "TV Series" : "Movies"}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFilter("type")}
                    aria-label="Remove category filter"
                    className="text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {/* Genre Chip */}
              {genres && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-950 border border-zinc-800 text-white shrink-0">
                  <span className="text-red-500 font-black">#</span>
                  <span>{genres}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFilter("genres")}
                    aria-label="Remove genre filter"
                    className="text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {/* Platform Chip */}
              {platform && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/10 border border-red-500/30 text-red-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span>{platform}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFilter("platform")}
                    aria-label="Remove platform filter"
                    className="text-red-400 hover:text-white p-0.5 rounded-full hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {/* Results count in sticky bar */}
              {totalResults > 0 && (
                <span className="text-[11px] font-bold text-zinc-500 shrink-0 pl-1">
                  ({totalResults} {totalResults === 1 ? "result" : "results"})
                </span>
              )}
            </div>

            {/* Actions on the right */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
              >
                <AdjustmentsHorizontalIcon className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">Edit Filters</span>
                <span className="sm:hidden">Edit</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/20 text-xs font-semibold transition-all cursor-pointer"
                title="Reset all filters"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

          {!loadingMore && movies.length >= totalResults && totalResults > 0 && (
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
          <h2 className="text-lg font-bold text-white mb-2">Start Your Search</h2>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed">
            Type a title above or select a category, genre, and streaming platform to explore the catalog.
          </p>
        </div>
      )}

      {/* Empty State: Searched but 0 results */}
      {movies.length === 0 && !loading && !error && hasSearched && (
        <div className="text-center py-20 bg-zinc-900/20 border border-zinc-800/60 rounded-2xl max-w-xl mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <FilmIcon className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">No titles found</h2>
          <p className="text-zinc-500 text-xs">
            Try adjusting your filters or checking the spelling of the title.
          </p>
        </div>
      )}
    </div>
  );
}

export default Search;
