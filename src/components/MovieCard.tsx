import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FilmIcon,
  TvIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import type { Movie } from "../types";

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const isPlaceholder = !movie.Poster || movie.Poster === "N/A" || imgError;

  const getTypeLabel = () => {
    switch (movie.Type) {
      case "movie":
        return { label: "Film", icon: <FilmIcon className="w-3 h-3" /> };
      case "series":
        return { label: "TV series", icon: <TvIcon className="w-3 h-3" /> };
      default:
        return {
          label: movie.Type,
          icon: <QuestionMarkCircleIcon className="w-3 h-3" />,
        };
    }
  };

  const typeInfo = getTypeLabel();

  return (
    <Link
      to={`/movie/${movie.imdbID}`}
      className="group bg-zinc-900 rounded-md overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-black/80 flex flex-col h-full relative border border-zinc-800/50 hover:border-zinc-700"
    >
      {/* Poster Container */}
      <div className="aspect-2/3 relative overflow-hidden bg-zinc-950">
        {!isPlaceholder ? (
          <img
            src={movie.Poster}
            alt={movie.Title}
            className="w-full h-full object-cover transition-transform duration-500"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 p-4">
            <FilmIcon className="w-12 h-12 mb-2 opacity-20" />
            <span className="text-[10px] uppercase tracking-widest font-black opacity-40 text-center">
              No poster
            </span>
          </div>
        )}

        {/* Gradient Bottom Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 bg-zinc-900">
        <div className="flex-1">
          <h3
            className="font-bold text-white leading-snug line-clamp-2 group-hover:text-red-500 transition-colors mb-2 text-sm"
            title={movie.Title}
          >
            {movie.Title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-400 text-xs font-semibold">
              {movie.Year}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
              {typeInfo.icon}
              {typeInfo.label}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end border-t border-zinc-800/50 pt-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-red-500 transition-colors">
            Details →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default MovieCard;
