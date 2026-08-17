import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

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

export function firebaseAuthMessage(
  err: unknown,
  method: "google" | "email" = "email",
): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message : "Sign-in failed";
  const googleSetup =
    "Google is not fully saved in Firebase yet. Open Authentication → Sign-in method → Google, turn Enable on, pick a Project support email, then click Save. Wait until the row shows Enabled, then try Continue with Google again.";

  if (
    method === "google" &&
    (code.includes("operation-not-allowed") ||
      code.includes("invalid-credential") ||
      message.includes("operation-not-allowed") ||
      message.includes("invalid-credential") ||
      message.includes("identity provider configuration is not found"))
  ) {
    return googleSetup;
  }
  if (code.includes("operation-not-allowed") || message.includes("operation-not-allowed")) {
    return "This sign-in method is disabled in Firebase. Open Authentication → Sign-in method and enable Google (and Email/Password if you use that).";
  }
  if (code.includes("configuration-not-found") || message.includes("configuration-not-found")) {
    return "Firebase Authentication is not set up. Open Authentication and click Get started.";
  }
  if (code.includes("popup-closed-by-user")) {
    return "Google sign-in was cancelled.";
  }
  if (code.includes("invalid-credential") || message.includes("invalid-credential")) {
    return "Email or password is wrong, or this account does not exist yet. Click “Need an account? Register” first, then Sign in.";
  }
  if (code.includes("unauthorized-domain")) {
    return "Add localhost to Authentication → Settings → Authorized domains.";
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
