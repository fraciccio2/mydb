import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  FilmIcon,
  GlobeAltIcon,
  ListBulletIcon,
  PlayIcon,
  Squares2X2Icon,
  StarIcon,
  TrophyIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import type {
  HybridMovieDetails,
  MovieDetails,
  OmdbErrorResponse,
  WhatsOnItem,
} from "../types";

function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<HybridMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchHybridDetails = async () => {
      if (!id) return;

      setLoading(true);
      setError("");
      setMovie(null);
      setImgError(false);

      try {
        const apiKeyOMDB = import.meta.env.VITE_OMDB_API_KEY;
        const apiKeyWhatsON = import.meta.env.VITE_WHATS_ON_API_KEY;

        // Parallel fetches
        const omdbPromise = fetch(
          `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&i=${id}&plot=full`,
          {
            signal: controller.signal,
          },
        );

        const whatsonPromise = fetch(
          `https://whatson-api.onrender.com/?imdbId=${id}&api_key=${apiKeyWhatsON}&append_to_response=platforms_links,episodes_details`,
          {
            signal: controller.signal,
          },
        );

        const [omdbRes, whatsonRes] = await Promise.all([
          omdbPromise,
          whatsonPromise,
        ]);

        const omdbResData: MovieDetails | OmdbErrorResponse =
          await omdbRes.json();
        const whatsonResData = await whatsonRes.json();
        const whatsonItem: WhatsOnItem | undefined =
          whatsonResData.results?.[0];
        const omdbData =
          omdbResData.Response === "True"
            ? (omdbResData as MovieDetails)
            : null;

        if (isMounted) {
          if (whatsonItem) {
            // Priority: WhatsOn. Integrating Plot and Actors from OMDb if available.
            const hybrid: MovieDetails = {
              Title: whatsonItem.title || omdbData?.Title || "N/A",
              Year:
                (whatsonItem.release_date
                  ? whatsonItem.release_date.split("-")[0]
                  : omdbData?.Year) || "N/A",
              Rated: omdbData?.Rated || "N/A",
              Released: whatsonItem.release_date || omdbData?.Released || "N/A",
              Runtime:
                (whatsonItem.runtime
                  ? `${whatsonItem.runtime} min`
                  : omdbData?.Runtime) || "N/A",
              Genre: omdbData?.Genre || "N/A",
              Director: omdbData?.Director || "N/A",
              Writer: omdbData?.Writer || "N/A",
              Actors: omdbData?.Actors || "N/A",
              Plot: omdbData?.Plot || "N/A",
              Language: omdbData?.Language || "N/A",
              Country: omdbData?.Country || "N/A",
              Awards: omdbData?.Awards || "N/A",
              Poster: whatsonItem.image || omdbData?.Poster || "N/A",
              Ratings: omdbData?.Ratings || [],
              Metascore: omdbData?.Metascore || "N/A",
              imdbRating:
                (whatsonItem.imdb?.users_rating
                  ? whatsonItem.imdb.users_rating.toString()
                  : omdbData?.imdbRating) || "N/A",
              imdbVotes:
                (whatsonItem.imdb?.users_rating
                  ? whatsonItem.imdb.users_rating.toString()
                  : omdbData?.imdbVotes) || "N/A",
              imdbID: id,
              Type:
                (whatsonItem.item_type === "tvshow"
                  ? "series"
                  : whatsonItem.item_type) ||
                omdbData?.Type ||
                "movie",
              BoxOffice: omdbData?.BoxOffice || "N/A",
              Production: omdbData?.Production || "N/A",
              Website: omdbData?.Website || "N/A",
              Response: "True",
            };
            setMovie({ ...hybrid, whatson: whatsonItem });
          } else if (omdbData) {
            // Fallback: OMDb
            setMovie({ ...omdbData, whatson: undefined });
          } else {
            setError("Title not found.");
          }
          setLoading(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        if (isMounted) {
          setError("Error loading. Please try again later.");
          setLoading(false);
        }
        console.error(err);
      }
    };

    fetchHybridDetails().catch((e) => console.error(e));

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
        </div>
        <p className="text-red-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">
          Search data...
        </p>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-lg inline-block">
          <p className="text-red-400 font-bold mb-6">
            {error || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-bold transition-all mx-auto uppercase text-xs tracking-widest"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Go back
          </button>
        </div>
      </div>
    );
  }

  // Helper to prioritize WhatsOn data
  const getFallback = (
    whatsOnVal: string | undefined | null,
    omdbVal: string,
    placeholder: string = "-",
  ) => {
    if (whatsOnVal && whatsOnVal !== "N/A") return whatsOnVal;
    if (omdbVal && omdbVal !== "N/A") return omdbVal;
    return placeholder;
  };

  const title = getFallback(movie.whatson?.title, movie.Title, "Title Unknown");
  const poster = getFallback(movie.whatson?.image, movie.Poster, "N/A");
  const year = getFallback(
    movie.whatson?.release_date?.split("-")[0],
    movie.Year,
  );
  const runtime = getFallback(
    movie.whatson?.runtime ? `${movie.whatson.runtime / 60} min` : null,
    movie.Runtime,
  );
  const isPlaceholder = poster === "N/A" || imgError;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-10 transition-colors group"
      >
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">
          Back to search
        </span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Poster & Quick Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="relative group shadow-2xl shadow-black/50 rounded-lg overflow-hidden border border-zinc-800">
            {!isPlaceholder ? (
              <img
                src={poster}
                alt={title}
                className="w-full h-auto object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="aspect-2/3 w-full bg-zinc-900 flex flex-col items-center justify-center text-zinc-800 p-8">
                <FilmIcon className="w-20 h-20 mb-4 opacity-20" />
                <span className="text-xs uppercase tracking-widest font-black opacity-40">
                  No poster
                </span>
              </div>
            )}

            {/* Rating Badge */}
            <div className="absolute top-4 right-4 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 px-3 py-2 rounded-lg flex items-center gap-2">
              <StarIconSolid className="w-5 h-5 text-yellow-500" />
              <div className="flex gap-1">
                <span className="text-white font-black text-sm leading-none">
                  {movie.whatson?.imdb?.users_rating
                    ? movie.whatson?.imdb?.users_rating
                    : movie.imdbRating !== "N/A"
                      ? movie.imdbRating
                      : "N/A"}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase leading-none mt-1">
                  / 10
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col items-center text-center">
              <CalendarIcon className="w-5 h-5 text-red-500 mb-2" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                Year
              </span>
              <span className="text-sm font-bold text-white">
                {year + (movie.whatson?.status === "Ongoing" ? " - " : "")}
              </span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col items-center text-center">
              <ClockIcon className="w-5 h-5 text-red-500 mb-2" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                Duration
              </span>
              <span className="text-sm font-bold text-white">{runtime}</span>
            </div>
          </div>

          {/* Where to Watch (WhatsOn Integration) */}
          {movie.whatson?.platforms_links &&
            movie.whatson.platforms_links.length > 0 && (
              <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-lg space-y-4">
                <h4 className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <PlayIcon className="w-4 h-4" /> Where to watch it
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {movie.whatson.platforms_links.map((link) => (
                    <a
                      key={link.name}
                      href={link.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded hover:border-red-600/50 transition-colors group/link"
                    >
                      <span className="text-xs font-bold text-zinc-300 group-hover/link:text-white">
                        {link.name}
                      </span>
                      <span className="text-[10px] uppercase font-black text-red-500">
                        Play →
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          {/* Trailer Button */}
          {movie.whatson?.trailer && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-colors"></div>
              <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
                <PlayIcon className="w-4 h-4 text-red-600" /> Extra Content
              </h4>
              <a
                href={movie.whatson.trailer}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-zinc-950 border border-zinc-800 hover:border-red-600/50 text-white py-3 rounded-lg font-black uppercase text-[10px] tracking-[0.2em] transition-all relative z-10"
              >
                Watch the Trailer
                <PlayIcon className="w-4 h-4 text-red-600" />
              </a>
            </div>
          )}

          {/* Ratings Grid (Hybrid) */}
          {(movie.whatson?.letterboxd ||
            movie.whatson?.senscritique ||
            movie.whatson?.rotten_tomatoes ||
            movie.whatson?.metacritic) && (
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg space-y-4">
              <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-zinc-800 pb-3">
                Ratings
              </h4>

              <div className="space-y-4 pt-1">
                {movie.whatson?.letterboxd && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-medium">
                      Letterboxd
                    </span>
                    <span className="text-white text-xs font-black">
                      {movie.whatson.letterboxd.users_rating}/5
                    </span>
                  </div>
                )}

                {movie.whatson?.senscritique && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-medium">
                      SensCritique
                    </span>
                    <span className="text-white text-xs font-black">
                      {movie.whatson.senscritique.users_rating}/10
                    </span>
                  </div>
                )}

                {movie.whatson?.rotten_tomatoes && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-medium">
                      Rotten Tomatoes
                    </span>
                    <span className="text-white text-xs font-black">
                      {movie.whatson.rotten_tomatoes.critics_rating}%
                    </span>
                  </div>
                )}

                {movie.whatson?.metacritic && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs font-medium">
                      Metacritic
                    </span>
                    <span className="text-white text-xs font-black">
                      {movie.whatson.metacritic.users_rating}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Main Info */}
        <div className="lg:col-span-8 space-y-10">
          <header>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {movie.Genre.split(", ").map((g) => (
                <span
                  key={g}
                  className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full border border-zinc-700"
                >
                  {g}
                </span>
              ))}
              <span className="text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20">
                {movie.Rated}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter mb-4">
              {title}
            </h1>
            <p className="text-xl text-zinc-400 font-medium leading-relaxed italic border-l-4 border-red-600 pl-6">
              {movie.Awards !== "N/A" ? movie.Awards : "No prizes registered."}
            </p>
          </header>

          {/* Series Specific Info (WhatsOn) */}
          {movie.Type === "series" && movie.whatson && (
            <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-xl space-y-8">
              <div className="flex flex-wrap items-center gap-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600/10 rounded-lg">
                    <Squares2X2Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      Status
                    </span>
                    <span
                      className={`text-sm font-black uppercase tracking-wider ${
                        movie.whatson.status === "Ended"
                          ? "text-zinc-500"
                          : movie.whatson.status === "Canceled"
                            ? "text-red-500"
                            : movie.whatson.status === "Ongoing"
                              ? "text-green-500"
                              : "text-zinc-400"
                      }`}
                    >
                      {movie.whatson.status === "Ended"
                        ? "Finished"
                        : movie.whatson.status === "Ongoing"
                          ? "In Progress"
                          : movie.whatson.status || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600/10 rounded-lg">
                    <ListBulletIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      Seasons
                    </span>
                    <span className="text-sm font-black text-white">
                      {movie.whatson.seasons_number || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {Array.isArray(movie.whatson.episodes_details) &&
                movie.whatson.episodes_details.length > 0 && (
                  <div className="pt-6 border-t border-zinc-800 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <ListBulletIcon className="w-4 h-4 text-red-600" />{" "}
                        Series Structure
                      </h4>
                      <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                        {movie.whatson.seasons_number ||
                          Math.max(
                            ...movie.whatson.episodes_details.map(
                              (e) => e.season,
                            ),
                          )}{" "}
                        Seasons
                      </span>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(
                        movie.whatson.episodes_details.reduce(
                          (acc, ep) => {
                            const s = ep.season;
                            if (!acc[s]) acc[s] = [];
                            acc[s].push(ep);
                            return acc;
                          },
                          {} as Record<
                            number,
                            typeof movie.whatson.episodes_details
                          >,
                        ),
                      )
                        .sort(([aS], [bS]) => Number(aS) - Number(bS))
                        .map(([season, episodes]) => (
                          <details
                            key={season}
                            className="group/season bg-zinc-950/40 rounded-xl border border-zinc-800/50 overflow-hidden transition-all"
                          >
                            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-zinc-900/50 list-none">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-red-600/10 rounded-lg flex items-center justify-center border border-red-600/20">
                                  <span className="text-xs font-black text-red-500">
                                    {season}
                                  </span>
                                </div>
                                <span className="text-sm font-black text-zinc-200 uppercase tracking-widest">
                                  Season {season}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                  {episodes.length} Episodes
                                </span>
                                <div className="text-zinc-600 group-open/season:rotate-180 transition-transform">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </summary>
                            <div className="px-6 pb-6">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 w-16">
                                      N°
                                    </th>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50">
                                      Title
                                    </th>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 text-right">
                                      Rating
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/20">
                                  {episodes
                                    .sort((a, b) => a.episode - b.episode)
                                    .map((ep) => (
                                      <tr
                                        key={ep.id}
                                        className="hover:bg-red-600/5 transition-colors group/ep"
                                      >
                                        <td className="py-4">
                                          <span className="text-[10px] font-black text-zinc-500 group-hover/ep:text-red-500 transition-colors">
                                            #{ep.episode}
                                          </span>
                                        </td>
                                        <td className="py-4">
                                          <span className="text-xs font-bold text-zinc-300 group-hover/ep:text-white transition-colors">
                                            {ep.title}
                                          </span>
                                        </td>
                                        <td className="py-4 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <StarIconSolid className="w-3 h-3 text-yellow-500" />
                                            <span className="text-[11px] font-black text-zinc-400 group-hover/ep:text-white">
                                              {ep.users_rating
                                                ? ep.users_rating.toFixed(1)
                                                : "-"}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        ))}
                    </div>
                  </div>
                )}
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-8 h-px bg-red-600"></span>
              PLOT
            </h3>
            <p className="text-zinc-300 leading-relaxed text-lg font-light">
              {getFallback(null, movie.Plot, "Plot not available.")}
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-red-600" /> Cast
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      Direction
                    </span>
                    <span className="text-white font-medium">
                      {getFallback(null, movie.Director)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      Screenplay
                    </span>
                    <span className="text-white font-medium">
                      {getFallback(null, movie.Writer)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      Produzione
                    </span>
                    <span className="text-white font-medium">
                      {getFallback(null, movie.Production)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <GlobeAltIcon className="w-4 h-4 text-red-600" /> Information
                  Extra
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                      Country
                    </span>
                    <span className="text-white font-medium">
                      {getFallback(null, movie.Country)}
                    </span>
                  </div>
                  {movie.BoxOffice !== "N/A" && (
                    <div>
                      <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">
                        Grosses
                      </span>
                      <span className="text-white font-medium">
                        {movie.BoxOffice}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl relative overflow-hidden group">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-600/5 rounded-full blur-3xl group-hover:bg-red-600/10 transition-colors"></div>

                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3 relative z-10">
                  <StarIcon className="w-4 h-4 text-red-600" /> Main Cast
                </h3>
                <div className="space-y-4 relative z-10">
                  {movie.Actors !== "N/A" ? (
                    movie.Actors.split(", ").map((actor) => (
                      <div
                        key={actor}
                        className="flex items-center gap-3 group/actor"
                      >
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full group-hover/actor:scale-150 transition-transform"></div>
                        <span className="text-zinc-200 font-medium group-hover/actor:text-white transition-colors">
                          {actor}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-zinc-500 italic text-sm">
                      Information not available
                    </span>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-zinc-800">
                  <div className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors cursor-default">
                    <TrophyIcon className="w-5 h-5 text-red-600" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      IMDb ID: {movie.imdbID}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Details;
