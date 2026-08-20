import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthStub = Record<string, unknown>;

const authState: { current: AuthStub } = { current: {} };

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

const { default: RequireAuth } = await import("./RequireAuth");

const baseAuth = (overrides: AuthStub = {}): AuthStub => ({
  isAuthenticated: false,
  isLoading: false,
  isSigningIn: false,
  sessionExpired: false,
  error: null,
  loginWithGoogle: vi.fn().mockResolvedValue(undefined),
  firebaseEnabled: true,
  devLoginAllowed: true,
  signInDev: vi.fn(),
  ...overrides,
});

function renderGate() {
  return render(
    <RequireAuth>
      <p>Protected dashboard</p>
    </RequireAuth>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    authState.current = baseAuth();
  });

  it("does not render protected content while the session is resolving", () => {
    authState.current = baseAuth({ isLoading: true });

    renderGate();

    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("shows the sign-in prompt instead of protected content when anonymous", () => {
    renderGate();

    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("renders protected content once authenticated", () => {
    authState.current = baseAuth({ isAuthenticated: true });

    renderGate();

    expect(screen.getByText("Protected dashboard")).toBeInTheDocument();
  });

  it("explains an expired session", () => {
    authState.current = baseAuth({ sessionExpired: true });

    renderGate();

    expect(screen.getByRole("status")).toHaveTextContent(
      /your session has expired/i,
    );
  });

  it("shows a sign-in failure message", () => {
    authState.current = baseAuth({ error: "Unable to sign you in." });

    renderGate();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to sign you in.",
    );
  });

  it("starts Google sign-in from the gate", async () => {
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined);
    authState.current = baseAuth({ loginWithGoogle });

    renderGate();
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });
});
