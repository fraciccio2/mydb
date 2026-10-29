import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import MovieCard from "../components/MovieCard";
import type { WatchlistItem } from "../types";
import {
  ArrowsUpDownIcon,
  BookmarkIcon,
  ClockIcon,
  FilmIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import { watchlistStore } from "../store/watchlistStore";
import { useAuth } from "../context/useAuth";

function Watchlist() {
  const {
    activeTab,
    searchQuery,
    selectedGenre,
    sortConfig,
    items,
    displayCount,
    hasCachedData,
  } = useSyncExternalStore(watchlistStore.subscribe, watchlistStore.getState);

  const setActiveTab = (val: "movies" | "series") => {
    watchlistStore.setState({
      activeTab: val,
      selectedGenre: "",
      displayCount: 24,
    });
  };
  const setSearchQuery = (val: string) =>
    watchlistStore.setState({ searchQuery: val });
  const setSelectedGenre = (val: string) =>
    watchlistStore.setState({ selectedGenre: val });
  const setSortConfig = (val: {
    field: string;
    direction: "asc" | "desc";
  }) => watchlistStore.setState({ sortConfig: val });
  const setItems = (val: WatchlistItem[]) =>
    watchlistStore.setState({ items: val, hasCachedData: true });
  const setDisplayCount = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      watchlistStore.setState({
        displayCount: val(watchlistStore.getState().displayCount),
      });
    } else {
      watchlistStore.setState({ displayCount: val });
    }
  };

  const [loading, setLoading] = useState(!hasCachedData);
  const { user } = useAuth();
  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch watchlist from Firestore with realtime sync
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "watchlist"),
      orderBy(sortConfig.field, sortConfig.direction),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const watchlistItems = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as WatchlistItem),
          imdbID: docSnap.id,
          Year: docSnap.data().Year ? docSnap.data().Year.split("-")[0] : "N/A",
        }));
        setItems(watchlistItems);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching watchlist:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [sortConfig, user]);

  // Save scroll position when navigating away
  useEffect(() => {
    return () => {
      watchlistStore.setState({ scrollY: window.scrollY });
    };
  }, []);

  // Remove single item from Watchlist
  const handleRemoveFromWatchlist = async (imdbID: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "watchlist", imdbID));
    } catch (err) {
      console.error("Error removing item from watchlist:", err);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalCount = items.length;
    const moviesCount = items.filter((i) => i.Type === "movie").length;
    const seriesCount = items.filter((i) => i.Type === "series").length;

    const totalSeconds = items.reduce((acc, item) => {
      const runtime = Number(item.Runtime) || 0;
      return acc + (runtime > 0 ? runtime : item.Type === "series" ? 2700 : 5400);
    }, 0);

    return {
      totalCount,
      moviesCount,
      seriesCount,
      hours: Math.floor(totalSeconds / 3600),
      days: Math.floor(totalSeconds / 86400),
    };
  }, [items]);

  // Current list filtered by active tab
  const currentList = useMemo(() => {
    return items.filter((item) =>
      activeTab === "movies" ? item.Type === "movie" : item.Type === "series",
    );
  }, [items, activeTab]);

  // Tab & search filtering
  const filteredItems = useMemo(() => {
    return currentList.filter((item) => {
      const matchesSearch = item.Title.toLowerCase().includes(
        searchQuery.toLowerCase(),
      );
      const matchesGenre =
        selectedGenre === "" ||
        (item.Genres && item.Genres.includes(selectedGenre));
      return matchesSearch && matchesGenre;
    });
  }, [currentList, searchQuery, selectedGenre]);

  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, displayCount);
  }, [filteredItems, displayCount]);

  // Restore scroll position
  useEffect(() => {
    const cachedState = watchlistStore.getState();
    if (
      cachedState.hasCachedData &&
      cachedState.scrollY > 0 &&
      visibleItems.length > 0
    ) {
      const timer = setTimeout(() => {
        window.scrollTo(0, cachedState.scrollY);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visibleItems]);

  // Infinite scroll observer
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayCount < filteredItems.length) {
          setDisplayCount((prev) => prev + 24);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, displayCount, filteredItems.length],
  );

  // Dynamic genres for filter dropdown
  const genres = useMemo(() => {
    const allGenres = currentList.flatMap((m) => m.Genres || []);
    return Array.from(new Set(allGenres)).sort();
  }, [currentList]);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 pb-24">
      {/* Header */}
      <header className="mb-12">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">
          My <span className="text-red-600">Watchlist</span>
        </h2>
        <p className="text-zinc-500 font-medium">
          Movies and TV series you plan to watch next
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <BookmarkIcon className="w-16 h-16 text-amber-500" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            Total In Watchlist
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              {stats.totalCount}
            </span>
            <span className="text-amber-500 font-black text-xs uppercase tracking-widest">
              Titles
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <FilmIcon className="w-16 h-16 text-red-600" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            Movies
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              {stats.moviesCount}
            </span>
            <span className="text-red-600 font-black text-xs uppercase tracking-widest">
              Films
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TvIcon className="w-16 h-16 text-sky-500" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            TV Series
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              {stats.seriesCount}
            </span>
            <span className="text-sky-500 font-black text-xs uppercase tracking-widest">
              Shows
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <ClockIcon className="w-16 h-16 text-emerald-500" />
          </div>
          <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">
            Estimated Watch Time
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">
              ~{stats.hours}
            </span>
            <span className="text-emerald-500 font-black text-xs uppercase tracking-widest">
              Hours
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar (Matching Seen.tsx) */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 mb-12 border-b border-zinc-800 pb-8">
        {/* Type Tabs */}
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("movies")}
            className={`px-8 py-2.5 rounded-md text-sm font-black transition-all cursor-pointer ${
              activeTab === "movies"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            MOVIES
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("series")}
            className={`px-8 py-2.5 rounded-md text-sm font-black transition-all cursor-pointer ${
              activeTab === "series"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            TV SERIES
          </button>
        </div>

        {/* Search, Genre, and Sorting Controls */}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative group min-w-75">
            <input
              type="text"
              placeholder="Search in watchlist..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayCount(24);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-600 outline-none transition-all focus:border-transparent text-white"
            />
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-red-600 transition-colors" />
          </div>

          {/* Genre Filter */}
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

          {/* Sorting Dropdown */}
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
              <option value="addedAt-desc">Recently Added</option>
              <option value="addedAt-asc">Oldest Added</option>
              <option value="Title-asc">Title: A-Z</option>
              <option value="Title-desc">Title: Z-A</option>
            </select>
            <ArrowsUpDownIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="flex gap-2">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce"></div>
          </div>
          <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">
            Loading your watchlist...
          </span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-600">
            <BookmarkIcon className="w-8 h-8 opacity-40 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {items.length === 0
              ? "Your watchlist is empty"
              : `No ${activeTab === "movies" ? "movies" : "TV series"} found matching your filter`}
          </h3>
          <p className="text-zinc-500 text-xs max-w-md mx-auto mb-6">
            {items.length === 0
              ? "Save movies and TV shows you want to watch later by clicking the 'Add to Watchlist' button on any title's detail page."
              : "Try clearing your search query or choosing a different genre filter."}
          </p>
          {items.length === 0 && (
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow-lg shadow-red-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Explore Titles to Watch</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
            {visibleItems.map((movie, index) => {
              if (index === visibleItems.length - 1) {
                return (
                  <div key={`${movie.imdbID}-${index}`} ref={lastElementRef}>
                    <MovieCard
                      movie={movie}
                      isWatchlistView={true}
                      onRemoveFromWatchlist={handleRemoveFromWatchlist}
                    />
                  </div>
                );
              }
              return (
                <MovieCard
                  key={`${movie.imdbID}-${index}`}
                  movie={movie}
                  isWatchlistView={true}
                  onRemoveFromWatchlist={handleRemoveFromWatchlist}
                />
              );
            })}
          </div>

          {displayCount < filteredItems.length && (
            <div className="flex justify-center mt-12">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Watchlist;
