import { useState } from "react";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo.svg";
import {
  FilmIcon,
  TvIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "auth/popup-closed-by-user"
      ) {
        setError("Access window was closed. Try again.");
      } else {
        setError(
          "An error occurred while signing in with Google. Please check your connection.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Background ambient red glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 sm:p-10 shadow-2xl shadow-black/80 text-center">
          {/* Logo & Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-red-600/20 blur-xl rounded-full"></div>
              <img
                src={logo}
                alt="MYDB Logo"
                className="h-16 w-auto relative z-10"
              />
            </div>
            <h1 className="font-black text-4xl tracking-tighter text-red-600 mb-2">
              MYDB
            </h1>
            <p className="text-zinc-400 text-sm font-medium">
              Your personal movie & TV series tracker
            </p>
          </div>

          {/* Quick Features List */}
          <div className="grid grid-cols-3 gap-2 py-4 mb-8 border-y border-zinc-800/60 text-center">
            <div className="flex flex-col items-center">
              <FilmIcon className="w-5 h-5 text-red-500 mb-1" />
              <span className="text-[11px] font-bold text-zinc-300">Movies</span>
            </div>
            <div className="flex flex-col items-center">
              <TvIcon className="w-5 h-5 text-red-500 mb-1" />
              <span className="text-[11px] font-bold text-zinc-300">Series</span>
            </div>
            <div className="flex flex-col items-center">
              <ClockIcon className="w-5 h-5 text-red-500 mb-1" />
              <span className="text-[11px] font-bold text-zinc-300">Stats</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-300 text-left">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-zinc-900" viewBox="0 0 24 24">
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
            ) : (
              <>
                {/* Official Google G Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
