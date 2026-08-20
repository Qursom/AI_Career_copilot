import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GoogleSignInButton from "./GoogleSignInButton";

describe("GoogleSignInButton", () => {
  it("renders the Google call to action", () => {
    render(<GoogleSignInButton onClick={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeEnabled();
  });

  it("calls back when clicked", async () => {
    const onClick = vi.fn();
    render(<GoogleSignInButton onClick={onClick} />);

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the signing-in state and blocks further clicks", async () => {
    const onClick = vi.fn();
    render(<GoogleSignInButton onClick={onClick} loading />);

    const button = screen.getByRole("button", { name: /signing you in/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
