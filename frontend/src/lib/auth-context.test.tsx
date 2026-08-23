import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/lib/api";

const USER: AuthUser = {
  id: "mongo-1",
  firebaseUid: "uid-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  photoUrl: "",
  interviewCoins: 150,
};

const listeners = new Set<() => void>();

const authMe = vi.fn();
const loginWithIdToken = vi.fn();
const logoutRequest = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    authMe: () => authMe(),
    loginWithIdToken: (token: string) => loginWithIdToken(token),
    logout: () => logoutRequest(),
  },
  onSessionExpired: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
}));

const signInWithGoogle = vi.fn();
const firebaseSignOut = vi.fn().mockResolvedValue(undefined);
const listSignInMethodsForEmail = vi.fn().mockResolvedValue([]);
const createUserWithEmailAndPassword = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const linkEmailPassword = vi.fn();
const linkGoogle = vi.fn();
const providerIdsOf = vi.fn().mockReturnValue([]);

/** Set by tests that need Firebase's persisted sign-in to exist. */
let firebaseAuthInstance: { currentUser: unknown } | null = null;
const authStateListeners = new Set<(user: unknown) => void>();

vi.mock("@/lib/firebase", () => ({
  firebaseEnabled: true,
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  firebaseSignOut: () => firebaseSignOut(),
  getFirebaseAuth: () => firebaseAuthInstance,
  onAuthStateChanged: (_auth: unknown, listener: (user: unknown) => void) => {
    authStateListeners.add(listener);
    return () => authStateListeners.delete(listener);
  },
  signInWithEmailAndPassword: (...args: unknown[]) =>
    signInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    createUserWithEmailAndPassword(...args),
  listSignInMethodsForEmail: (...args: unknown[]) =>
    listSignInMethodsForEmail(...args),
  linkEmailPassword: (...args: unknown[]) => linkEmailPassword(...args),
  linkGoogle: (...args: unknown[]) => linkGoogle(...args),
  providerIdsOf: (...args: unknown[]) => providerIdsOf(...args),
  sendPasswordReset: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  firebaseAuthMessage: (err: unknown) =>
    err instanceof Error ? err.message : "Sign-in failed",
  FirebaseNotConfiguredError: class extends Error {},
}));

const { AuthProvider, useAuth } = await import("@/lib/auth-context");

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">
        {auth.isLoading
          ? "loading"
          : auth.isAuthenticated
            ? "authenticated"
            : "anonymous"}
      </span>
      <span data-testid="name">{auth.user?.name ?? "-"}</span>
      <span data-testid="coins">{auth.user?.interviewCoins ?? "-"}</span>
      <span data-testid="error">{auth.error ?? "-"}</span>
      <span data-testid="expired">{auth.sessionExpired ? "yes" : "no"}</span>
      <span data-testid="signing-in">{auth.isSigningIn ? "yes" : "no"}</span>
      <button onClick={() => void auth.loginWithGoogle().catch(() => {})}>
        sign in
      </button>
      <button
        onClick={() =>
          void auth.registerEmail("ada@example.com", "secret1").catch(() => {})
        }
      >
        register
      </button>
      <button
        onClick={() => void auth.linkEmailPassword("secret1").catch(() => {})}
      >
        set password
      </button>
      <button onClick={() => void auth.linkGoogle().catch(() => {})}>
        link google
      </button>
      <button onClick={() => void auth.logout()}>sign out</button>
      <button onClick={() => void auth.refreshUser().catch(() => {})}>
        refresh
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

const status = () => screen.getByTestId("status").textContent;

