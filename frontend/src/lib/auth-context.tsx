"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser } from "@/lib/api";
import {
  createUserWithEmailAndPassword,
  firebaseEnabled,
  getFirebaseAuth,
  googleProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "@/lib/firebase";

const DEV_UID_KEY = "career-copilot-dev-uid";

export interface AuthSession {
  uid: string;
  email: string | null;
  name?: string;
  photoUrl?: string;
  interviewCoins?: number;
  getIdToken: () => Promise<string>;
}

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  firebaseEnabled: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInDev: (uid?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function fromBackendUser(user: AuthUser): AuthSession {
  return {
    uid: user.id,
    email: user.email,
    name: user.name,
    photoUrl: user.photoUrl,
    interviewCoins: user.interviewCoins,
    getIdToken: async () => "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { user } = await api.authMe();
        if (!cancelled) setSession(fromBackendUser(user));
      } catch {
        const uid =
          typeof window !== "undefined"
            ? window.localStorage.getItem(DEV_UID_KEY)
            : null;
        if (uid && !cancelled) {
          setSession({
            uid,
            email: `${uid}@local.dev`,
            name: "Local user",
            getIdToken: async () => "dev",
          });
        } else if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const exchangeFirebaseSession = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      throw new Error("Firebase sign-in did not produce a user.");
    }
    const idToken = await auth.currentUser.getIdToken();
    const { user } = await api.loginWithIdToken(idToken);
    setSession(fromBackendUser(user));
  }, []);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured.");
      await signInWithEmailAndPassword(auth, email, password);
      await exchangeFirebaseSession();
    },
    [exchangeFirebaseSession],
  );

  const registerEmail = useCallback(
    async (email: string, password: string) => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured.");
      await createUserWithEmailAndPassword(auth, email, password);
      await exchangeFirebaseSession();
    },
    [exchangeFirebaseSession],
  );

  const signInGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    await signInWithPopup(auth, googleProvider);
    await exchangeFirebaseSession();
  }, [exchangeFirebaseSession]);

  const signInDev = useCallback((uid = "local-dev-user") => {
    window.localStorage.setItem(DEV_UID_KEY, uid);
    setSession({
      uid,
      email: `${uid}@local.dev`,
      name: "Local user",
      getIdToken: async () => "dev",
    });
  }, []);

  const logout = useCallback(async () => {
    window.localStorage.removeItem(DEV_UID_KEY);
    try {
      await api.logout();
    } catch {
      /* cookie may already be gone */
    }
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      firebaseEnabled,
      signInEmail,
      registerEmail,
      signInGoogle,
      signInDev,
      logout,
    }),
    [
      session,
      loading,
      signInEmail,
      registerEmail,
      signInGoogle,
      signInDev,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
