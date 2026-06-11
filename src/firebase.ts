import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDhZaEOd_-IhaWsunN_ZAW6WxEAV1Ghs_I",
  authDomain: "mydb-app-67786.firebaseapp.com",
  projectId: "mydb-app-67786",
  storageBucket: "mydb-app-67786.firebasestorage.app",
  messagingSenderId: "72962622587",
  appId: "1:72962622587:web:147d9248f545d4c39dcede",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
