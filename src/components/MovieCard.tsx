import { useState } from 'react'
import { FilmIcon, TvIcon, QuestionMarkCircleIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline'
import type { Movie } from '../types'

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const isPlaceholder = movie.Poster === 'N/A' || imgError;

  const getTypeIcon = () => {
    switch (movie.Type) {
      case 'movie':
        return <FilmIcon className="w-4 h-4" />;
      case 'series':
        return <TvIcon className="w-4 h-4" />;
      case 'game':
        return <PuzzlePieceIcon className="w-4 h-4" />;
      default:
        return <QuestionMarkCircleIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-sky-500/50 transition-all hover:shadow-2xl hover:shadow-sky-500/10 flex flex-col h-full">
      {/* Poster Container */}
      <div className="aspect-[2/3] relative overflow-hidden bg-slate-900">
        {!isPlaceholder ? (
          <img
            src={movie.Poster}
            alt={movie.Title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-4">
            <FilmIcon className="w-12 h-12 mb-2 opacity-20" />
            <span className="text-xs uppercase tracking-wider font-semibold">No Poster</span>
          </div>
        )}
...

        {/* Overlay for Type and Year */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
           <span className="bg-slate-900/80 backdrop-blur-sm text-sky-400 p-1.5 rounded-lg border border-slate-700 shadow-lg">
             {getTypeIcon()}
           </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-bold text-slate-100 leading-tight line-clamp-2 group-hover:text-sky-400 transition-colors mb-1" title={movie.Title}>
            {movie.Title}
          </h3>
          <span className="text-slate-400 text-sm font-medium">{movie.Year}</span>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-3">
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded">
            {movie.Type}
          </span>
          {/* We'll add a "Mark as Seen" button here later */}
          <button className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors">
            Details →
          </button>
        </div>
      </div>
    </div>
  );
}

export default MovieCard;
