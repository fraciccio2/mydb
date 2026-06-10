import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Search from './pages/Search'
import Seen from './pages/Seen'

function App() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-100';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <span className="font-bold text-xl tracking-tight text-sky-400 uppercase">mydb</span>
            </div>
            <div className="flex gap-8 h-full">
              <Link 
                to="/" 
                className={`flex items-center px-1 pt-1 text-sm font-medium transition-colors ${isActive('/')}`}
              >
                Cerca
              </Link>
              <Link 
                to="/seen" 
                className={`flex items-center px-1 pt-1 text-sm font-medium transition-colors ${isActive('/seen')}`}
              >
                Visti
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/seen" element={<Seen />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
