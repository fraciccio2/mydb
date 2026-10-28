export const config = {
  omdbApiKey: import.meta.env.VITE_OMDB_API_KEY || "",
  whatsonApiKey: import.meta.env.VITE_WHATSON_API_KEY || "",
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  },
};

if (import.meta.env.DEV) {
  if (!config.omdbApiKey) {
    console.warn("⚠️ [MYDB] VITE_OMDB_API_KEY is not defined in environment variables.");
  }
  if (!config.whatsonApiKey) {
    console.warn("⚠️ [MYDB] VITE_WHATSON_API_KEY is not defined in environment variables.");
  }
  if (!config.firebase.apiKey) {
    console.warn("⚠️ [MYDB] VITE_FIREBASE_API_KEY is not defined in environment variables.");
  }
}
