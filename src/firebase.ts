import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { config } from "./config";

const app = initializeApp(config.firebase);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Ensure persistent session across browser restarts (remains logged in until explicit logout)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});
