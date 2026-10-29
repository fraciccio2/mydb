import { useRef, useEffect, useSyncExternalStore } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilmIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import MovieCard from "../components/MovieCard";
import { homeStore, type RowFetchConfig } from "../store/homeStore";

interface GenreConfig extends RowFetchConfig {
  title: string;
  subtitle: string;
}

const MOVIE_GENRES: GenreConfig[] = [
  {
    key: "movie_trending",
    title: "Trending Movies",
    subtitle: "Most popular and top-rated movies this week",
    itemType: "movie",
    isTrending: true,
  },
  {
    key: "movie_Action",
    title: "Action & Adventure",
    subtitle: "Adrenaline-fueled stunts, high-speed chases, and battles",
    genre: "Action",
    itemType: "movie",
  },
  {
    key: "movie_Comedy",
    title: "Comedy Hits",
    subtitle: "Hilarious laughs and feel-good movies for any time",
    genre: "Comedy",
    itemType: "movie",
  },
  {
    key: "movie_Drama",
    title: "Gripping Dramas",
    subtitle: "Powerful emotional journeys and memorable characters",
    genre: "Drama",
    itemType: "movie",
  },
  {
    key: "movie_Thriller",
    title: "Thrillers & Suspense",
    subtitle: "Mind games, psychological tension, and unexpected twists",
    genre: "Thriller",
    itemType: "movie",
  },
  {
    key: "movie_SciFi",
    title: "Sci-Fi & Fantasy",
    subtitle: "Futuristic worlds, space exploration, and cosmic voyages",
    genre: "Science Fiction",
    itemType: "movie",
  },
  {
    key: "movie_Horror",
    title: "Horror & Chills",
    subtitle: "Spine-chilling scares, haunted mysteries, and dark terror",
    genre: "Horror",
    itemType: "movie",
  },
  {
    key: "movie_Animation",
    title: "Family & Animation",
    subtitle: "Beloved animated masterpieces for audiences of all ages",
    genre: "Animation",
    itemType: "movie",
  },
];

const SERIES_GENRES: GenreConfig[] = [
  {
    key: "series_trending",
    title: "Trending TV Series",
    subtitle: "The most binge-worthy and talked-about series right now",
    itemType: "tvshow",
    isTrending: true,
  },
  {
    key: "series_Drama",
    title: "Drama Series",
    subtitle: "Complex plots, intense arcs, and acclaimed performances",
    genre: "Drama",
    itemType: "tvshow",
  },
  {
    key: "series_Comedy",
    title: "Comedy & Sitcoms",
    subtitle: "Lighthearted fun, quick laughs, and comfort watching",
    genre: "Comedy",
    itemType: "tvshow",
  },
  {
    key: "series_Mystery",
    title: "Mystery & Crime",
    subtitle:
      "Intriguing puzzles, murder mysteries, and detective investigations",
    genre: "Mystery",
    itemType: "tvshow",
  },
  {
    key: "series_Action",
    title: "Action & Superheroes",
    subtitle: "High stakes, spectacular effects, and epic showdowns",
    genre: "Action",
    itemType: "tvshow",
  },
  {
    key: "series_SciFi",
    title: "Sci-Fi & Dystopia",
    subtitle:
      "Alternative futures, space adventures, and extraterrestrial mysteries",
    genre: "Sci-Fi & Fantasy",
    itemType: "tvshow",
  },
  {
    key: "series_Crime",
    title: "Crime & Law",
    subtitle:
      "Gritty police investigations, underworld syndicates, and courtroom drama",
    genre: "Crime",
    itemType: "tvshow",
  },
];

interface GenreCarouselRowProps {
  configItem: GenreConfig;
}

function GenreCarouselRow({ configItem }: GenreCarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rows } = useSyncExternalStore(
    homeStore.subscribe,
    homeStore.getState,
  );
  const rowData = rows[configItem.key] || {
    items: [],
    page: 1,
    hasMore: true,
    status: "idle",
  };

  // Trigger initial page fetch ONCE if the row has not been fetched yet
  useEffect(() => {
    if (rowData.status === "idle") {
      homeStore.fetchRowPage(configItem, 1);
    }
  }, [configItem, rowData.status]);

  // Handle horizontal scrolling to detect near-end and load next page (up to ~60 items)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    const isNearEnd = scrollWidth - (scrollLeft + clientWidth) < 400;

    if (
      isNearEnd &&
      rowData.hasMore &&
      rowData.status !== "loading" &&
      rowData.page < 3
    ) {
      homeStore.fetchRowPage(configItem, rowData.page + 1);
    }
  };

  const scrollHorizontally = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -650 : 650;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });

      if (
        direction === "right" &&
        rowData.hasMore &&
        rowData.status !== "loading" &&
        rowData.page < 3
      ) {
        homeStore.fetchRowPage(configItem, rowData.page + 1);
      }
    }
  };

  return (
    <section className="space-y-3 relative group/row">
      {/* Row Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {configItem.title}
          </h2>
          <p className="text-zinc-500 text-xs font-medium">
            {configItem.subtitle}
          </p>
        </div>

        {/* Scroll Arrows */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-80 group-hover/row:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => scrollHorizontally("left")}
            aria-label="Scroll left"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer active:scale-95"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollHorizontally("right")}
            aria-label="Scroll right"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer active:scale-95"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items Scroll Track */}
      {rowData.items.length === 0 && rowData.status === "loading" ? (
        <div className="flex gap-4 overflow-hidden py-2 px-1">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-none w-36 sm:w-44 md:w-52 aspect-2/3 bg-zinc-900/50 rounded-md animate-pulse border border-zinc-800/40"
            />
          ))}
        </div>
      ) : rowData.items.length > 0 ? (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth scrollbar-none snap-x"
        >
          {rowData.items.map((movie, index) => (
            <div
              key={`${movie.imdbID}-${index}`}
              className="flex-none w-36 sm:w-44 md:w-52 snap-start"
            >
              <MovieCard movie={movie} />
            </div>
          ))}

          {/* Inline Loading Indicator at the end of the track */}
          {rowData.status === "loading" && (
            <div className="flex-none w-28 flex flex-col items-center justify-center gap-2 bg-zinc-950/40 rounded-md border border-zinc-900">
              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Loading...
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-zinc-600 text-xs font-semibold uppercase tracking-widest">
          {rowData.status === "error"
            ? "Unable to load titles right now"
            : "No titles found in this category"}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { activeTab } = useSyncExternalStore(
    homeStore.subscribe,
    homeStore.getState,
  );

  const setActiveTab = (tab: "movies" | "series") => {
    homeStore.setState({ activeTab: tab });
  };

  const currentGenres = activeTab === "movies" ? MOVIE_GENRES : SERIES_GENRES;

  return (
    <div className="min-h-screen pb-24 space-y-8">
      {/* Category Tabs: Movies vs TV Series */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Browse <span className="text-red-600">Catalog</span>
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Explore trending titles and curated collections by genre
            </p>
          </div>

          {/* Integrated Segmented Control Buttons */}
          <div className="inline-flex p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("movies")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "movies"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <FilmIcon className="w-4 h-4" />
              <span>Movies</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("series")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                activeTab === "series"
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <TvIcon className="w-4 h-4" />
              <span>TV Series</span>
            </button>
          </div>
        </div>
      </div>

      {/* Genre Carousels Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {currentGenres.map((genreConfig) => (
          <GenreCarouselRow key={genreConfig.key} configItem={genreConfig} />
        ))}
      </div>
    </div>
  );
}
