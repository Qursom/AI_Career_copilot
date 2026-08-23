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
  ExistingAccountError,
  type ConflictAction,
  conflictActionForMethods,
  registerBlockedMessage,
  shouldBlockEmailRegister,
} from "@/lib/auth-providers";
import {
  createUserWithEmailAndPassword,
  firebaseAuthMessage,
  firebaseEnabled,
  firebaseSignOut,
  FirebaseNotConfiguredError,
  getFirebaseAuth,
  linkEmailPassword as linkEmailPasswordOnFirebase,
  linkGoogle as linkGoogleOnFirebase,
  listSignInMethodsForEmail,
  onAuthStateChanged,
  providerIdsOf,
  sendPasswordReset,
  sendVerificationEmail,
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
  /** Suggested next step when the email already belongs to another provider. */
  conflictAction: ConflictAction;
  firebaseEnabled: boolean;
  emailVerified: boolean;
  firebaseEmail: string | null;
  devLoginAllowed: boolean;
  /**
   * Non-null only for the development `x-user-id` fallback. Real sessions
   * authenticate through the cookie, so pages must not send an identity header.
   */
  devUserId: string | null;
  loginWithGoogle: (emailHint?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string) => Promise<void>;
  linkEmailPassword: (password: string, email?: string) => Promise<void>;
  linkGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  requestEmailVerification: () => Promise<void>;
  authProviders: string[];
  isLinking: boolean;
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

function conflictFromError(err: unknown): ConflictAction {
  if (err instanceof ExistingAccountError) return err.action;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [devUserId, setDevUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictAction, setConflictAction] = useState<ConflictAction>(null);

  const signInInFlight = useRef(false);
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

  const exchangeIdToken = useCallback(async (idToken: string) => {
    const { user: authenticated } = await api.loginWithIdToken(idToken);
    setUser(authenticated);
    setDevUserId(null);
    setSessionExpired(false);
    setConflictAction(null);
  }, []);

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

  const loginWithGoogle = useCallback(
    async (emailHint?: string) => {
      if (signInInFlight.current) return;
      signInInFlight.current = true;
      setIsSigningIn(true);
      setError(null);
      setConflictAction(null);
      try {
        const { idToken } = await signInWithGoogle(emailHint);
        await exchangeIdToken(idToken);
      } catch (err) {
        setError(firebaseAuthMessage(err, "google"));
        setConflictAction(conflictFromError(err));
        throw err;
      } finally {
        signInInFlight.current = false;
        setIsSigningIn(false);
      }
    },
    [exchangeIdToken],
  );

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
      setConflictAction(null);
      try {
        await run(firebaseAuth);
        const idToken = await firebaseAuth.currentUser?.getIdToken();
        if (!idToken) {
          throw new Error("Firebase sign-in did not produce a user.");
        }
        await exchangeIdToken(idToken);
      } catch (err) {
        setError(firebaseAuthMessage(err, "email"));
        setConflictAction(conflictFromError(err));
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
      withEmailCredentials(async (firebaseAuth) => {
        const methods = await listSignInMethodsForEmail(email);
        if (shouldBlockEmailRegister(methods)) {
          throw new ExistingAccountError(
            registerBlockedMessage(methods),
            conflictActionForMethods(methods) ?? "google",
          );
        }
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const created = firebaseAuth.currentUser;
        if (created) await sendVerificationEmail().catch(() => undefined);
      }),
    [withEmailCredentials],
  );

  const linkEmailPassword = useCallback(
    async (password: string, email?: string) => {
      setIsLinking(true);
      setError(null);
      try {
        await linkEmailPasswordOnFirebase(password, email);
        setFirebaseUser(getFirebaseAuth()?.currentUser ?? null);
      } catch (err) {
        setError(firebaseAuthMessage(err, "link"));
        throw err;
      } finally {
        setIsLinking(false);
      }
    },
    [],
  );

  const linkGoogle = useCallback(async () => {
    setIsLinking(true);
    setError(null);
    try {
      await linkGoogleOnFirebase();
      setFirebaseUser(getFirebaseAuth()?.currentUser ?? null);
    } catch (err) {
      setError(firebaseAuthMessage(err, "link"));
      throw err;
    } finally {
      setIsLinking(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordReset(email);
    } catch (err) {
      setError(firebaseAuthMessage(err, "email"));
      throw err;
    }
  }, []);

  const requestEmailVerification = useCallback(async () => {
    setError(null);
    try {
      await sendVerificationEmail();
    } catch (err) {
      setError(firebaseAuthMessage(err, "email"));
      throw err;
    }
  }, []);

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
      setConflictAction(null);
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setConflictAction(null);
  }, []);

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
      conflictAction,
      firebaseEnabled,
      emailVerified: firebaseUser?.emailVerified ?? false,
      firebaseEmail: firebaseUser?.email ?? user?.email ?? null,
      devLoginAllowed,
      devUserId,
      loginWithGoogle,
      logout,
      refreshUser,
      signInEmail,
      registerEmail,
      linkEmailPassword,
      linkGoogle,
      requestPasswordReset,
      requestEmailVerification,
      authProviders: providerIdsOf(firebaseUser),
      isLinking,
      signInDev,
      clearError,
      loading: isLoading,
      signInGoogle: loginWithGoogle,
    }),
    [
      user,
      session,
      firebaseUser,
      conflictAction,
      devUserId,
      isLoading,
      isSigningIn,
      isLinking,
      isSigningOut,
      sessionExpired,
      error,
      loginWithGoogle,
      logout,
      refreshUser,
      signInEmail,
      registerEmail,
      linkEmailPassword,
      linkGoogle,
      requestPasswordReset,
      requestEmailVerification,
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
