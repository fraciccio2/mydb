import { useMemo, useState } from "react";
import type { Movie, TVShow } from "../types";
import {
  CalendarDaysIcon,
  TagIcon,
  ClockIcon,
  FilmIcon,
  TvIcon,
  CheckCircleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface SeenAnalyticsProps {
  allMovies: Movie[];
  allSeries: TVShow[];
}

const GENRE_COLORS = [
  { bg: "bg-red-500", text: "text-red-400", hex: "#ef4444" },
  { bg: "bg-sky-500", text: "text-sky-400", hex: "#0ea5e9" },
  { bg: "bg-amber-500", text: "text-amber-400", hex: "#f59e0b" },
  { bg: "bg-emerald-500", text: "text-emerald-400", hex: "#10b981" },
  { bg: "bg-purple-500", text: "text-purple-400", hex: "#a855f7" },
  { bg: "bg-pink-500", text: "text-pink-400", hex: "#ec4899" },
  { bg: "bg-indigo-500", text: "text-indigo-400", hex: "#6366f1" },
  { bg: "bg-teal-500", text: "text-teal-400", hex: "#14b8a6" },
  { bg: "bg-zinc-600", text: "text-zinc-400", hex: "#52525b" },
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`.trim();
  }
  return `${minutes}m`;
}

export default function SeenAnalytics({
  allMovies,
  allSeries,
}: SeenAnalyticsProps) {
  const [scope, setScope] = useState<"all" | "movies" | "series">("all");
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Available Years extracted from WatchedAt
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();

    allMovies.forEach((m) => {
      if (m.WatchedAt) {
        const y = new Date(m.WatchedAt).getFullYear().toString();
        if (!isNaN(Number(y))) yearsSet.add(y);
      }
    });

    allSeries.forEach((s) => {
      if (s.watchedEpisodes) {
        Object.values(s.watchedEpisodes).forEach((ep) => {
          if (ep.watchedAt) {
            const y = new Date(ep.watchedAt).getFullYear().toString();
            if (!isNaN(Number(y))) yearsSet.add(y);
          }
        });
      } else if (s.WatchedAt) {
        const y = new Date(s.WatchedAt).getFullYear().toString();
        if (!isNaN(Number(y))) yearsSet.add(y);
      }
    });

    const sorted = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
    const currentYear = new Date().getFullYear().toString();
    if (!sorted.includes(currentYear)) {
      sorted.unshift(currentYear);
    }
    return sorted;
  }, [allMovies, allSeries]);

  const [selectedYear, setSelectedYear] = useState<string>(
    availableYears[0] || new Date().getFullYear().toString(),
  );

  // Filtered collections according to active scope
  const targetMovies = useMemo(() => {
    if (scope === "series") return [];
    return allMovies;
  }, [allMovies, scope]);

  const targetSeries = useMemo(() => {
    if (scope === "movies") return [];
    return allSeries;
  }, [allSeries, scope]);

  // 1. Records & Milestones
  const records = useMemo<{
    longestMovie: Movie | null;
    shortestMovie: Movie | null;
    avgMovieDuration: string;
    fullyCompletedSeries: number;
    ongoingSeries: number;
    endedSeries: number;
    totalSeries: number;
  }>(() => {
    let longestMovie: Movie | null = null;
    let shortestMovie: Movie | null = null;
    let totalMovieSec = 0;
    let validMovieCount = 0;

    for (const m of allMovies) {
      const sec = Number(m.Runtime) || 0;
      if (sec > 0) {
        totalMovieSec += sec;
        validMovieCount++;
        const longestSec = longestMovie ? Number(longestMovie.Runtime) || 0 : 0;
        if (!longestMovie || sec > longestSec) {
          longestMovie = m;
        }
        const shortestSec = shortestMovie
          ? Number(shortestMovie.Runtime) || 0
          : Infinity;
        if (!shortestMovie || sec < shortestSec) {
          shortestMovie = m;
        }
      }
    }

    const avgMovieSec =
      validMovieCount > 0 ? Math.round(totalMovieSec / validMovieCount) : 0;

    let fullyCompletedSeries = 0;
    let ongoingSeries = 0;
    let endedSeries = 0;

    for (const s of allSeries) {
      const status = (s.status || "").toLowerCase();
      if (
        status === "ongoing" ||
        status === "continuing" ||
        status === "in progress"
      ) {
        ongoingSeries++;
      } else if (status === "ended" || status === "finished") {
        endedSeries++;
      }

      if (
        s.totalEpisodes &&
        s.totalEpisodes > 0 &&
        s.watchedEpisodesCount &&
        s.watchedEpisodesCount >= s.totalEpisodes
      ) {
        fullyCompletedSeries++;
      }
    }

    return {
      longestMovie,
      shortestMovie,
      avgMovieDuration: formatDuration(avgMovieSec),
      fullyCompletedSeries,
      ongoingSeries,
      endedSeries,
      totalSeries: allSeries.length,
    };
  }, [allMovies, allSeries]);

  // 2. Genre Breakdown
  const genreBreakdown = useMemo(() => {
    const genreMap: Record<string, number> = {};
    let totalAssigned = 0;

    targetMovies.forEach((m) => {
      (m.Genres || []).forEach((g) => {
        if (!g) return;
        genreMap[g] = (genreMap[g] || 0) + 1;
        totalAssigned++;
      });
    });

    targetSeries.forEach((s) => {
      (s.Genres || []).forEach((g) => {
        if (!g) return;
        genreMap[g] = (genreMap[g] || 0) + 1;
        totalAssigned++;
      });
    });

    const sorted = Object.entries(genreMap).sort((a, b) => b[1] - a[1]);
    if (totalAssigned === 0) return { list: [], total: 0 };

    const topGenres = sorted.slice(0, 8).map(([genre, count], idx) => ({
      genre,
      count,
      percent: Math.round((count / totalAssigned) * 100),
      color: GENRE_COLORS[idx % GENRE_COLORS.length],
    }));

    const otherCount = sorted.slice(8).reduce((acc, curr) => acc + curr[1], 0);
    if (otherCount > 0) {
      topGenres.push({
        genre: "Others",
        count: otherCount,
        percent: Math.round((otherCount / totalAssigned) * 100),
        color: GENRE_COLORS[GENRE_COLORS.length - 1],
      });
    }

    return { list: topGenres, total: totalAssigned };
  }, [targetMovies, targetSeries]);

  // 3. Decades Breakdown
  const decadesData = useMemo(() => {
    const eras: Record<string, number> = {
      "< 1980": 0,
      "80s (1980-89)": 0,
      "90s (1990-99)": 0,
      "2000s": 0,
      "2010s": 0,
      "2020+": 0,
    };

    const processYear = (yearStr?: string) => {
      if (!yearStr) return;
      const y = parseInt(yearStr.split("-")[0], 10);
      if (isNaN(y)) return;

      if (y < 1980) eras["< 1980"]++;
      else if (y < 1990) eras["80s (1980-89)"]++;
      else if (y < 2000) eras["90s (1990-99)"]++;
      else if (y < 2010) eras["2000s"]++;
      else if (y < 2020) eras["2010s"]++;
      else eras["2020+"]++;
    };

    targetMovies.forEach((m) => processYear(m.Year));
    targetSeries.forEach((s) => processYear(s.Year));

    const total = Object.values(eras).reduce((a, b) => a + b, 0);
    const max = Math.max(...Object.values(eras), 1);

    return {
      entries: Object.entries(eras).map(([label, count]) => ({
        label,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        barPercent: Math.round((count / max) * 100),
      })),
      total,
    };
  }, [targetMovies, targetSeries]);

  // 4. Monthly Activity for Selected Year
  const monthlyData = useMemo(() => {
    const counts = Array(12).fill(0);
    const movieCounts = Array(12).fill(0);
    const episodeCounts = Array(12).fill(0);
    const timeSpent = Array(12).fill(0);

    // Process Movies
    targetMovies.forEach((m) => {
      if (!m.WatchedAt) return;
      const d = new Date(m.WatchedAt);
      if (d.getFullYear().toString() === selectedYear) {
        const month = d.getMonth();
        counts[month]++;
        movieCounts[month]++;
        timeSpent[month] += Number(m.Runtime) || 0;
      }
    });

    // Process Series
    targetSeries.forEach((s) => {
      const epSec = Number(s.Runtime) > 0 ? Number(s.Runtime) : 2700;
      if (s.watchedEpisodes) {
        Object.values(s.watchedEpisodes).forEach((ep) => {
          if (!ep.watchedAt) return;
          const d = new Date(ep.watchedAt);
          if (d.getFullYear().toString() === selectedYear) {
            const month = d.getMonth();
            counts[month]++;
            episodeCounts[month]++;
            timeSpent[month] += epSec;
          }
        });
      } else if (s.WatchedAt) {
        const d = new Date(s.WatchedAt);
        if (d.getFullYear().toString() === selectedYear) {
          const month = d.getMonth();
          counts[month]++;
          episodeCounts[month]++;
          timeSpent[month] += epSec;
        }
      }
    });

    const maxCount = Math.max(...counts, 1);
    const totalItems = counts.reduce((a, b) => a + b, 0);
    const totalTime = timeSpent.reduce((a, b) => a + b, 0);

    let bestMonthIndex = -1;
    let bestMonthCount = 0;
    counts.forEach((c, idx) => {
      if (c > bestMonthCount) {
        bestMonthCount = c;
        bestMonthIndex = idx;
      }
    });

    return {
      counts,
      movieCounts,
      episodeCounts,
      timeSpent,
      maxCount,
      totalItems,
      totalTime,
      bestMonth:
        bestMonthIndex >= 0
          ? `${MONTH_NAMES[bestMonthIndex]} (${bestMonthCount})`
          : "N/A",
    };
  }, [targetMovies, targetSeries, selectedYear]);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 mb-12 shadow-2xl backdrop-blur-md animate-fadeIn transition-all">
      {/* Analytics Sub-Header with Scope selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-600/20 text-red-500">
            <ChartBarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">
              Viewing <span className="text-red-600">Analytics</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Interactive insights and habits breakdown
            </p>
          </div>
        </div>

        {/* Scope Pill Selector */}
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800/80 text-xs font-black">
          <button
            type="button"
            onClick={() => setScope("all")}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer uppercase ${
              scope === "all"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setScope("movies")}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer uppercase ${
              scope === "movies"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => setScope("series")}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer uppercase ${
              scope === "series"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Series
          </button>
        </div>
      </div>

      {/* 1. At-a-Glance Personal Records & Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Longest Movie */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-2.5 bg-red-600/10 rounded-lg text-red-500 shrink-0">
            <FilmIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
              Longest Movie
            </span>
            <p
              className="text-xs font-bold text-white truncate"
              title={records.longestMovie?.Title}
            >
              {records.longestMovie?.Title || "N/A"}
            </p>
            <span className="text-[11px] font-black text-red-400">
              {records.longestMovie
                ? formatDuration(Number(records.longestMovie.Runtime) || 0)
                : "—"}
            </span>
          </div>
        </div>

        {/* Average Movie Duration */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
              Avg Movie Length
            </span>
            <p className="text-sm font-black text-white truncate">
              {records.avgMovieDuration}
            </p>
            <span className="text-[11px] font-medium text-zinc-500">
              across {allMovies.length} movies
            </span>
          </div>
        </div>

        {/* Completed Series */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500 shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
              Completed Shows
            </span>
            <p className="text-sm font-black text-white truncate">
              {records.fullyCompletedSeries} Series
            </p>
            <span className="text-[11px] font-medium text-emerald-400">
              All episodes watched
            </span>
          </div>
        </div>

        {/* Ongoing Shows */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-500 shrink-0">
            <TvIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
              Series in Progress
            </span>
            <p className="text-sm font-black text-white truncate">
              {records.ongoingSeries} Ongoing
            </p>
            <span className="text-[11px] font-medium text-sky-400">
              Active series tracking
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Tastes & Eras Breakdown (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Favorite Categories */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div className="mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-red-500" />
              Tastes & Genres
            </span>
            <h4 className="text-lg font-black text-white mt-0.5">
              Favorite Categories
            </h4>
          </div>

          {/* Continuous Proportional Segmented Bar */}
          <div className="mb-6">
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-zinc-900 border border-zinc-800">
              {genreBreakdown.list.map((item) => (
                <div
                  key={item.genre}
                  style={{ width: `${Math.max(item.percent, 2)}%` }}
                  className={`${item.color.bg} h-full transition-all duration-300 hover:opacity-80`}
                  title={`${item.genre}: ${item.count} (${item.percent}%)`}
                />
              ))}
            </div>
          </div>

          {/* Genre Badges Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {genreBreakdown.list.map((item) => (
              <div
                key={item.genre}
                className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 truncate mr-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${item.color.bg}`}
                  />
                  <span className="font-bold text-zinc-300 truncate">
                    {item.genre}
                  </span>
                </div>
                <span className="text-[11px] font-black text-zinc-500">
                  {item.percent}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-900 text-xs text-zinc-500 flex justify-between">
            <span>Categorized titles: {genreBreakdown.total}</span>
            <span>Total genres: {genreBreakdown.list.length}</span>
          </div>
        </div>

        {/* Release Eras (Viaggio nel Tempo) */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div className="mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-red-500" />
              Time Travel
            </span>
            <h4 className="text-lg font-black text-white mt-0.5">
              Release Eras
            </h4>
          </div>

          <div className="space-y-3">
            {decadesData.entries.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-300">{item.label}</span>
                  <span className="text-zinc-400 font-semibold text-[11px]">
                    {item.count} titles{" "}
                    <span className="text-zinc-600">({item.percent}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.barPercent}%` }}
                    className="h-full bg-linear-to-r from-red-600 to-amber-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-3 border-t border-zinc-900 text-xs text-zinc-500 flex justify-between">
            <span>Cataloged eras: {decadesData.entries.length}</span>
            <span>Analyzed titles: {decadesData.total}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Monthly Activity Distribution (Full-width with contextual Year Selector) */}
      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-red-500" />
              Viewing Rhythm
            </span>
            <h4 className="text-lg font-black text-white mt-0.5">
              Activity Distribution ({selectedYear})
            </h4>
          </div>

          {/* Right: Year stats + Contextual Year Dropdown */}
          <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-[11px] font-bold text-zinc-400 block">
                Total in {selectedYear}
              </span>
              <span className="text-lg sm:text-xl font-black text-red-500">
                {monthlyData.totalItems}{" "}
                <span className="text-xs text-zinc-500 font-medium">
                  ({formatDuration(monthlyData.totalTime)})
                </span>
              </span>
            </div>

            {/* Year Dropdown placed right here! */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-200 focus:outline-none focus:border-red-600 transition-colors cursor-pointer appearance-none pr-7 shadow-sm"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <CalendarDaysIcon className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Wide Bar Chart Canvas */}
        <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-3 pt-6 px-1 border-b border-zinc-800/80">
          {monthlyData.counts.map((count, index) => {
            const heightPercent =
              count > 0
                ? Math.max(12, Math.round((count / monthlyData.maxCount) * 100))
                : 4;
            const isHovered = hoveredMonth === index;

            return (
              <div
                key={MONTH_NAMES[index]}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredMonth(index)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Tooltip */}
                {isHovered && count > 0 && (
                  <div className="absolute -top-12 z-30 bg-zinc-900 border border-zinc-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-md shadow-xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 left-1/2 animate-fadeIn">
                    <span className="text-red-400">{MONTH_NAMES[index]}: </span>
                    <span>{count} titles</span>
                    <span className="text-zinc-500 text-[10px] block">
                      {formatDuration(monthlyData.timeSpent[index])}
                    </span>
                  </div>
                )}

                {/* The Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-10 rounded-t-sm transition-all duration-300 ${
                    count === 0
                      ? "bg-zinc-800/40"
                      : isHovered
                        ? "bg-red-500 shadow-lg shadow-red-500/30 scale-x-105"
                        : "bg-linear-to-t from-red-600/80 to-red-500"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Month Labels & Bottom info */}
        <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-zinc-500 pt-2 px-1">
          {MONTH_NAMES.map((name, idx) => (
            <span
              key={name}
              className={`flex-1 text-center transition-colors ${
                hoveredMonth === idx ? "text-red-400 font-black" : ""
              }`}
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-400">
          <span>
            Best Month:{" "}
            <strong className="text-white font-bold">
              {monthlyData.bestMonth}
            </strong>
          </span>
          <span>
            Monthly Average:{" "}
            <strong className="text-white font-bold">
              {Math.round(monthlyData.totalItems / 12)} / mo
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
