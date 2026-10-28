import { useState, useRef, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Search from "./pages/Search";
import Seen from "./pages/Seen";
import Details from "./pages/Details";
import Login from "./pages/Login";
import logo from "./assets/logo.svg";
import { useAuth } from "./context/useAuth";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

function App() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const isActive = (path: string) => {
    return location.pathname === path
      ? "text-red-600 border-b-2 border-red-600"
      : "text-zinc-400 hover:text-zinc-100";
  };

  // Fullscreen loading splash while Firebase Auth initializes session
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <img src={logo} alt="MYDB Logo" className="h-12 w-auto animate-pulse" />
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    );
  }

  // If not authenticated, only the Login page is accessible
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <nav className="bg-zinc-950/95 border-b border-zinc-900 sticky top-0 z-10 shadow-lg backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left: Brand & Navigation */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <img
                  src={logo}
                  alt="MYDB Logo"
                  className="h-8 w-auto transition-transform group-hover:scale-105"
                />
                <span className="font-black text-2xl tracking-tighter text-red-600">
                  MYDB
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="flex gap-6 h-16">
                <Link
                  to="/"
                  className={`flex items-center px-1 pt-1 text-sm font-bold transition-colors ${isActive("/")}`}
                >
                  Search
                </Link>
                <Link
                  to="/seen"
                  className={`flex items-center px-1 pt-1 text-sm font-bold transition-colors ${isActive("/seen")}`}
                >
                  Seen
                </Link>
              </div>
            </div>

            {/* Right: User Profile Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 px-3 py-1.5 rounded-full transition-all cursor-pointer group"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User avatar"}
                    className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center font-black text-xs">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-bold text-zinc-300 max-w-[130px] truncate group-hover:text-white">
                  {user.displayName || user.email}
                </span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
                    isMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl shadow-black/80 p-2 z-50">
                  {/* User info summary */}
                  <div className="px-3 py-2.5 mb-1 bg-zinc-950/40 rounded-lg border border-zinc-800/40">
                    <p className="text-xs font-bold text-white truncate">
                      {user.displayName || "User"}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout().catch((e) => console.error(e));
                    }}
                    className="w-full flex items-center gap-2.5 text-xs font-bold text-zinc-400 hover:text-red-400 hover:bg-red-950/20 px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-red-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/seen" element={<Seen />} />
          <Route path="/movie/:id" element={<Details />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
