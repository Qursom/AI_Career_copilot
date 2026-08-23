import { render, screen } from "@testing-library/react";
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

type AuthStub = Record<string, unknown>;
const authState: { current: AuthStub } = { current: {} };
const linkEmailPassword = vi.fn().mockResolvedValue(undefined);
const linkGoogle = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

const { default: AccountAuthCard } = await import("./AccountAuthCard");

function stub(providers: string[]): AuthStub {
  return {
    user: USER,
    firebaseEnabled: true,
    firebaseEmail: USER.email,
    emailVerified: true,
    authProviders: providers,
    isLinking: false,
    error: null,
    linkEmailPassword,
    linkGoogle,
    requestEmailVerification: vi.fn(),
  };
}

describe("AccountAuthCard", () => {
  beforeEach(() => {
    linkEmailPassword.mockClear();
    linkGoogle.mockClear();
    authState.current = stub(["google.com"]);
  });

  it("offers Add password when Google is the only provider", () => {
    render(<AccountAuthCard />);
    expect(
      screen.getByRole("button", { name: "Add password" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Connect Google" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Google").length).toBeGreaterThan(0);
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });

  it("offers Connect Google when password is the only provider", () => {
    authState.current = stub(["password"]);
    render(<AccountAuthCard />);
    expect(
      screen.getByRole("button", { name: "Connect Google" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add password" }),
    ).not.toBeInTheDocument();
  });

  it("shows Connected for both methods when they share the same uid", () => {
    authState.current = stub(["google.com", "password"]);
    render(<AccountAuthCard />);
    expect(
      screen.queryByRole("button", { name: "Add password" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Connect Google" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Connected").length).toBeGreaterThanOrEqual(2);
  });

  it("does not call link until the user chooses Add password", async () => {
    render(<AccountAuthCard />);
    await userEvent.type(
      screen.getByPlaceholderText("New password"),
      "secret1",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Confirm password"),
      "secret1",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add password" }));
    expect(linkEmailPassword).toHaveBeenCalledWith("secret1", USER.email);
  });
});
