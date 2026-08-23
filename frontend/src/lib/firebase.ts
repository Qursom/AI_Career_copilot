import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  type UserCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  ExistingAccountError,
  MSG_LINK_TIED_TO_OTHER_ACCOUNT,
  MSG_SIGN_IN_EMAIL_THEN_LINK_GOOGLE,
  MSG_SIGN_IN_EXISTING_METHOD,
  MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD,
  accountExistsDifferentCredentialMessage,
  conflictActionForMethods,
  shouldBlockGoogleSignIn,
} from "@/lib/auth-providers";

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

export function providerIdsOf(user: User | null | undefined): string[] {
  if (!user) return [];
  return user.providerData
    .map((entry) => entry.providerId)
    .filter((id): id is string => Boolean(id));
}

/**
 * Returns Firebase sign-in methods for an email.
 * Empty on failure (email enumeration protection often hides methods).
 */
export async function listSignInMethodsForEmail(
  email: string,
): Promise<string[]> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];
  try {
    return await fetchSignInMethodsForEmail(firebaseAuth, normalized);
  } catch {
    return [];
  }
}

function emailFromAuthError(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const custom = (err as { customData?: { email?: unknown } }).customData;
  const value = custom?.email;
  return typeof value === "string" && value.includes("@") ? value : null;
}

/**
 * Opens the Google popup and returns a fresh Firebase ID token.
 *
 * When `emailHint` is known (login form), refuse Google if that email is
 * already password-only — do not create a second Firebase user.
 * Never auto-link a pending credential.
 */
export async function signInWithGoogle(emailHint?: string): Promise<{
  credential: UserCredential;
  idToken: string;
}> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();

  if (emailHint?.trim()) {
    const methods = await listSignInMethodsForEmail(emailHint);
    if (shouldBlockGoogleSignIn(methods)) {
      throw new ExistingAccountError(
        MSG_SIGN_IN_EMAIL_THEN_LINK_GOOGLE,
        "password",
      );
    }
  }

  try {
    const credential = await signInWithPopup(firebaseAuth, googleProvider);
    const idToken = await credential.user.getIdToken();
    return { credential, idToken };
  } catch (err) {
    if (isAuthCode(err, "account-exists-with-different-credential")) {
      const email = emailFromAuthError(err) ?? emailHint ?? "";
      const methods = email ? await listSignInMethodsForEmail(email) : [];
      throw new ExistingAccountError(
        accountExistsDifferentCredentialMessage(methods),
        conflictActionForMethods(methods) ?? "password",
      );
    }
    throw err;
  }
}

/**
 * Links email/password onto the currently authenticated Firebase user.
 * Email must match the signed-in account. UID does not change.
 */
export async function linkEmailPassword(
  password: string,
  email?: string,
): Promise<string> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();
  const user = firebaseAuth.currentUser;
  const accountEmail = user?.email;
  if (!user || !accountEmail) {
    throw new Error(
      "Sign in first, then add email and password to this same account.",
    );
  }
  if (email?.trim() && email.trim().toLowerCase() !== accountEmail.toLowerCase()) {
    throw new Error(
      "Use the email on this signed-in account. We never attach a password to a different email.",
    );
  }
  const uid = user.uid;
  try {
    await linkWithCredential(
      user,
      EmailAuthProvider.credential(accountEmail, password),
    );
    await user.reload();
    if (!user.emailVerified) {
      await sendEmailVerification(user).catch(() => undefined);
    }
  } catch (err) {
    throw remapLinkError(err);
  }
  return uid;
}

export async function linkGoogle(): Promise<string> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("Sign in first, then connect Google to this same account.");
  }
  const uid = user.uid;
  try {
    const result = await linkWithPopup(user, googleProvider);
    if (result.user.uid !== uid) {
      await signOut(firebaseAuth);
      throw new ExistingAccountError(MSG_LINK_TIED_TO_OTHER_ACCOUNT);
    }
    await result.user.reload();
  } catch (err) {
    if (err instanceof ExistingAccountError) throw err;
    throw remapLinkError(err);
  }
  return uid;
}

export async function sendVerificationEmail(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Sign in first to verify your email.");
  await sendEmailVerification(user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new FirebaseNotConfiguredError();
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Enter the email for your account first.");
  await sendPasswordResetEmail(firebaseAuth, normalized);
}

function remapLinkError(err: unknown): Error {
  if (
    isAuthCode(err, "credential-already-in-use") ||
    isAuthCode(err, "provider-already-linked") ||
    isAuthCode(err, "email-already-in-use")
  ) {
    return new ExistingAccountError(MSG_LINK_TIED_TO_OTHER_ACCOUNT);
  }
  if (err instanceof Error) return err;
  return new Error("Could not link this sign-in method.");
}

function isAuthCode(err: unknown, code: string): boolean {
  if (!err || typeof err !== "object") return false;
  const value =
    "code" in err ? String((err as { code: unknown }).code) : "";
  const message = err instanceof Error ? err.message : "";
  return value.includes(code) || message.includes(code);
}

export async function firebaseSignOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) await signOut(firebaseAuth);
}

/** Maps Firebase/auth failures onto copy a user can actually act on. */
export function firebaseAuthMessage(
  err: unknown,
  method: "google" | "email" | "link" = "email",
): string {
  if (err instanceof FirebaseNotConfiguredError) return err.message;
  if (err instanceof ExistingAccountError) return err.message;

  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message : "Sign-in failed";
  const has = (needle: string) => code.includes(needle) || message.includes(needle);

  const googleSetup =
    "Google is not fully saved in Firebase yet. Open Authentication → Sign-in method → Google, turn Enable on, pick a Project support email, then click Save. Wait until the row shows Enabled, then try Continue with Google again.";

  if (method === "link") {
    if (
      has("credential-already-in-use") ||
      has("provider-already-linked") ||
      has("email-already-in-use")
    ) {
      return MSG_LINK_TIED_TO_OTHER_ACCOUNT;
    }
  }

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
    return MSG_SIGN_IN_EXISTING_METHOD;
  }
  if (has("email-already-in-use")) {
    return MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD;
  }
  if (has("too-many-requests")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (has("invalid-credential") || has("user-not-found") || has("wrong-password")) {
    if (method === "email") {
      return "Email or password is wrong. If you originally signed in with Google, use Continue with Google, then add a password in Account Settings.";
    }
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
export { ExistingAccountError };
