import { useState, useRef, useCallback } from 'react'
import type { OmdbSearchResponse, MovieType, Movie } from '../types'
import MovieCard from '../components/MovieCard'

function Search() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MovieType>('')
  const [year, setYear] = useState('')
  
  // State for movies and pagination
  const [movies, setMovies] = useState<Movie[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const observer = useRef<IntersectionObserver | null>(null)

  const fetchMovies = useCallback(async (pageNum: number, isNewSearch: boolean) => {
    if (!title.trim()) return

    if (isNewSearch) {
      setLoading(true)
      setMovies([])
      setPage(1)
    } else {
      setLoadingMore(true)
    }
    
    setError('')

    try {
      const apiKey = import.meta.env.VITE_OMDB_API_KEY
      let url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${title}&page=${pageNum}`
      
      if (type) url += `&type=${type}`
      if (year) url += `&y=${year}`

      const response = await fetch(url)
      const data: OmdbSearchResponse = await response.json()
      
      if (data.Response === 'True' && data.Search) {
        if (isNewSearch) {
          setMovies(data.Search)
          setTotalResults(parseInt(data.totalResults || '0'))
        } else {
          setMovies(prev => [...prev, ...data.Search!])
        }
        setPage(pageNum)
      } else {
        if (isNewSearch) {
          setError(data.Error || 'Nessun risultato trovato')
          setTotalResults(0)
        }
      }
    } catch (err) {
      setError('Errore durante la ricerca. Riprova più tardi.')
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [title, type, year])

  const lastMovieElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return
    if (observer.current) observer.current.disconnect()

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && movies.length < totalResults) {
        fetchMovies(page + 1, false)
      }
    })

    if (node) observer.current.observe(node)
  }, [loading, loadingMore, movies.length, totalResults, page, fetchMovies])

  const handleSearch = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    fetchMovies(1, true)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 pb-20">
      <header className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-sky-400 mb-2 tracking-tight">Esplora il database</h2>
        <p className="text-slate-400">Trova i tuoi prossimi film e serie TV preferiti</p>
      </header>

      <form onSubmit={handleSearch} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl mb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Titolo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Batman, Stranger Things..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none text-white transition-all placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MovieType)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none text-white transition-all appearance-none cursor-pointer"
            >
              <option value="">Tutti</option>
              <option value="movie">Film</option>
              <option value="series">Serie TV</option>
              <option value="game">Gioco</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Anno</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="E.g. 2024"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500 outline-none text-white transition-all placeholder:text-slate-600"
            />
          </div>
          <div className="md:col-span-4 flex justify-center mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto min-w-[200px] bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-sky-500/25 active:scale-[0.97] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ricerca in corso...
                </>
              ) : 'Avvia Ricerca'}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-12 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {movies.length > 0 && (
        <div className="space-y-8">
          <div className="flex justify-between items-end border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-2xl font-bold text-white">Risultati</h3>
              <p className="text-slate-500 text-sm">Mostrando {movies.length} di {totalResults} titoli</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {movies.map((movie, index) => {
              if (movies.length === index + 1) {
                return (
                  <div ref={lastMovieElementRef} key={`${movie.imdbID}-${index}`}>
                    <MovieCard movie={movie} />
                  </div>
                )
              } else {
                return <MovieCard key={`${movie.imdbID}-${index}`} movie={movie} />
              }
            })}
          </div>

          {loadingMore && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"></div>
              </div>
              <p className="text-sky-500 font-semibold text-sm animate-pulse">Caricamento altri titoli...</p>
            </div>
          )}

          {!loadingMore && movies.length >= totalResults && totalResults > 0 && (
            <div className="text-center py-12 text-slate-500 text-sm italic border-t border-slate-800 mt-8">
              Hai visualizzato tutti i risultati disponibili per questa ricerca.
            </div>
          )}
        </div>
      )}

      {movies.length === 0 && !loading && !error && (
        <div className="text-center py-32 bg-slate-800/20 border-2 border-dashed border-slate-800 rounded-3xl">
          <div className="text-5xl mb-4 opacity-20">🔍</div>
          <p className="text-slate-500 font-medium">I tuoi risultati appariranno qui...</p>
          <p className="text-slate-600 text-sm mt-1">Cerca un film o una serie TV per iniziare</p>
        </div>
      )}
    </div>
  )
}

export default Search
