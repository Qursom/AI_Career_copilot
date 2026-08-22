import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UploadBox from "./UploadBox";

describe("UploadBox", () => {
  it("does not analyze until a PDF is chosen or enough text is pasted", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<UploadBox onAnalyze={onAnalyze} hasRole />);

    const button = screen.getByRole("button", { name: /analyze resume/i });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onAnalyze).not.toHaveBeenCalled();

    await user.type(
      screen.getByPlaceholderText(/paste your resume/i),
      "Jane Doe is a software engineer with five years of TypeScript and NestJS.",
    );

    expect(button).toBeEnabled();
    await user.click(button);
    expect(onAnalyze).toHaveBeenCalledTimes(1);
    expect(onAnalyze.mock.calls[0][0].text).toMatch(/Jane Doe/);
  });

  it("stays disabled until a target role is selected", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<UploadBox onAnalyze={onAnalyze} hasRole={false} />);

    await user.type(
      screen.getByPlaceholderText(/paste your resume/i),
      "Jane Doe is a software engineer with five years of TypeScript and NestJS.",
    );

    const button = screen.getByRole("button", { name: /analyze resume/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onAnalyze).not.toHaveBeenCalled();
  });
});
