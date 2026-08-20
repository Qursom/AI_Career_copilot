"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, onSessionExpired, type AuthUser } from "@/lib/api";
import {
  createUserWithEmailAndPassword,
  firebaseAuthMessage,
  firebaseEnabled,
  firebaseSignOut,
  FirebaseNotConfiguredError,
  getFirebaseAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithGoogle,
  type User as FirebaseUser,
} from "@/lib/firebase";

/**
 * Development-only escape hatch so the app is usable without Firebase keys.
 * This stores a *user id* for the backend's non-production `x-user-id`
 * fallback — never a session id. Real sessions live in an HTTP-only cookie
 * that JavaScript cannot read or write.
 */
const DEV_UID_KEY = "career-copilot-dev-uid";
const devLoginAllowed = process.env.NODE_ENV !== "production";

/** Legacy shape still consumed by existing pages. */
export interface AuthSession {
  uid: string;
  email: string | null;
  name?: string;
  photoUrl?: string;
  interviewCoins?: number;
  getIdToken: () => Promise<string>;
}

interface AuthContextValue {
  /** Authoritative user, resolved from the backend session — not from Firebase. */
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  /** True until the initial `GET /auth/me` has resolved. */
  isLoading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  /** Set when a protected request rejected a previously valid session. */
  sessionExpired: boolean;
  error: string | null;
  firebaseEnabled: boolean;
  devLoginAllowed: boolean;
  /**
   * Non-null only for the development `x-user-id` fallback. Real sessions
   * authenticate through the cookie, so pages must not send an identity header.
   */
  devUserId: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string) => Promise<void>;
  signInDev: (uid?: string) => void;
  clearError: () => void;
  /** @deprecated Use `isLoading`. */
  loading: boolean;
  /** @deprecated Use `loginWithGoogle`. */
  signInGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: AuthUser): AuthSession {
  return {
    uid: user.firebaseUid || user.id,
    email: user.email,
    name: user.name,
    photoUrl: user.photoUrl,
    interviewCoins: user.interviewCoins,
    // Firebase refreshes this itself when the cached token is close to expiry.
    // Returns "" for the dev fallback, where there is no Firebase user at all.
    getIdToken: async () => {
      const current = getFirebaseAuth()?.currentUser;
      return current ? current.getIdToken() : "";
    },
  };
}

