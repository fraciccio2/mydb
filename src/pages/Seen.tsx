import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import MovieCard from "../components/MovieCard";
import type { Movie } from "../types";
import {
  ArrowsUpDownIcon,
  ClockIcon,
  FilmIcon,
  FunnelIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import { seenStore } from "../store/seenStore";

function Seen() {
  const {
    activeTab,
    searchQuery,
    selectedGenre,
    sortConfig,
    allMovies,
    displayCount,
    hasCachedData,
  } = useSyncExternalStore(seenStore.subscribe, seenStore.getState);

  const setActiveTab = (val: "movies" | "series") => seenStore.setState({ activeTab: val });
  const setSearchQuery = (val: string) => seenStore.setState({ searchQuery: val });
  const setSelectedGenre = (val: string) => seenStore.setState({ selectedGenre: val });
  const setSortConfig = (val: { field: string; direction: "asc" | "desc" }) => seenStore.setState({ sortConfig: val });
  const setAllMovies = (val: Movie[]) => seenStore.setState({ allMovies: val, hasCachedData: true });
  const setDisplayCount = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      seenStore.setState({ displayCount: val(seenStore.getState().displayCount) });
    } else {
      seenStore.setState({ displayCount: val });
    }
  };

  const [loading, setLoading] = useState(!hasCachedData);

  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch all movies from Firestore
  useEffect(() => {
    const q = query(
      collection(db, "movies"),
      orderBy(sortConfig.field, sortConfig.direction),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const moviesList = snapshot.docs.map((doc) => ({
          ...(doc.data() as Movie),
          imdbID: doc.id,
          Year: doc.data().Year ? doc.data().Year.split("-")[0] : "N/A",
        }));
        setAllMovies(moviesList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching movies:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [sortConfig]);

  // Save scroll position when unmounting
  useEffect(() => {
    return () => {
      seenStore.setState({ scrollY: window.scrollY });
    };
  }, []);

  // Statistics Calculation (Client-side)
  const movieStats = useMemo(() => {
    const totalCount = allMovies.length;
    const totalSeconds = allMovies.reduce(
      (acc, m) => acc + (Number(m.Runtime) || 0),
      0,
    );

    return {
      totalCount,
      months: Math.floor(totalSeconds / 2592000),
      days: Math.floor((totalSeconds % 2592000) / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
    };
  }, [allMovies]);

  const seriesStats = { totalEpisodes: 0, months: 0, days: 0, hours: 0 };

  // Filter movies (Client-side)
  const filteredMovies = useMemo(() => {
    return allMovies.filter((movie) => {
      const matchesSearch = movie.Title.toLowerCase().includes(
        searchQuery.toLowerCase(),
      );
      const matchesGenre =
        selectedGenre === "" ||
        (movie.Genres && movie.Genres.includes(selectedGenre));
      return matchesSearch && matchesGenre;
    });
  }, [allMovies, searchQuery, selectedGenre]);

  // Infinite Scroll logic (Client-side)
  const visibleMovies = useMemo(() => {
    return filteredMovies.slice(0, displayCount);
  }, [filteredMovies, displayCount]);

  // Restore scroll position when cached/loaded movies are rendered
  useEffect(() => {
    const cachedState = seenStore.getState();
    if (cachedState.hasCachedData && cachedState.scrollY > 0 && visibleMovies.length > 0) {
      const timer = setTimeout(() => {
        window.scrollTo(0, cachedState.scrollY);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visibleMovies]);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayCount < filteredMovies.length) {
          setDisplayCount((prev) => prev + 24); // Increased step for better experience
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, displayCount, filteredMovies.length],
  );

  const genres = useMemo(() => {
    const allGenres = allMovies.flatMap((m) => m.Genres || []);
    return Array.from(new Set(allGenres)).sort();
  }, [allMovies]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 pb-24">
      <header className="mb-12">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">
          My <span className="text-red-600">History</span>
        </h2>
        <p className="text-zinc-500 font-medium">
          Tracking your cinematic journey
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TvIcon className="w-16 h-16 text-red-600" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            TV Series Time
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white">
              {seriesStats.months}
            </span>
            <span className="text-zinc-500 text-xs mb-1 font-bold uppercase">
              Months
            </span>
            <span className="text-3xl font-black text-white ml-2">
              {seriesStats.days}
            </span>
            <span className="text-zinc-500 text-xs mb-1 font-bold uppercase">
              Days
            </span>
            <span className="text-3xl font-black text-white ml-2">
              {seriesStats.hours}
            </span>
            <span className="text-zinc-500 text-xs mb-1 font-bold uppercase">
              Hours
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <HashtagIcon className="w-16 h-16 text-red-600" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            Episodes Watched
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              {seriesStats.totalEpisodes}
            </span>
            <span className="text-red-600 font-black text-xs uppercase tracking-widest">
              Total
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <FilmIcon className="w-16 h-16 text-red-600" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            Movies Time
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white">
              {movieStats.months}
            </span>
            <span className="text-zinc-500 text-xs mb-1 font-bold uppercase">
              Months
            </span>
            <span className="text-3xl font-black text-white ml-2">
              {movieStats.days}
            </span>
            <span className="text-zinc-500 text-xs mb-1 font-bold uppercase">
              Days
            </span>
            <span className="text-3xl font-black text-white ml-2">
              {movieStats.hours}
            </span>
            <span className="text-zinc-500 text-xs mb-1 font-bold uppercase">
              Hours
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ClockIcon className="w-16 h-16 text-red-600" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            Movies Watched
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              {movieStats.totalCount}
            </span>
            <span className="text-red-600 font-black text-xs uppercase tracking-widest">
              Total
            </span>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 mb-12 border-b border-zinc-800 pb-8">
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab("movies")}
            className={`px-8 py-2.5 rounded-md text-sm font-black transition-all ${
              activeTab === "movies"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            MOVIES
          </button>
          <button
            onClick={() => setActiveTab("series")}
            className={`px-8 py-2.5 rounded-md text-sm font-black transition-all ${
              activeTab === "series"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            TV SERIES
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative group min-w-75">
            <input
              type="text"
              placeholder="Search in history..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayCount(24);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all focus:border-transparent text-white"
            />
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors" />
          </div>

          <div className="relative min-w-50">
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setDisplayCount(24);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all focus:border-transparent text-white appearance-none cursor-pointer"
            >
              <option value="">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
            <FunnelIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          </div>

          <div className="relative min-w-50">
            <select
              value={`${sortConfig.field}-${sortConfig.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split("-");
                setSortConfig({
                  field,
                  direction: direction as "asc" | "desc",
                });
                setDisplayCount(24);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all focus:border-transparent text-white appearance-none cursor-pointer"
            >
              <option value="WatchedAt-desc">Recently Watched</option>
              <option value="WatchedAt-asc">Oldest Watched</option>
              <option value="Title-asc">Title: A-Z</option>
              <option value="Title-desc">Title: Z-A</option>
            </select>
            <ArrowsUpDownIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
          </div>
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest animate-pulse">
            Loading history...
          </p>
        </div>
      ) : activeTab === "movies" ? (
        <>
          {visibleMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-12">
              {visibleMovies.map((movie, index) => (
                <div
                  key={movie.imdbID}
                  ref={
                    index === visibleMovies.length - 1 ? lastElementRef : null
                  }
                >
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-zinc-900/20 border border-zinc-800 rounded-lg">
              <div className="flex justify-center mb-6">
                <MagnifyingGlassIcon className="w-16 h-16 text-zinc-800" />
              </div>
              <p className="text-zinc-500 font-medium tracking-widest uppercase text-sm">
                No titles found matching your criteria
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-32 bg-zinc-900/20 border border-zinc-800 rounded-lg">
          <div className="flex justify-center mb-6 opacity-20">
            <TvIcon className="w-16 h-16 text-white" />
          </div>
          <p className="text-zinc-500 font-medium tracking-widest uppercase text-sm">
            No TV Series found
          </p>
        </div>
      )}
    </div>
  );
}

export default Seen;
