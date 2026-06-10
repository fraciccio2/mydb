import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Search from './pages/Search'
import Seen from './pages/Seen'

function App() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-red-600 border-b-2 border-red-600' : 'text-zinc-400 hover:text-zinc-100';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <nav className="bg-zinc-950/95 border-b border-zinc-900 sticky top-0 z-10 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <span className="font-black text-2xl tracking-tighter text-red-600">MYDB</span>
            </div>
            <div className="flex gap-8 h-full">
              <Link 
                to="/" 
                className={`flex items-center px-1 pt-1 text-sm font-bold transition-colors ${isActive('/')}`}
              >
                Cerca
              </Link>
              <Link 
                to="/seen" 
                className={`flex items-center px-1 pt-1 text-sm font-bold transition-colors ${isActive('/seen')}`}
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
