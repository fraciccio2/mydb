/*
import {
  collection,
  doc,
  setDoc,
  getDocs,
  limit,
  query,
} from "firebase/firestore";
import { db } from "./firebase";
import moviesData from "./assets/file_ridotto.json";

export const migrateDataToFirestore = async () => {
  try {
    const moviesCol = collection(db, "movies");

    // Check if movies already migrated
    const qMovies = query(moviesCol, limit(1));
    const movieSnap = await getDocs(qMovies);

    if (movieSnap.empty) {
      console.log("Starting movie migration...");
      for (const movie of moviesData) {
        if (movie.imdbID) {
          const docRef = doc(db, "movies", movie.imdbID);
          await setDoc(docRef, {
            ...movie,
            Poster: movie.Poster || "N/A",
            Runtime: movie.Runtime || 0,
            Genres: movie.Genres || [],
          });
        }
      }
      console.log("Movie migration completed!");
    } else {
      console.log("Movies already migrated.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
  }
};
*/
