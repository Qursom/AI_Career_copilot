import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  type UserCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

/**
 * Client Firebase config. Every value here is public by design (it ships in the
 * browser bundle) — backend secrets must never use the NEXT_PUBLIC_ prefix.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!firebaseEnabled) return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Google sign-in is unavailable because Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables in frontend/.env.local.",
    );
    this.name = "FirebaseNotConfiguredError";
  }
}

/**
 * Opens the Google popup and returns a fresh Firebase ID token.
 *
 * The token is handed straight to the backend and never persisted in the
 * browser — the app session lives in the HTTP-only cookie the backend sets.
 */
export async function signInWithGoogle(): Promise<{
  credential: UserCredential;
  idToken: string;
}> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  const idToken = await credential.user.getIdToken();
  return { credential, idToken };
}

export async function firebaseSignOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) await signOut(firebaseAuth);
}

/** Maps Firebase/auth failures onto copy a user can actually act on. */
export function firebaseAuthMessage(
  err: unknown,
  method: "google" | "email" = "email",
): string {
  if (err instanceof FirebaseNotConfiguredError) return err.message;

  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message : "Sign-in failed";
  const has = (needle: string) => code.includes(needle) || message.includes(needle);

  const googleSetup =
    "Google is not fully saved in Firebase yet. Open Authentication → Sign-in method → Google, turn Enable on, pick a Project support email, then click Save. Wait until the row shows Enabled, then try Continue with Google again.";

  if (
    method === "google" &&
    (has("operation-not-allowed") ||
      has("invalid-credential") ||
      has("identity provider configuration is not found"))
  ) {
    return googleSetup;
  }
  if (has("operation-not-allowed")) {
    return "This sign-in method is disabled in Firebase. Open Authentication → Sign-in method and enable Google (and Email/Password if you use that).";
  }
  if (has("configuration-not-found")) {
    return "Firebase Authentication is not set up. Open Authentication and click Get started.";
  }
  if (has("popup-closed-by-user") || has("cancelled-popup-request")) {
    return "Google sign-in was cancelled. Click Continue with Google to try again.";
  }
  if (has("popup-blocked")) {
    return "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";
  }
  if (has("network-request-failed")) {
    return "We could not reach Google. Check your connection and try again.";
  }
  if (has("account-exists-with-different-credential")) {
    return "An account already exists with this email using a different sign-in method. Sign in with that method first.";
  }
  if (has("too-many-requests")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (has("invalid-credential")) {
    return "Email or password is wrong, or this account does not exist yet. Click “Need an account? Register” first, then Sign in.";
  }
  if (has("unauthorized-domain")) {
    const host =
      typeof window !== "undefined" ? window.location.hostname : "";
    const domainHint = host && host !== "localhost" ? host : "localhost";
    return `This site is not allowed to use Firebase Auth. In Firebase Console → Authentication → Settings → Authorized domains, add “${domainHint}” (and keep localhost for local dev). Then wait a minute and try again.`;
  }
  return message;
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
};
export type { User };
