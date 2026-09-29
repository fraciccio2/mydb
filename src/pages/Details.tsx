import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
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
  PlusCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  StarIcon as StarIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
} from "@heroicons/react/24/solid";
import type {
  HybridMovieDetails,
  MovieDetails,
  OmdbErrorResponse,
  WhatsOnItem,
  Movie,
  TVShow,
  WatchedEpisodeInfo,
  SeriesEpisode,
} from "../types";

function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<HybridMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const [isSeen, setIsSeen] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<
    Record<string, WatchedEpisodeInfo>
  >({});
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchHybridDetails = async () => {
      if (!id) return;

      setLoading(true);
      setError("");
      setMovie(null);
      setImgError(false);
      setWatchedEpisodes({});
      setIsSeen(false);

      try {
        const apiKeyOMDB = "704c9e59";
        const apiKeyWhatsON = "d0b8b76f-d505-4d36-82ea-e8f968a2dbd1";

        // Check if seen in Firestore
        const docRef = doc(db, "movies", id);
        const tvDocRef = doc(db, "tvshows", id);

        const [omdbRes, whatsonRes, seenDoc, seenTvDoc] = await Promise.all([
          fetch(
            `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&i=${id}&plot=full`,
            { signal: controller.signal },
          ),
          fetch(
            `https://whatson-api.onrender.com/?imdbId=${id}&api_key=${apiKeyWhatsON}&append_to_response=platforms_links,episodes_details`,
            { signal: controller.signal },
          ),
          getDoc(docRef),
          getDoc(tvDocRef),
        ]);

        if (seenDoc.exists()) {
          setIsSeen(true);
        }

        if (seenTvDoc.exists()) {
          const tvData = seenTvDoc.data() as TVShow;
          const episodesSaved = tvData.watchedEpisodes || {};
          setWatchedEpisodes(episodesSaved);
          if (Object.keys(episodesSaved).length > 0) {
            setIsSeen(true);
          }
        }

        const omdbResData: MovieDetails | OmdbErrorResponse =
          await omdbRes.json();
        const whatsonResData = await whatsonRes.json();
        const whatsonItem: WhatsOnItem | undefined =
          whatsonResData.results?.[0];
        const omdbData =
          omdbResData.Response === "True"
            ? (omdbResData as MovieDetails)
            : null;

        // Resolve series episodes if series
        let allEpisodes: SeriesEpisode[] = [];
        if (whatsonItem?.episodes_details && whatsonItem.episodes_details.length > 0) {
          allEpisodes = whatsonItem.episodes_details.map((ep) => ({
            season: ep.season,
            episode: ep.episode,
            title: ep.title,
            description: ep.description,
            id: ep.id,
            release_date: ep.release_date,
            users_rating: ep.users_rating,
            users_rating_count: ep.users_rating_count,
            url: ep.url,
          }));
        }

        const isSeriesType =
          whatsonItem?.item_type === "tvshow" || omdbData?.Type === "series";

        if (isSeriesType && allEpisodes.length === 0 && omdbData?.totalSeasons) {
          const totalS = parseInt(omdbData.totalSeasons, 10);
          if (totalS > 0 && totalS <= 50) {
            try {
              const seasonFetches = [];
              for (let s = 1; s <= totalS; s++) {
                seasonFetches.push(
                  fetch(
                    `https://www.omdbapi.com/?apikey=${apiKeyOMDB}&i=${id}&season=${s}`,
                    { signal: controller.signal },
                  )
                    .then((r) => r.json())
                    .catch(() => null),
                );
              }
              const seasonResults = await Promise.all(seasonFetches);
              for (const sr of seasonResults) {
                if (sr && sr.Response === "True" && Array.isArray(sr.Episodes)) {
                  const sNum = parseInt(sr.Season, 10);
                  for (const ep of sr.Episodes) {
                    allEpisodes.push({
                      season: sNum,
                      episode: parseInt(ep.Episode, 10) || 0,
                      title: ep.Title,
                      id: ep.imdbID,
                      release_date: ep.Released,
                      users_rating:
                        ep.imdbRating && ep.imdbRating !== "N/A"
                          ? parseFloat(ep.imdbRating)
                          : undefined,
                    });
                  }
                }
              }
            } catch (e) {
              console.error("Error fetching OMDb seasons:", e);
            }
          }
        }

        if (isMounted) {
          if (whatsonItem) {
            // Priority: WhatsOn. Integrating Plot and Actors from OMDb if available.
            const hybrid: MovieDetails = {
              Title:
                (whatsonItem.original_title.toLowerCase() ===
                whatsonItem.title.toLowerCase()
                  ? whatsonItem.original_title
                  : whatsonItem.original_title +
                    " - (" +
                    whatsonItem.title +
                    ")") ||
                omdbData?.Title ||
                "N/A",
              Year:
                (whatsonItem.release_date
                  ? whatsonItem.release_date.split("-")[0]
                  : omdbData?.Year) || "N/A",
              Rated: omdbData?.Rated || "N/A",
              Released: whatsonItem.release_date || omdbData?.Released || "N/A",
              Runtime:
                (whatsonItem.runtime
                  ? `${whatsonItem.runtime / 60} min`
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
              totalSeasons:
                omdbData?.totalSeasons ||
                (whatsonItem.seasons_number
                  ? String(whatsonItem.seasons_number)
                  : undefined),
            };
            setMovie({ ...hybrid, whatson: whatsonItem, episodes: allEpisodes });
          } else if (omdbData) {
            // Fallback: OMDb
            setMovie({ ...omdbData, whatson: undefined, episodes: allEpisodes });
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

  const fromMinStringToSecond = (runtime: string): number => {
    const minutes = Number(runtime.replace(" min", ""));
    return isNaN(minutes) ? 0 : minutes * 60;
  };

  const handleToggleMovieSeen = async () => {
    if (!movie || !id || toggling) return;
    setToggling(true);

    try {
      const docRef = doc(db, "movies", id);

      if (isSeen) {
        await deleteDoc(docRef);
        setIsSeen(false);
      } else {
        const movieToSave: Movie = {
          imdbID: id,
          Title: movie.Title,
          Poster: movie.Poster,
          Type: movie.Type,
          Year: movie.Year.includes("-") ? movie.Year : movie.Year + "-01-01",
          Runtime:
            typeof movie.Runtime === "string"
              ? fromMinStringToSecond(movie.Runtime)
              : movie.Runtime,
          Genres: movie.Genre ? movie.Genre.split(", ") : [],
          WatchedAt: new Date().toISOString(),
        };
        await setDoc(docRef, movieToSave);
        setIsSeen(true);
      }
    } catch (err) {
      console.error("Error toggling movie seen status:", err);
    } finally {
      setToggling(false);
    }
  };

  const saveTvShowToFirestore = async (
    updatedEpisodes: Record<string, WatchedEpisodeInfo>,
  ) => {
    if (!movie || !id) return;
    const tvDocRef = doc(db, "tvshows", id);
    const watchedKeys = Object.keys(updatedEpisodes);

    if (watchedKeys.length === 0) {
      await deleteDoc(tvDocRef);
      setIsSeen(false);
      setWatchedEpisodes({});
      return;
    }

    const eps = movie.episodes || [];
    const totalEpisodesCount = eps.length > 0 ? eps.length : watchedKeys.length;

    const seasonsMap = eps.reduce((acc, ep) => {
      if (!acc[ep.season]) acc[ep.season] = [];
      acc[ep.season].push(ep);
      return acc;
    }, {} as Record<number, SeriesEpisode[]>);

    const watchedSeasons: number[] = [];
    Object.entries(seasonsMap).forEach(([sNum, sEps]) => {
      const isSeasonComplete =
        sEps.length > 0 &&
        sEps.every((e) => !!updatedEpisodes[`${e.season}_${e.episode}`]);
      if (isSeasonComplete) {
        watchedSeasons.push(Number(sNum));
      }
    });

    const seasonsCount =
      movie.whatson?.seasons_number ||
      (movie.totalSeasons ? parseInt(movie.totalSeasons, 10) : Object.keys(seasonsMap).length) ||
      1;

    const getResolvedStatus = (): string => {
      const rawStatus = (movie.whatson?.status || "").trim();
      const lowerStatus = rawStatus.toLowerCase();

      if (
        lowerStatus === "ongoing" ||
        lowerStatus === "continuing" ||
        lowerStatus === "in progress"
      ) {
        return "Ongoing";
      }
      if (lowerStatus === "ended" || lowerStatus === "finished") {
        return "Ended";
      }
      if (
        lowerStatus === "canceled" ||
        lowerStatus === "cancelled" ||
        lowerStatus === "pilot"
      ) {
        return "Canceled";
      }
      if (rawStatus) {
        return rawStatus;
      }

      return "Unknown";
    };

    const seriesStatus = getResolvedStatus();

    const tvShowToSave: TVShow = {
      imdbID: id,
      Title: movie.Title,
      Poster: movie.Poster,
      Type: "series",
      Year: movie.Year.includes("-") ? movie.Year : movie.Year + "-01-01",
      Runtime:
        typeof movie.Runtime === "string"
          ? fromMinStringToSecond(movie.Runtime)
          : movie.Runtime,
      Genres: movie.Genre ? movie.Genre.split(", ") : [],
      WatchedAt: new Date().toISOString(),
      totalSeasons: seasonsCount,
      totalEpisodes: totalEpisodesCount,
      watchedEpisodes: updatedEpisodes,
      watchedEpisodesCount: watchedKeys.length,
      watchedSeasons,
      status: seriesStatus,
    };

    await setDoc(tvDocRef, tvShowToSave);
    setWatchedEpisodes(updatedEpisodes);
    setIsSeen(true);
  };

  const handleToggleEpisode = async (ep: SeriesEpisode) => {
    if (!movie || !id || toggling) return;
    setToggling(true);
    const key = `${ep.season}_${ep.episode}`;
    const next = { ...watchedEpisodes };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = {
        season: ep.season,
        episode: ep.episode,
        title: ep.title,
        watchedAt: new Date().toISOString(),
      };
    }
    try {
      await saveTvShowToFirestore(next);
    } catch (err) {
      console.error("Error toggling episode:", err);
    } finally {
      setToggling(false);
    }
  };

  const handleToggleSeason = async (
    seasonEpisodes: SeriesEpisode[],
  ) => {
    if (!movie || !id || toggling) return;
    setToggling(true);
    const allSeasonWatched =
      seasonEpisodes.length > 0 &&
      seasonEpisodes.every(
        (ep) => !!watchedEpisodes[`${ep.season}_${ep.episode}`],
      );

    const next = { ...watchedEpisodes };
    if (allSeasonWatched) {
      seasonEpisodes.forEach((ep) => {
        delete next[`${ep.season}_${ep.episode}`];
      });
    } else {
      const now = new Date().toISOString();
      seasonEpisodes.forEach((ep) => {
        const key = `${ep.season}_${ep.episode}`;
        if (!next[key]) {
          next[key] = {
            season: ep.season,
            episode: ep.episode,
            title: ep.title,
            watchedAt: now,
          };
        }
      });
    }

    try {
      await saveTvShowToFirestore(next);
    } catch (err) {
      console.error("Error toggling season:", err);
    } finally {
      setToggling(false);
    }
  };

  const handleToggleAllSeries = async () => {
    if (!movie || !id || toggling) return;
    setToggling(true);
    const eps = movie.episodes || [];

    const isAllWatched =
      eps.length > 0 &&
      eps.every((ep) => !!watchedEpisodes[`${ep.season}_${ep.episode}`]);

    try {
      if (isAllWatched) {
        await saveTvShowToFirestore({});
      } else {
        const next: Record<string, WatchedEpisodeInfo> = {};
        const now = new Date().toISOString();
        if (eps.length > 0) {
          eps.forEach((ep) => {
            next[`${ep.season}_${ep.episode}`] = {
              season: ep.season,
              episode: ep.episode,
              title: ep.title,
              watchedAt: now,
            };
          });
        } else {
          next["1_1"] = {
            season: 1,
            episode: 1,
            title: "Series Completed",
            watchedAt: now,
          };
        }
        await saveTvShowToFirestore(next);
      }
    } catch (err) {
      console.error("Error toggling all series:", err);
    } finally {
      setToggling(false);
    }
  };

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
  const getFallback = (value: string | null, placeholder: string = "-") => {
    if (value && value !== "N/A") return value;
    return placeholder;
  };

  const title = getFallback(movie.Title, "Title Unknown");
  const poster = getFallback(movie.Poster || "N/A", "N/A");
  const year = getFallback(movie.Year);
  const runtime = getFallback(movie.Runtime);
  const isPlaceholder = poster === "N/A" || imgError;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-10 transition-colors group cursor-pointer"
      >
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">
          Back
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

          {/* Seen Toggle Button */}
          {movie.Type === "movie" ? (
            <button
              onClick={handleToggleMovieSeen}
              disabled={toggling}
              className={`w-full py-4 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer ${
                isSeen
                  ? "bg-green-600/10 text-green-500 border border-green-600/20 hover:bg-green-600 hover:text-white"
                  : "bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-600/20"
              }`}
            >
              {toggling ? (
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
              ) : isSeen ? (
                <>
                  <CheckCircleIconSolid className="w-5 h-5" />
                  Seen
                </>
              ) : (
                <>
                  <PlusCircleIcon className="w-5 h-5" />
                  Mark as seen
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              {(() => {
                const eps = movie.episodes || [];
                const watchedCount = Object.keys(watchedEpisodes).length;
                const totalCount = eps.length;
                const isAllWatched = totalCount > 0 && watchedCount >= totalCount;
                const isPartiallyWatched = watchedCount > 0 && !isAllWatched;

                return (
                  <button
                    onClick={handleToggleAllSeries}
                    disabled={toggling}
                    className={`w-full py-4 rounded-lg font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer ${
                      isAllWatched
                        ? "bg-green-600/10 text-green-500 border border-green-600/20 hover:bg-red-600 hover:text-white"
                        : isPartiallyWatched
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-green-600 hover:text-white"
                          : "bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-600/20"
                    }`}
                  >
                    {toggling ? (
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
                    ) : isAllWatched ? (
                      <>
                        <CheckCircleIconSolid className="w-5 h-5 text-green-500" />
                        <span>Completed ({watchedCount}/{totalCount})</span>
                      </>
                    ) : isPartiallyWatched ? (
                      <>
                        <CheckCircleIconSolid className="w-5 h-5 text-amber-500" />
                        <span>Seen ({watchedCount}/{totalCount}) • Mark all</span>
                      </>
                    ) : (
                      <>
                        <PlusCircleIcon className="w-5 h-5" />
                        <span>Mark all as seen</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
          )}

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

          {/* Series Specific Info */}
          {movie.Type === "series" && (
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
                        movie.whatson?.status === "Ended"
                          ? "text-zinc-500"
                          : movie.whatson?.status === "Canceled"
                            ? "text-red-500"
                            : movie.whatson?.status === "Ongoing"
                              ? "text-green-500"
                              : "text-zinc-400"
                      }`}
                    >
                      {movie.whatson?.status === "Ended"
                        ? "Ended"
                        : movie.whatson?.status === "Ongoing"
                          ? "Ongoing"
                          : movie.whatson?.status || "Unknown"}
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
                      {movie.whatson?.seasons_number ||
                        movie.totalSeasons ||
                        (movie.episodes?.length
                          ? Math.max(...movie.episodes.map((e) => e.season))
                          : "N/A")}
                    </span>
                  </div>
                </div>
              </div>

              {Array.isArray(movie.episodes) && movie.episodes.length > 0 ? (
                <div className="pt-6 border-t border-zinc-800 space-y-6">
                  {/* Progress Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs text-zinc-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <ListBulletIcon className="w-4 h-4 text-red-600" />{" "}
                        Series Structure & Progress
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Select seasons or individual episodes to track your watch history
                      </p>
                    </div>
                    {(() => {
                      const totalEp = movie.episodes.length;
                      const watchedEp = movie.episodes.filter(
                        (e) => !!watchedEpisodes[`${e.season}_${e.episode}`],
                      ).length;
                      const percent =
                        totalEp > 0
                          ? Math.round((watchedEp / totalEp) * 100)
                          : 0;
                      return (
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-green-500 h-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-zinc-300">
                            {watchedEp}/{totalEp} ({percent}%)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-3">
                    {Object.entries(
                      movie.episodes.reduce(
                        (acc, ep) => {
                          const s = ep.season;
                          if (!acc[s]) acc[s] = [];
                          acc[s].push(ep);
                          return acc;
                        },
                        {} as Record<number, SeriesEpisode[]>,
                      ),
                    )
                      .sort(([aS], [bS]) => Number(aS) - Number(bS))
                      .map(([season, episodes]) => {
                        const seasonWatchedCount = episodes.filter(
                          (ep) => !!watchedEpisodes[`${ep.season}_${ep.episode}`],
                        ).length;
                        const isSeasonComplete =
                          episodes.length > 0 &&
                          seasonWatchedCount === episodes.length;

                        return (
                          <details
                            key={season}
                            className={`group/season bg-zinc-950/40 rounded-xl border transition-all ${
                              isSeasonComplete
                                ? "border-green-600/30"
                                : seasonWatchedCount > 0
                                  ? "border-amber-500/30"
                                  : "border-zinc-800/50"
                            }`}
                          >
                            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-zinc-900/50 list-none">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                    isSeasonComplete
                                      ? "bg-green-600/10 border-green-600/30 text-green-500 font-black text-xs"
                                      : seasonWatchedCount > 0
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-black text-xs"
                                        : "bg-red-600/10 border-red-600/20 text-red-500 font-black text-xs"
                                  }`}
                                >
                                  {season}
                                </div>
                                <div>
                                  <span className="text-sm font-black text-zinc-200 uppercase tracking-widest">
                                    Season {season}
                                  </span>
                                  {isSeasonComplete ? (
                                    <span className="ml-3 text-[10px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                      <CheckCircleIconSolid className="w-3 h-3" /> Completed
                                    </span>
                                  ) : seasonWatchedCount > 0 ? (
                                    <span className="ml-3 text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                      {seasonWatchedCount}/{episodes.length} seen
                                    </span>
                                  ) : (
                                    <span className="ml-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                      {episodes.length} Episodes
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleToggleSeason(episodes);
                                  }}
                                  disabled={toggling}
                                  className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    isSeasonComplete
                                      ? "bg-zinc-800 text-zinc-400 hover:bg-red-950/40 hover:text-red-400 border border-zinc-700 hover:border-red-800"
                                      : "bg-green-600/10 text-green-400 hover:bg-green-600 hover:text-white border border-green-600/30"
                                  }`}
                                >
                                  {isSeasonComplete ? "Unmark Season" : "Mark Season"}
                                </button>
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
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 w-10">
                                      Status
                                    </th>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 w-14">
                                      N°
                                    </th>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50">
                                      Title
                                    </th>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 text-right w-24">
                                      Rating
                                    </th>
                                    <th className="py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800/50 text-right w-28">
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/20">
                                  {episodes
                                    .sort((a, b) => a.episode - b.episode)
                                    .map((ep) => {
                                      const key = `${ep.season}_${ep.episode}`;
                                      const isEpWatched = !!watchedEpisodes[key];
                                      const epWatchedInfo = watchedEpisodes[key];

                                      return (
                                        <tr
                                          key={ep.id || `${ep.season}-${ep.episode}`}
                                          className={`hover:bg-zinc-900/60 transition-colors group/ep ${
                                            isEpWatched ? "bg-green-950/15" : ""
                                          }`}
                                        >
                                          <td className="py-3">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleEpisode(ep)}
                                              disabled={toggling}
                                              title={isEpWatched ? "Mark unseen" : "Mark seen"}
                                              className="cursor-pointer transition-transform active:scale-90"
                                            >
                                              {isEpWatched ? (
                                                <CheckCircleIconSolid className="w-5 h-5 text-green-500" />
                                              ) : (
                                                <CheckCircleIcon className="w-5 h-5 text-zinc-600 hover:text-green-400 transition-colors" />
                                              )}
                                            </button>
                                          </td>
                                          <td className="py-3">
                                            <span
                                              className={`text-[10px] font-black transition-colors ${
                                                isEpWatched
                                                  ? "text-green-500"
                                                  : "text-zinc-500 group-hover/ep:text-red-500"
                                              }`}
                                            >
                                              #{ep.episode}
                                            </span>
                                          </td>
                                          <td className="py-3">
                                            <span
                                              className={`text-xs font-bold transition-colors ${
                                                isEpWatched
                                                  ? "text-green-300"
                                                  : "text-zinc-300 group-hover/ep:text-white"
                                              }`}
                                            >
                                              {ep.title}
                                            </span>
                                            {isEpWatched && epWatchedInfo?.watchedAt && (
                                              <span className="block text-[9px] text-zinc-500 font-medium">
                                                Seen on{" "}
                                                {new Date(
                                                  epWatchedInfo.watchedAt,
                                                ).toLocaleDateString()}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <StarIconSolid className="w-3 h-3 text-yellow-500" />
                                              <span className="text-[11px] font-black text-zinc-400 group-hover/ep:text-white">
                                                {ep.users_rating
                                                  ? ep.users_rating.toFixed(1)
                                                  : "-"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-3 text-right">
                                            <button
                                              type="button"
                                              onClick={() => handleToggleEpisode(ep)}
                                              disabled={toggling}
                                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                                isEpWatched
                                                  ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-red-950/40 hover:text-red-400 hover:border-red-900"
                                                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-green-600 hover:text-white hover:border-green-600"
                                              }`}
                                            >
                                              {isEpWatched ? "Seen ✓" : "+ Mark"}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="pt-6 border-t border-zinc-800 text-zinc-500 text-xs">
                  No individual episodes structure available for this series. You can still mark it as seen using the button on the left.
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
              {getFallback(movie.Plot, "Plot not available.")}
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