function devUser(uid: string): AuthUser {
  return {
    id: uid,
    firebaseUid: uid,
    name: "Local user",
    email: `${uid}@local.dev`,
    photoUrl: "",
    interviewCoins: 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [devUserId, setDevUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Guards against a second popup while one is already open. */
  const signInInFlight = useRef(false);
  /** Firebase uid whose token we already spent on a silent session rebuild. */
  const silentReauthFor = useRef<string | null>(null);

  const readDevUid = useCallback((): string | null => {
    if (!devLoginAllowed || typeof window === "undefined") return null;
    return window.localStorage.getItem(DEV_UID_KEY);
  }, []);

  const restore = useCallback(async (): Promise<{
    user: AuthUser | null;
    devUid: string | null;
  }> => {
    try {
      const { user: restored } = await api.authMe();
      return { user: restored, devUid: null };
    } catch {
      const uid = readDevUid();
      return { user: uid ? devUser(uid) : null, devUid: uid };
    }
  }, [readDevUid]);

  // Restore the server session on startup. Firebase's own client state is
  // deliberately ignored here: the cookie + Redis session is the authority.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const restored = await restore();
      if (cancelled) return;
      setUser(restored.user);
      setDevUserId(restored.devUid);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [restore]);

  // A 401 from any protected endpoint means the session died underneath us.
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser((current) => {
          if (current) setSessionExpired(true);
          return null;
        });
      }),
    [],
  );

  // Track Firebase's own persisted sign-in. It is not an authority on who the
  // user is — it is a way to obtain a fresh ID token without another popup.
  useEffect(() => {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (next) => {
      if (!next) silentReauthFor.current = null;
      setFirebaseUser(next);
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: fresh } = await api.authMe();
    setUser(fresh);
    setDevUserId(null);
    setSessionExpired(false);
  }, []);

  /** Exchanges the Firebase ID token for the backend session cookie. */
  const exchangeIdToken = useCallback(async (idToken: string) => {
    const { user: authenticated } = await api.loginWithIdToken(idToken);
    setUser(authenticated);
    setDevUserId(null);
    setSessionExpired(false);
  }, []);

  // The session cookie expires long before Firebase forgets the account, so an
  // expired session is rebuilt from a fresh ID token instead of dropping the
  // user back onto the sign-in gate. One attempt per Firebase uid: if the
  // exchange fails, an explicit sign-in is the remaining path.
  useEffect(() => {
    if (isLoading || isSigningIn || isSigningOut) return;
    if (user || !firebaseUser) return;
    if (silentReauthFor.current === firebaseUser.uid) return;
    silentReauthFor.current = firebaseUser.uid;
    void (async () => {
      try {
        await exchangeIdToken(await firebaseUser.getIdToken(true));
      } catch {
        // Leave the sign-in prompt in place.
      }
    })();
  }, [
    isLoading,
    isSigningIn,
    isSigningOut,
    user,
    firebaseUser,
    exchangeIdToken,
  ]);

  const loginWithGoogle = useCallback(async () => {
    if (signInInFlight.current) return;
    signInInFlight.current = true;
    setIsSigningIn(true);
    setError(null);
    try {
      const { idToken } = await signInWithGoogle();
      await exchangeIdToken(idToken);
    } catch (err) {
      setError(firebaseAuthMessage(err, "google"));
      throw err;
    } finally {
      signInInFlight.current = false;
      setIsSigningIn(false);
    }
  }, [exchangeIdToken]);

  const withEmailCredentials = useCallback(
    async (
      run: (
        auth: NonNullable<ReturnType<typeof getFirebaseAuth>>,
      ) => Promise<unknown>,
    ) => {
      if (signInInFlight.current) return;
      const firebaseAuth = getFirebaseAuth();
      if (!firebaseAuth) throw new FirebaseNotConfiguredError();
      signInInFlight.current = true;
      setIsSigningIn(true);
      setError(null);
      try {
        await run(firebaseAuth);
        const idToken = await firebaseAuth.currentUser?.getIdToken();
        if (!idToken) throw new Error("Firebase sign-in did not produce a user.");
        await exchangeIdToken(idToken);
      } catch (err) {
        setError(firebaseAuthMessage(err, "email"));
        throw err;
      } finally {
        signInInFlight.current = false;
        setIsSigningIn(false);
      }
    },
    [exchangeIdToken],
  );

  const signInEmail = useCallback(
    (email: string, password: string) =>
      withEmailCredentials((firebaseAuth) =>
        signInWithEmailAndPassword(firebaseAuth, email, password),
      ),
    [withEmailCredentials],
  );

  const registerEmail = useCallback(
    (email: string, password: string) =>
      withEmailCredentials((firebaseAuth) =>
        createUserWithEmailAndPassword(firebaseAuth, email, password),
      ),
    [withEmailCredentials],
  );

  const signInDev = useCallback((uid = "local-dev-user") => {
    if (!devLoginAllowed) return;
    window.localStorage.setItem(DEV_UID_KEY, uid);
    setUser(devUser(uid));
    setDevUserId(uid);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    setIsSigningOut(true);
    try {
      if (devLoginAllowed && typeof window !== "undefined") {
        window.localStorage.removeItem(DEV_UID_KEY);
      }
      try {
        await api.logout();
      } catch {
        // The session may already be gone; the cookie clear is what matters.
      }
      await firebaseSignOut();
      setUser(null);
      setDevUserId(null);
      setSessionExpired(false);
      setError(null);
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const session = useMemo(() => (user ? toSession(user) : null), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: user !== null,
      isLoading,
      isSigningIn,
      isSigningOut,
      sessionExpired,
      error,
      firebaseEnabled,
      devLoginAllowed,
      devUserId,
      loginWithGoogle,
      logout,
      refreshUser,
      signInEmail,
      registerEmail,
      signInDev,
      clearError,
      loading: isLoading,
      signInGoogle: loginWithGoogle,
    }),
    [
      user,
      session,
      devUserId,
      isLoading,
      isSigningIn,
      isSigningOut,
      sessionExpired,
      error,
      loginWithGoogle,
      logout,
      refreshUser,
      signInEmail,
      registerEmail,
      signInDev,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
