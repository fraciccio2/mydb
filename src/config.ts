// Configuration with environment variables and fallback defaults
// Ensures the build never breaks if GitHub Secrets are missing or not passed to the build step
export const config = {
  omdbApiKey: import.meta.env.VITE_OMDB_API_KEY || "704c9e59",
  whatsonApiKey: import.meta.env.VITE_WHATSON_API_KEY || "d0b8b76f-d505-4d36-82ea-e8f968a2dbd1",
  firebase: {
    apiKey:
      import.meta.env.VITE_FIREBASE_API_KEY ||
      "AIzaSyDhZaEOd_-IhaWsunN_ZAW6WxEAV1Ghs_I",
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
      "mydb-app-67786.firebaseapp.com",
    projectId:
      import.meta.env.VITE_FIREBASE_PROJECT_ID || "mydb-app-67786",
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
      "mydb-app-67786.firebasestorage.app",
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "72962622587",
    appId:
      import.meta.env.VITE_FIREBASE_APP_ID ||
      "1:72962622587:web:147d9248f545d4c39dcede",
  },
};
