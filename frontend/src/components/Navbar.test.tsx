import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthStub = Record<string, unknown>;

const authState: { current: AuthStub } = { current: {} };
const push = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const { default: Navbar } = await import("./Navbar");

const USER = {
  id: "mongo-1",
  firebaseUid: "uid-1",
  name: "Qursom",
  email: "qursom@example.com",
  photoUrl: "",
  interviewCoins: 150,
};

const baseAuth = (overrides: AuthStub = {}): AuthStub => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isSigningIn: false,
  isSigningOut: false,
  firebaseEnabled: true,
  loginWithGoogle: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("Navbar", () => {
  beforeEach(() => {
    authState.current = baseAuth();
    push.mockReset();
  });

  it("offers Google sign-in when signed out", () => {
    render(<Navbar />);

    expect(
      screen.getAllByRole("button", { name: /sign in with google/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/coins/i)).not.toBeInTheDocument();
  });

  it("does not show a signed-in or signed-out state while restoring", () => {
    authState.current = baseAuth({ isLoading: true });

    render(<Navbar />);

    expect(
      screen.queryByRole("button", { name: /sign in with google/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Qursom")).not.toBeInTheDocument();
  });

  it("shows the user's name and coin balance when signed in", () => {
    authState.current = baseAuth({ user: USER, isAuthenticated: true });

    render(<Navbar />);

    expect(screen.getAllByText("Qursom").length).toBeGreaterThan(0);
    expect(screen.getAllByText("150 total coins").length).toBeGreaterThan(0);
  });

  it("opens a menu with Dashboard and Logout", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    authState.current = baseAuth({
      user: USER,
      isAuthenticated: true,
      logout,
    });

    render(<Navbar />);
    await userEvent.click(
      screen.getByRole("button", { name: /account menu/i }),
    );

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("menuitem", { name: /logout/i }),
    );
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("signs in with Google from the navbar", async () => {
    const loginWithGoogle = vi.fn().mockResolvedValue(undefined);
    authState.current = baseAuth({ loginWithGoogle });

    render(<Navbar />);
    await userEvent.click(
      screen.getAllByRole("button", { name: /sign in with google/i })[0],
    );

    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });
});
