import { useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/useAuth";
import type { MydbBackupData, Movie, TVShow, WatchlistItem } from "../types";
import {
  parseExternalCsv,
  enrichExternalItem,
  type ParsedCsvResult,
  type RawImportItem,
} from "../services/externalImport";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CircleStackIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FilmIcon,
  TvIcon,
  BookmarkIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DataBackupModal({
  isOpen,
  onClose,
}: DataBackupModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState("");
  const [currentStats, setCurrentStats] = useState<{
    movies: number;
    tvshows: number;
    watchlist: number;
  }>({ movies: 0, tvshows: 0, watchlist: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"json" | "csv" | null>(null);

  // JSON Import Data
  const [parsedBackup, setParsedBackup] = useState<MydbBackupData | null>(null);

  // CSV Import Data
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvResult | null>(null);
  const [csvTarget, setCsvTarget] = useState<"seen" | "watchlist">("seen");
  const [currentProcessingTitle, setCurrentProcessingTitle] =
    useState<string>("");
  const [csvReport, setCsvReport] = useState<{
    imported: number;
    skipped: number;
    notFound: RawImportItem[];
  } | null>(null);

  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    processed: number;
    total: number;
  }>({ processed: 0, total: 0 });
  const [importSuccess, setImportSuccess] = useState(false);

  // Fetch current library stats when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;

    Promise.all([
      getDocs(collection(db, "users", user.uid, "movies")),
      getDocs(collection(db, "users", user.uid, "tvshows")),
      getDocs(collection(db, "users", user.uid, "watchlist")),
    ])
      .then(([moviesSnap, tvSnap, watchlistSnap]) => {
        if (!isMounted) return;
        setCurrentStats({
          movies: moviesSnap.size,
          tvshows: tvSnap.size,
          watchlist: watchlistSnap.size,
        });
      })
      .catch((err) => {
        console.error("Error fetching library stats:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isImporting && !isExporting) {
        onClose();
      }
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isImporting, isExporting]);

  if (!isOpen) return null;

  // 1. Export JSON Handler
  const handleExportBackup = async () => {
    if (!user || isExporting) return;

    setIsExporting(true);
    setExportError("");
    setExportSuccess(false);

    try {
      const [moviesSnap, tvSnap, watchlistSnap] = await Promise.all([
        getDocs(collection(db, "users", user.uid, "movies")),
        getDocs(collection(db, "users", user.uid, "tvshows")),
        getDocs(collection(db, "users", user.uid, "watchlist")),
      ]);

      const moviesList = moviesSnap.docs.map((d) => ({
        ...(d.data() as Movie),
        imdbID: d.id,
      }));

      const tvshowsList = tvSnap.docs.map((d) => ({
        ...(d.data() as TVShow),
        imdbID: d.id,
      }));

      const watchlistList = watchlistSnap.docs.map((d) => ({
        ...(d.data() as WatchlistItem),
        imdbID: d.id,
      }));

      const backup: MydbBackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        userEmail: user.email || undefined,
        stats: {
          moviesCount: moviesList.length,
          tvshowsCount: tvshowsList.length,
          watchlistCount: watchlistList.length,
        },
        movies: moviesList,
        tvshows: tvshowsList,
        watchlist: watchlistList,
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `mydb-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
    } catch (err) {
      console.error("Backup export failed:", err);
      setExportError(
        "Could not generate backup file. Please verify your connection.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Parse selected file (.json or .csv)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportError("");
    setImportSuccess(false);
    setParsedBackup(null);
    setParsedCsv(null);
    setCsvReport(null);

    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isJson = file.name.toLowerCase().endsWith(".json");

    if (!isCsv && !isJson) {
      setImportError(
        "Unsupported file format. Please upload a .json or .csv file.",
      );
      setSelectedFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (isJson) {
        setFileType("json");
        try {
          const parsed = JSON.parse(text);

          if (
            !parsed ||
            (!Array.isArray(parsed.movies) &&
              !Array.isArray(parsed.tvshows) &&
              !Array.isArray(parsed.watchlist))
          ) {
            throw new Error("Invalid MYDB backup schema.");
          }

          const validBackup: MydbBackupData = {
            version: parsed.version || 1,
            exportedAt: parsed.exportedAt || new Date().toISOString(),
            userEmail: parsed.userEmail,
            stats: {
              moviesCount: Array.isArray(parsed.movies)
                ? parsed.movies.length
                : 0,
              tvshowsCount: Array.isArray(parsed.tvshows)
                ? parsed.tvshows.length
                : 0,
              watchlistCount: Array.isArray(parsed.watchlist)
                ? parsed.watchlist.length
                : 0,
            },
            movies: Array.isArray(parsed.movies) ? parsed.movies : [],
            tvshows: Array.isArray(parsed.tvshows) ? parsed.tvshows : [],
            watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
          };

          setParsedBackup(validBackup);
        } catch (err) {
          console.error("JSON parsing error:", err);
          setImportError(
            "Invalid file. Please select a valid MYDB JSON backup file.",
          );
          setSelectedFile(null);
        }
      } else if (isCsv) {
        setFileType("csv");
        try {
          const result = parseExternalCsv(text);
          if (result.format === "unknown") {
            setImportError(
              "Unrecognized CSV format. Please upload an export file from Letterboxd (watched.csv, watchlist.csv) or IMDb (ratings.csv, lists.csv).",
            );
            setSelectedFile(null);
            return;
          }

          // Auto-detect target based on filename
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes("watchlist")) {
            setCsvTarget("watchlist");
          } else {
            setCsvTarget("seen");
          }

          setParsedCsv(result);
        } catch (err) {
          console.error("CSV parsing error:", err);
          setImportError(
            "Could not parse the CSV file. Please make sure it is a valid CSV.",
          );
          setSelectedFile(null);
        }
      }
    };

    reader.readAsText(file);
  };

  // 3A. Import & Restore JSON Backup
  const handleStartJsonImport = async () => {
    if (!user || !parsedBackup || isImporting) return;

    setIsImporting(true);
    setImportError("");
    setImportSuccess(false);

    const totalItems =
      parsedBackup.movies.length +
      parsedBackup.tvshows.length +
      parsedBackup.watchlist.length;

    setImportProgress({ processed: 0, total: totalItems });

    try {
      const CHUNK_SIZE = 400; // Safe margin below Firestore's 500 ops limit
      let currentProcessed = 0;

      // Import Movies
      for (let i = 0; i < parsedBackup.movies.length; i += CHUNK_SIZE) {
        const chunk = parsedBackup.movies.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          if (!item.imdbID) return;
          const ref = doc(db, "users", user.uid, "movies", item.imdbID);
          batch.set(ref, item, { merge: true });
        });
        await batch.commit();
        currentProcessed += chunk.length;
        setImportProgress({ processed: currentProcessed, total: totalItems });
      }

      // Import TV Shows
      for (let i = 0; i < parsedBackup.tvshows.length; i += CHUNK_SIZE) {
        const chunk = parsedBackup.tvshows.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          if (!item.imdbID) return;
          const ref = doc(db, "users", user.uid, "tvshows", item.imdbID);
          batch.set(ref, item, { merge: true });
        });
        await batch.commit();
        currentProcessed += chunk.length;
        setImportProgress({ processed: currentProcessed, total: totalItems });
      }

      // Import Watchlist
      for (let i = 0; i < parsedBackup.watchlist.length; i += CHUNK_SIZE) {
        const chunk = parsedBackup.watchlist.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          if (!item.imdbID) return;
          const ref = doc(db, "users", user.uid, "watchlist", item.imdbID);
          batch.set(ref, item, { merge: true });
        });
        await batch.commit();
        currentProcessed += chunk.length;
        setImportProgress({ processed: currentProcessed, total: totalItems });
      }

      setImportSuccess(true);
    } catch (err) {
      console.error("JSON restore failed:", err);
      setImportError(
        "An error occurred during restoration. Some items might not have been saved.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  // 3B. Import & Enrich External CSV (Letterboxd / IMDb)
  const handleStartCsvImport = async () => {
    if (!user || !parsedCsv || isImporting) return;

    setIsImporting(true);
    setImportError("");
    setImportSuccess(false);
    abortRef.current = false;

    const items = parsedCsv.items;
    const total = items.length;
    let importedCount = 0;
    let skippedCount = 0;
    const notFoundList: RawImportItem[] = [];

    setImportProgress({ processed: 0, total });

    try {
      const collectionName = csvTarget === "seen" ? "movies" : "watchlist";

      // 1. Fetch existing IDs in database to skip duplicates without wasting API calls
      const existingDocs = await getDocs(
        collection(db, "users", user.uid, collectionName),
      );
      const existingImdbIds = new Set(existingDocs.docs.map((d) => d.id));
      const existingTitleYears = new Set(
        existingDocs.docs.map((d) => {
          const data = d.data();
          const cleanT = (data.Title || "").toLowerCase().trim();
          const cleanY = (data.Year || "").split("-")[0];
          return `${cleanT}_${cleanY}`;
        }),
      );

      let batch = writeBatch(db);
      let batchOps = 0;

      // 2. Process in small concurrent batches (4 items at a time) to avoid browser freeze and rate limits
      const CONCURRENCY = 4;
      for (let i = 0; i < items.length; i += CONCURRENCY) {
        if (abortRef.current) break;

        const chunk = items.slice(i, i + CONCURRENCY);
        const enrichedResults = await Promise.all(
          chunk.map(async (rawItem) => {
            // Check if already in library
            if (rawItem.imdbId && existingImdbIds.has(rawItem.imdbId)) {
              return { status: "skipped" as const, rawItem, movieData: null };
            }
            const cleanT = rawItem.rawTitle.toLowerCase().trim();
            const cleanY = rawItem.year !== "N/A" ? rawItem.year : "";
            if (cleanY && existingTitleYears.has(`${cleanT}_${cleanY}`)) {
              return { status: "skipped" as const, rawItem, movieData: null };
            }

            // Set live status in UI
            setCurrentProcessingTitle(`${rawItem.rawTitle} (${rawItem.year})`);

            // Enrich via API (OMDb / WhatsOn)
            return await enrichExternalItem(rawItem, csvTarget);
          }),
        );

        for (const res of enrichedResults) {
          if (res.status === "skipped") {
            skippedCount++;
          } else if (
            res.status === "success" &&
            res.movieData &&
            res.movieData.imdbID
          ) {
            const docRef = doc(
              db,
              "users",
              user.uid,
              collectionName,
              res.movieData.imdbID,
            );
            batch.set(docRef, res.movieData, { merge: true });
            existingImdbIds.add(res.movieData.imdbID);
            batchOps++;
            importedCount++;

            // Commit batch when reaching 300 ops to stay safely under Firestore limits
            if (batchOps >= 300) {
              await batch.commit();
              batch = writeBatch(db);
              batchOps = 0;
            }
          } else {
            notFoundList.push(res.rawItem);
          }
        }

        setImportProgress({
          processed: Math.min(i + CONCURRENCY, total),
          total,
        });

        // Small 60ms pause to yield the UI thread and avoid rate-limiting
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      // Commit any remaining writes
      if (batchOps > 0) {
        await batch.commit();
      }

      setCsvReport({
        imported: importedCount,
        skipped: skippedCount,
        notFound: notFoundList,
      });

      setImportSuccess(true);
    } catch (err) {
      console.error("CSV Import failed:", err);
      setImportError(
        "An error occurred while importing. Please check your connection and retry.",
      );
    } finally {
      setIsImporting(false);
      setCurrentProcessingTitle("");
    }
  };

  const handleCancelImport = () => {
    abortRef.current = true;
  };

  const resetImportState = () => {
    setSelectedFile(null);
    setFileType(null);
    setParsedBackup(null);
    setParsedCsv(null);
    setCsvReport(null);
    setImportError("");
    setImportSuccess(false);
    setImportProgress({ processed: 0, total: 0 });
    setCurrentProcessingTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog Card */}
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/10 rounded-lg text-red-500 border border-red-600/20">
              <CircleStackIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Data <span className="text-red-600">Backup & Import</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                JSON backups, Letterboxd and IMDb imports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isImporting || isExporting}
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900/50 p-1.5 border-b border-zinc-800/80 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider ${
              activeTab === "export"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider ${
              activeTab === "import"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span>Restore / Import</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "export" ? (
            /* TAB 1: EXPORT BACKUP */
            <div className="space-y-6">
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl text-xs text-zinc-400 leading-relaxed">
                <p>
                  Download a complete snapshot of your entertainment library in{" "}
                  <strong className="text-white">JSON format</strong>. This
                  backup includes all your seen movies, tracked TV series with
                  watched episodes, and your watchlist.
                </p>
              </div>

              {/* Current Stats Summary */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2 block">
                  Current Database Contents
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl text-center">
                    <FilmIcon className="w-4 h-4 text-red-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-white block">
                      {loadingStats ? "…" : currentStats.movies}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      Movies
                    </span>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl text-center">
                    <TvIcon className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-white block">
                      {loadingStats ? "…" : currentStats.tvshows}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      TV Shows
                    </span>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl text-center">
                    <BookmarkIcon className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-white block">
                      {loadingStats ? "…" : currentStats.watchlist}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      Watchlist
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Alert */}
              {exportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-center gap-3 text-xs text-emerald-300 font-bold animate-fadeIn">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Backup downloaded successfully! Keep this file in a safe
                    place.
                  </span>
                </div>
              )}

              {exportError && (
                <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl flex items-center gap-3 text-xs text-red-300 font-bold animate-fadeIn">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting || loadingStats}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExporting ? (
                  <>
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
                    <span>Generating Backup...</span>
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* TAB 2: IMPORT / RESTORE BACKUP */
            <div className="space-y-6">
              <div className="bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-xl text-xs text-zinc-400 leading-relaxed">
                <p>
                  Import data from a <strong className="text-white">MYDB JSON backup</strong> or from external apps like{" "}
                  <strong className="text-white">Letterboxd (.csv)</strong> and{" "}
                  <strong className="text-white">IMDb (.csv)</strong>.
                </p>
              </div>

              {/* File Dropzone */}
              {!selectedFile && !importSuccess && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-800 hover:border-red-600/60 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-xl p-8 text-center cursor-pointer transition-all group"
                  >
                    <ArrowUpTrayIcon className="w-8 h-8 text-zinc-500 group-hover:text-red-500 mx-auto mb-2 transition-colors" />
                    <p className="text-xs font-bold text-white mb-1">
                      Click to choose a file (.json or .csv)
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Supports MYDB backups (.json), Letterboxd and IMDb exports (.csv)
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {importError && (
                <div className="bg-red-500/10 border border-red-500/30 p-3.5 rounded-xl flex items-center gap-3 text-xs text-red-300 font-bold animate-fadeIn">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* A. JSON FILE PREVIEW */}
              {fileType === "json" && parsedBackup && !importSuccess && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <DocumentCheckIcon className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-white truncate max-w-xs">
                        {selectedFile?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={resetImportState}
                      disabled={isImporting}
                      className="text-xs text-zinc-500 hover:text-red-400 font-bold cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                      <span className="text-sm font-black text-white block">
                        {parsedBackup.movies.length}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">
                        Movies
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                      <span className="text-sm font-black text-white block">
                        {parsedBackup.tvshows.length}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">
                        TV Shows
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                      <span className="text-sm font-black text-white block">
                        {parsedBackup.watchlist.length}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">
                        Watchlist
                      </span>
                    </div>
                  </div>

                  {parsedBackup.exportedAt && (
                    <p className="text-[11px] text-zinc-500">
                      Exported on:{" "}
                      <span className="text-zinc-400 font-medium">
                        {new Date(parsedBackup.exportedAt).toLocaleDateString()}{" "}
                        {new Date(parsedBackup.exportedAt).toLocaleTimeString()}
                      </span>
                    </p>
                  )}

                  {/* Progress Bar during Import */}
                  {isImporting && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Restoring documents...</span>
                        <span className="font-bold text-white">
                          {importProgress.processed} / {importProgress.total}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          style={{
                            width: `${
                              importProgress.total > 0
                                ? Math.round(
                                    (importProgress.processed /
                                      importProgress.total) *
                                      100,
                                  )
                                : 0
                            }%`,
                          }}
                          className="h-full bg-red-600 transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Start Import Button */}
                  <button
                    type="button"
                    onClick={handleStartJsonImport}
                    disabled={isImporting}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isImporting ? (
                      <>
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
                        <span>Restoring Data...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>
                          Restore{" "}
                          {parsedBackup.movies.length +
                            parsedBackup.tvshows.length +
                            parsedBackup.watchlist.length}{" "}
                          Items
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* B. CSV FILE PREVIEW (Letterboxd / IMDb) */}
              {fileType === "csv" && parsedCsv && !importSuccess && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          parsedCsv.format === "letterboxd"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {parsedCsv.format === "letterboxd"
                          ? "Letterboxd CSV"
                          : "IMDb CSV"}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-xs">
                        {selectedFile?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={resetImportState}
                      disabled={isImporting}
                      className="text-xs text-zinc-500 hover:text-red-400 font-bold cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Destination Selector: Seen vs Watchlist */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                      Import Destination
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCsvTarget("seen")}
                        disabled={isImporting}
                        className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          csvTarget === "seen"
                            ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                        }`}
                      >
                        <FilmIcon className="w-4 h-4" />
                        <span>Watched (Seen)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsvTarget("watchlist")}
                        disabled={isImporting}
                        className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          csvTarget === "watchlist"
                            ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/20"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                        }`}
                      >
                        <BookmarkIcon className="w-4 h-4" />
                        <span>Watchlist</span>
                      </button>
                    </div>
                  </div>

                  {/* Info Notice about format */}
                  <div className="bg-zinc-950/70 border border-zinc-800/80 p-3 rounded-lg flex items-start gap-2.5 text-[11px] text-zinc-400">
                    <InformationCircleIcon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      {parsedCsv.format === "imdb" ? (
                        <span>
                          <strong>IMDb IDs detected</strong>: Titles, years, runtimes, and genres will be imported with 100% precision.
                        </span>
                      ) : (
                        <span>
                          <strong>Letterboxd metadata enrichment</strong>: Each title and year will be matched automatically to retrieve posters, IMDb IDs, and genres.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats summary */}
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 flex justify-between items-center text-xs">
                    <span className="text-zinc-400">
                      Total titles found in CSV:
                    </span>
                    <span className="font-black text-white text-sm">
                      {parsedCsv.totalRows} titles
                    </span>
                  </div>

                  {/* Progress Bar during Import */}
                  {isImporting && (
                    <div className="space-y-2 pt-2 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
                          <ArrowPathIcon className="w-3.5 h-3.5 text-red-500 animate-spin" />
                          Processing titles...
                        </span>
                        <span className="font-black text-white">
                          {importProgress.processed} / {importProgress.total} (
                          {importProgress.total > 0
                            ? Math.round(
                                (importProgress.processed /
                                  importProgress.total) *
                                  100,
                              )
                            : 0}
                          %)
                        </span>
                      </div>

                      {/* Live Processing Title */}
                      {currentProcessingTitle && (
                        <p className="text-[11px] text-zinc-500 truncate italic">
                          Current: {currentProcessingTitle}
                        </p>
                      )}

                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          style={{
                            width: `${
                              importProgress.total > 0
                                ? Math.round(
                                    (importProgress.processed /
                                      importProgress.total) *
                                      100,
                                  )
                                : 0
                            }%`,
                          }}
                          className="h-full bg-red-600 transition-all duration-200"
                        />
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={handleCancelImport}
                          className="text-[11px] font-bold text-zinc-500 hover:text-red-400 cursor-pointer"
                        >
                          Stop Import
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Start CSV Import Button */}
                  {!isImporting && (
                    <button
                      type="button"
                      onClick={handleStartCsvImport}
                      className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>
                        Start Import ({parsedCsv.totalRows} titles to{" "}
                        {csvTarget === "seen" ? "Seen" : "Watchlist"})
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Success Result & Report */}
              {importSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl space-y-4 animate-fadeIn">
                  <div className="text-center space-y-2">
                    <CheckCircleIcon className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h4 className="text-sm font-bold text-white">
                      Import Completed!
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Your library has been successfully updated.
                    </p>
                  </div>

                  {/* CSV Specific Breakdown */}
                  {csvReport && (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs space-y-1.5 text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-emerald-400 font-bold">
                          ✓ Successfully imported:
                        </span>
                        <span className="font-black text-white">
                          {csvReport.imported} titles
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">
                          ⏭️ Skipped (already in library):
                        </span>
                        <span className="font-bold text-zinc-400">
                          {csvReport.skipped}
                        </span>
                      </div>
                      {csvReport.notFound.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-400">
                            ⚠️ Not found on database:
                          </span>
                          <span className="font-bold text-amber-300">
                            {csvReport.notFound.length}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* List of titles not found (if any) */}
                  {csvReport && csvReport.notFound.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-zinc-950/80 rounded-lg border border-zinc-800 text-[11px] text-zinc-400">
                      <span className="text-zinc-500 font-bold uppercase text-[9px] block">
                        Unmatched titles (can be added manually):
                      </span>
                      {csvReport.notFound.map((nf, i) => (
                        <div key={i} className="truncate">
                          • {nf.rawTitle} ({nf.year})
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetImportState();
                        onClose();
                      }}
                      className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-6 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
