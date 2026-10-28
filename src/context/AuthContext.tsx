import { useEffect, useState, type ReactNode } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { AuthContext } from "./authContextDef";
import { seenStore } from "../store/seenStore";
import { searchStore } from "../store/searchStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Clear in-memory cache if user changed
      if (currentUser?.uid !== user?.uid) {
        seenStore.reset();
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      seenStore.reset();
      searchStore.reset();
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