describe("AuthProvider", () => {
  beforeEach(() => {
    listeners.clear();
    authStateListeners.clear();
    firebaseAuthInstance = null;
    window.localStorage.clear();
    authMe.mockReset();
    loginWithIdToken.mockReset();
    logoutRequest.mockReset().mockResolvedValue({ ok: true });
    signInWithGoogle.mockReset();
    listSignInMethodsForEmail.mockReset().mockResolvedValue([]);
    createUserWithEmailAndPassword.mockReset();
    signInWithEmailAndPassword.mockReset();
    linkEmailPassword.mockReset().mockResolvedValue("uid-1");
    linkGoogle.mockReset().mockResolvedValue("uid-1");
    providerIdsOf.mockReset().mockReturnValue([]);
  });

  it("restores an existing session on startup", async () => {
    authMe.mockResolvedValue({ user: USER });

    renderProbe();
    expect(status()).toBe("loading");

    await waitFor(() => expect(status()).toBe("authenticated"));
    expect(screen.getByTestId("name")).toHaveTextContent("Ada Lovelace");
    expect(screen.getByTestId("coins")).toHaveTextContent("150");
  });

  it("resolves to anonymous when there is no session", async () => {
    authMe.mockRejectedValue(new Error("401"));

    renderProbe();

    await waitFor(() => expect(status()).toBe("anonymous"));
  });

  it("exchanges the Firebase ID token for a backend session on login", async () => {
    authMe.mockRejectedValue(new Error("401"));
    signInWithGoogle.mockResolvedValue({ idToken: "firebase-id-token" });
    loginWithIdToken.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));

    await userEvent.click(screen.getByRole("button", { name: "sign in" }));

    await waitFor(() => expect(status()).toBe("authenticated"));
    expect(loginWithIdToken).toHaveBeenCalledWith("firebase-id-token");
    expect(screen.getByTestId("name")).toHaveTextContent("Ada Lovelace");
  });

  it("surfaces a friendly message when Google sign-in fails", async () => {
    authMe.mockRejectedValue(new Error("401"));
    signInWithGoogle.mockRejectedValue(new Error("Google sign-in was cancelled."));

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));

    await userEvent.click(screen.getByRole("button", { name: "sign in" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Google sign-in was cancelled.",
      ),
    );
    expect(status()).toBe("anonymous");
    expect(screen.getByTestId("signing-in")).toHaveTextContent("no");
  });

  it("ignores a second sign-in while a popup is already open", async () => {
    authMe.mockRejectedValue(new Error("401"));
    let release: (v: { idToken: string }) => void = () => {};
    signInWithGoogle.mockImplementation(
      () =>
        new Promise<{ idToken: string }>((resolve) => {
          release = resolve;
        }),
    );
    loginWithIdToken.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));

    const button = screen.getByRole("button", { name: "sign in" });
    await userEvent.click(button);
    await userEvent.click(button);
    release({ idToken: "firebase-id-token" });

    await waitFor(() => expect(status()).toBe("authenticated"));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("clears the user and signs out of Firebase on logout", async () => {
    authMe.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("authenticated"));

    await userEvent.click(screen.getByRole("button", { name: "sign out" }));

    await waitFor(() => expect(status()).toBe("anonymous"));
    expect(logoutRequest).toHaveBeenCalled();
    expect(firebaseSignOut).toHaveBeenCalled();
  });

  it("clears the user when a protected request reports an expired session", async () => {
    authMe.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("authenticated"));

    act(() => {
      for (const listener of listeners) listener();
    });

    await waitFor(() => expect(status()).toBe("anonymous"));
    expect(screen.getByTestId("expired")).toHaveTextContent("yes");
  });

  it("rebuilds an expired session from the persisted Firebase user", async () => {
    firebaseAuthInstance = { currentUser: null };
    authMe.mockRejectedValue(new Error("401"));
    loginWithIdToken.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));

    const getIdToken = vi.fn().mockResolvedValue("refreshed-token");
    act(() => {
      for (const listener of authStateListeners) {
        listener({ uid: "uid-1", getIdToken });
      }
    });

    await waitFor(() => expect(status()).toBe("authenticated"));
    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(loginWithIdToken).toHaveBeenCalledWith("refreshed-token");
  });

  it("does not retry the silent rebuild after it fails once", async () => {
    firebaseAuthInstance = { currentUser: null };
    authMe.mockRejectedValue(new Error("401"));
    loginWithIdToken.mockRejectedValue(new Error("token rejected"));

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));

    const firebaseUser = {
      uid: "uid-1",
      getIdToken: vi.fn().mockResolvedValue("stale-token"),
    };
    act(() => {
      for (const listener of authStateListeners) listener(firebaseUser);
    });
    await waitFor(() => expect(loginWithIdToken).toHaveBeenCalledTimes(1));

    act(() => {
      for (const listener of authStateListeners) listener({ ...firebaseUser });
    });

    expect(status()).toBe("anonymous");
    expect(loginWithIdToken).toHaveBeenCalledTimes(1);
  });

  it("re-reads the user from the backend on refreshUser", async () => {
    authMe.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("authenticated"));

    authMe.mockResolvedValue({ user: { ...USER, interviewCoins: 140 } });
    await userEvent.click(screen.getByRole("button", { name: "refresh" }));

    await waitFor(() =>
      expect(screen.getByTestId("coins")).toHaveTextContent("140"),
    );
  });

  it("never persists a session identifier in browser storage", async () => {
    authMe.mockRejectedValue(new Error("401"));
    signInWithGoogle.mockResolvedValue({ idToken: "firebase-id-token" });
    loginWithIdToken.mockResolvedValue({ user: USER });

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));
    await userEvent.click(screen.getByRole("button", { name: "sign in" }));
    await waitFor(() => expect(status()).toBe("authenticated"));

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("refuses to register when the email already has Google", async () => {
    authMe.mockRejectedValue(new Error("401"));
    listSignInMethodsForEmail.mockResolvedValue(["google.com"]);
    firebaseAuthInstance = { currentUser: null };

    renderProbe();
    await waitFor(() => expect(status()).toBe("anonymous"));

    await userEvent.click(screen.getByRole("button", { name: "register" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "An account already exists with this email. Please sign in with Google first",
      ),
    );
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(loginWithIdToken).not.toHaveBeenCalled();
  });

  it("links a password without exchanging a new identity", async () => {
    authMe.mockResolvedValue({ user: USER });
    firebaseAuthInstance = { currentUser: { uid: "uid-1", email: USER.email } };

    renderProbe();
    await waitFor(() => expect(status()).toBe("authenticated"));

    await userEvent.click(screen.getByRole("button", { name: "set password" }));

    await waitFor(() =>
      expect(linkEmailPassword).toHaveBeenCalledWith("secret1", undefined),
    );
    expect(loginWithIdToken).not.toHaveBeenCalled();
    expect(status()).toBe("authenticated");
    expect(screen.getByTestId("coins")).toHaveTextContent("150");
  });

  it("links Google without exchanging a new identity", async () => {
    authMe.mockResolvedValue({ user: USER });
    firebaseAuthInstance = { currentUser: { uid: "uid-1", email: USER.email } };

    renderProbe();
    await waitFor(() => expect(status()).toBe("authenticated"));

    await userEvent.click(screen.getByRole("button", { name: "link google" }));

    await waitFor(() => expect(linkGoogle).toHaveBeenCalled());
    expect(loginWithIdToken).not.toHaveBeenCalled();
    expect(status()).toBe("authenticated");
  });
});
