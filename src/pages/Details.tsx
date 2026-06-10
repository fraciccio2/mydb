import {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  FilmIcon,
  GlobeAltIcon,
  StarIcon,
  TrophyIcon,
  UserIcon,
  PlayIcon,
  Squares2X2Icon,
  ListBulletIcon,
  HandThumbUpIcon,
  HandThumbDownIcon
} from '@heroicons/react/24/outline'
import {StarIcon as StarIconSolid} from '@heroicons/react/24/solid'
import type {MovieDetails, OmdbErrorResponse, HybridMovieDetails, WhatsOnItem} from '../types'

function Details() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<HybridMovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchHybridDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError('');
      setMovie(null);
      setImgError(false);
      
      try {
        const apiKeyOMDB = import.meta.env.VITE_OMDB_API_KEY
        const apiKeyWhatsON = import.meta.env.VITE_WHATS_ON_API_KEY

        // Parallel fetches
        const omdbPromise = fetch(`https://www.omdbapi.com/?apikey=${apiKeyOMDB}&i=${id}&plot=full`, {
          signal: controller.signal
        });

        const whatsonPromise = fetch(`https://whatson-api.onrender.com/?imdbId=${id}&api_key=${apiKeyWhatsON}`, {
          signal: controller.signal
        });

        const [omdbRes, whatsonRes] = await Promise.all([omdbPromise, whatsonPromise]);
        
        const omdbData: MovieDetails | OmdbErrorResponse = await omdbRes.json();
        const whatsonData = await whatsonRes.json();
        const whatsonItem: WhatsOnItem | undefined = whatsonData.results?.[0];
        
        if (isMounted) {
          if (omdbData.Response === 'True') {
            setMovie({ 
              ...(omdbData as MovieDetails),
              whatson: whatsonItem
            });
          } else if (whatsonItem) {
            // If OMDb fails but WhatsOn succeeded, we create a partial MovieDetails from WhatsOn
            const partialOmdb: MovieDetails = {
              Title: whatsonItem.title || 'N/A',
              Year: whatsonItem.release_date ? whatsonItem.release_date.split('-')[0] : 'N/A',
              Rated: 'N/A',
              Released: whatsonItem.release_date || 'N/A',
              Runtime: whatsonItem.runtime ? `${whatsonItem.runtime} min` : 'N/A',
              Genre: 'N/A',
              Director: 'N/A',
              Writer: 'N/A',
              Actors: 'N/A',
              Plot: 'N/A',
              Language: 'N/A',
              Country: 'N/A',
              Awards: 'N/A',
              Poster: whatsonItem.image || 'N/A',
              Ratings: [],
              Metascore: 'N/A',
              imdbRating: whatsonItem.imdb?.score ? whatsonItem.imdb.score.toString() : 'N/A',
              imdbVotes: whatsonItem.imdb?.votes ? whatsonItem.imdb.votes.toString() : 'N/A',
              imdbID: id,
              Type: whatsonItem.item_type === 'tvshow' ? 'series' : whatsonItem.item_type,
              BoxOffice: 'N/A',
              Production: 'N/A',
              Website: 'N/A',
              Response: 'True'
            };
            setMovie({ ...partialOmdb, whatson: whatsonItem });
          } else {
            setError('Titolo non trovato.');
          }
          setLoading(false)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        
        if (isMounted) {
          setError('Errore durante il caricamento. Riprova più tardi.')
          setLoading(false)
        }
        console.error(err)
      }
    };

    fetchHybridDetails().catch((e) => console.error(e));

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
        </div>
        <p className="text-red-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Ricerca dati...</p>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-lg inline-block">
          <p className="text-red-400 font-bold mb-6">{error || 'Si è verificato un errore imprevisto.'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-bold transition-all mx-auto uppercase text-xs tracking-widest"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Torna indietro
          </button>
        </div>
      </div>
    )
  }

  // Helper to prioritize WhatsOn data
  const getFallback = (whatsOnVal: string | undefined | null, omdbVal: string, placeholder: string = '-') => {
    if (whatsOnVal && whatsOnVal !== 'N/A') return whatsOnVal;
    if (omdbVal && omdbVal !== 'N/A') return omdbVal;
    return placeholder;
  };

  const title = getFallback(movie.whatson?.title, movie.Title, 'Titolo Sconosciuto');
  const poster = getFallback(movie.whatson?.image, movie.Poster, 'N/A');
  const year = getFallback(movie.whatson?.release_date?.split('-')[0], movie.Year);
  const runtime = getFallback(movie.whatson?.runtime ? `${movie.whatson.runtime} min` : null, movie.Runtime);
  const isPlaceholder = poster === 'N/A' || imgError;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 pb-24">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-10 transition-colors group"
      >
        <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Torna alla ricerca</span>
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
                <span className="text-xs uppercase tracking-widest font-black opacity-40">Nessuna locandina</span>
              </div>
            )}
            
            {/* Rating Badge */}
            <div className="absolute top-4 right-4 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 px-3 py-2 rounded-lg flex items-center gap-2">
              <StarIconSolid className="w-5 h-5 text-yellow-500" />
              <div className="flex flex-col">
                <span className="text-white font-black text-sm leading-none">
                  {movie.whatson?.ratings_average ? (movie.whatson.ratings_average * 2).toFixed(1) : (movie.imdbRating !== 'N/A' ? movie.imdbRating : 'N/A')}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase leading-none mt-1">/ 10</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col items-center text-center">
              <CalendarIcon className="w-5 h-5 text-red-500 mb-2" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Anno</span>
              <span className="text-sm font-bold text-white">{year}</span>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col items-center text-center">
              <ClockIcon className="w-5 h-5 text-red-500 mb-2" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Durata</span>
              <span className="text-sm font-bold text-white">{runtime}</span>
            </div>
          </div>

          {/* Where to Watch (WhatsOn Integration) */}
          {movie.whatson?.platforms_links && movie.whatson.platforms_links.length > 0 && (
            <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-lg space-y-4">
              <h4 className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <PlayIcon className="w-4 h-4" /> Dove guardarlo
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {movie.whatson.platforms_links.map((link) => (
                  <a 
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-3 rounded hover:border-red-600/50 transition-colors group/link"
                  >
                    <span className="text-xs font-bold text-zinc-300 group-hover/link:text-white">{link.name}</span>
                    <span className="text-[10px] uppercase font-black text-red-500">Play →</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Ratings Grid (Hybrid) */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg space-y-4">
            <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] border-b border-zinc-800 pb-3">Valutazioni</h4>
            <div className="space-y-4 pt-1">
              {movie.whatson?.letterboxd && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs font-medium">Letterboxd</span>
                  <span className="text-white text-xs font-black">{movie.whatson.letterboxd.score}/5</span>
                </div>
              )}
              {movie.whatson?.senscritique && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs font-medium">SensCritique</span>
                  <span className="text-white text-xs font-black">{movie.whatson.senscritique.score}/10</span>
                </div>
              )}
              {movie.Ratings.map((rating, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs font-medium">{rating.Source}</span>
                  <span className="text-white text-xs font-black">{rating.Value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Main Info */}
        <div className="lg:col-span-8 space-y-10">
          <header>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {movie.Genre.split(', ').map((g) => (
                <span key={g} className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full border border-zinc-700">
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
              {movie.Awards !== 'N/A' ? movie.Awards : 'Nessun premio registrato.'}
            </p>
          </header>

          {/* Series Specific Info (WhatsOn) */}
          {movie.Type === 'series' && movie.whatson && (
            <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-xl space-y-8">
              <div className="flex flex-wrap items-center gap-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600/10 rounded-lg">
                    <Squares2X2Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Status</span>
                    <span className={`text-sm font-black uppercase tracking-wider ${movie.whatson.status === 'Ended' ? 'text-zinc-400' : 'text-green-500'}`}>
                      {movie.whatson.status === 'Ended' ? 'Conclusa' : 'In Corso'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600/10 rounded-lg">
                    <ListBulletIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Stagioni</span>
                    <span className="text-sm font-black text-white">{movie.whatson.seasons_number || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {movie.whatson.episodes_stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-800">
                  {movie.whatson.episodes_stats.highest_rated && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-green-500 uppercase tracking-widest">
                        <HandThumbUpIcon className="w-4 h-4" /> Episodio Migliore
                      </div>
                      <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
                        <p className="text-white font-bold text-sm mb-1 truncate" title={movie.whatson.episodes_stats.highest_rated.title}>
                          {movie.whatson.episodes_stats.highest_rated.title}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                          <span>S{movie.whatson.episodes_stats.highest_rated.season_number} E{movie.whatson.episodes_stats.highest_rated.episode_number}</span>
                          <span className="text-green-500 font-black">Rating: {movie.whatson.episodes_stats.highest_rated.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {movie.whatson.episodes_stats.lowest_rated && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                        <HandThumbDownIcon className="w-4 h-4" /> Episodio Peggiore
                      </div>
                      <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
                        <p className="text-white font-bold text-sm mb-1 truncate" title={movie.whatson.episodes_stats.lowest_rated.title}>
                          {movie.whatson.episodes_stats.lowest_rated.title}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500">
                          <span>S{movie.whatson.episodes_stats.lowest_rated.season_number} E{movie.whatson.episodes_stats.lowest_rated.episode_number}</span>
                          <span className="text-red-500 font-black">Rating: {movie.whatson.episodes_stats.lowest_rated.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-8 h-px bg-red-600"></span>
              TRAMA
            </h3>
            <p className="text-zinc-300 leading-relaxed text-lg font-light">
              {getFallback(null, movie.Plot, 'Trama non disponibile.')}
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-red-600" /> Cast Tecnico
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Regia</span>
                    <span className="text-white font-medium">{getFallback(null, movie.Director)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Sceneggiatura</span>
                    <span className="text-white font-medium">{getFallback(null, movie.Writer)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Produzione</span>
                    <span className="text-white font-medium">{getFallback(null, movie.Production)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <GlobeAltIcon className="w-4 h-4 text-red-600" /> Informazioni Extra
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Lingue</span>
                    <span className="text-white font-medium">{getFallback(null, movie.Language)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Paese</span>
                    <span className="text-white font-medium">{getFallback(null, movie.Country)}</span>
                  </div>
                  {movie.BoxOffice !== 'N/A' && (
                    <div>
                      <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Incassi</span>
                      <span className="text-white font-medium">{movie.BoxOffice}</span>
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
                  <StarIcon className="w-4 h-4 text-red-600" /> Interpreti Principali
                </h3>
                <div className="space-y-4 relative z-10">
                  {movie.Actors !== 'N/A' ? movie.Actors.split(', ').map((actor) => (
                    <div key={actor} className="flex items-center gap-3 group/actor">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full group-hover/actor:scale-150 transition-transform"></div>
                      <span className="text-zinc-200 font-medium group-hover/actor:text-white transition-colors">{actor}</span>
                    </div>
                  )) : <span className="text-zinc-500 italic text-sm">Informazioni non disponibili</span>}
                </div>

                <div className="mt-8 pt-8 border-t border-zinc-800">
                   <div className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors cursor-default">
                     <TrophyIcon className="w-5 h-5 text-red-600" />
                     <span className="text-xs font-bold uppercase tracking-widest">IMDb ID: {movie.imdbID}</span>
                   </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Details
