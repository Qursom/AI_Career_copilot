/** Firebase provider IDs we care about for same-email linking. */
export const PROVIDER_PASSWORD = "password";
export const PROVIDER_GOOGLE = "google.com";

export type ConflictAction = "google" | "password" | null;

export class ExistingAccountError extends Error {
  readonly action: ConflictAction;

  constructor(message: string, action: ConflictAction = null) {
    super(message);
    this.name = "ExistingAccountError";
    this.action = action;
  }
}

/** Scenario 4: password signup hits an existing Google account. */
export const MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD =
  "An account already exists with this email. Please sign in with Google first. After signing in, you can add a password from Account Settings.";

/** Scenario 2/3: Google hits an existing password account. */
export const MSG_SIGN_IN_EMAIL_THEN_LINK_GOOGLE =
  "An account already exists with this email. Please sign in with your email and password first. You can connect Google from Account Settings.";

export const MSG_SIGN_IN_EXISTING_METHOD =
  "An account already exists with this email. Please sign in using your existing method first.";

export const MSG_SIGN_IN_EMAIL_NOT_REGISTER =
  "An account already exists with this email. Please sign in with email and password instead of registering.";

export const MSG_LINK_TIED_TO_OTHER_ACCOUNT =
  "This login is already tied to another account. Sign in with that account instead. Accounts are never merged by email alone.";

export function conflictActionForMethods(methods: string[]): ConflictAction {
  if (methods.includes(PROVIDER_PASSWORD) && !methods.includes(PROVIDER_GOOGLE)) {
    return "password";
  }
  if (methods.includes(PROVIDER_GOOGLE)) return "google";
  return null;
}

/** Creating a password account is blocked if Firebase already has this email. */
export function shouldBlockEmailRegister(methods: string[]): boolean {
  return methods.length > 0;
}

export function registerBlockedMessage(methods: string[]): string {
  if (methods.includes(PROVIDER_GOOGLE)) {
    return MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD;
  }
  if (methods.includes(PROVIDER_PASSWORD)) {
    return MSG_SIGN_IN_EMAIL_NOT_REGISTER;
  }
  return MSG_SIGN_IN_EXISTING_METHOD;
}

/**
 * Do not start Google sign-in when the email is password-only.
 * Opening Google would mint or collide with a second Firebase user.
 */
export function shouldBlockGoogleSignIn(methods: string[]): boolean {
  return (
    methods.length > 0 && methods.every((method) => method === PROVIDER_PASSWORD)
  );
}

export function accountExistsDifferentCredentialMessage(
  methods: string[],
): string {
  if (shouldBlockGoogleSignIn(methods) || methods.includes(PROVIDER_PASSWORD)) {
    return MSG_SIGN_IN_EMAIL_THEN_LINK_GOOGLE;
  }
  if (methods.includes(PROVIDER_GOOGLE)) {
    return MSG_SIGN_IN_GOOGLE_THEN_SET_PASSWORD;
  }
  return MSG_SIGN_IN_EXISTING_METHOD;
}

export function formatSignedInWith(providerIds: string[]): string {
  const labels: string[] = [];
  if (providerIds.includes(PROVIDER_GOOGLE)) labels.push("Google");
  if (providerIds.includes(PROVIDER_PASSWORD)) labels.push("email");
  if (labels.length === 0) return "your account";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} and ${labels[1]}`;
}
