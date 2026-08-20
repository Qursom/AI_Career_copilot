import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ResumeTextArea from "./ResumeTextArea";

vi.mock("@/lib/extractText", () => ({
  extractResumeText: vi.fn(async (file: File) => {
    if (file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Couldn't extract text from this PDF.");
    }
    return "Jane Doe — Senior Frontend Engineer with five years of TypeScript, React, and design systems work.";
  }),
}));

describe("ResumeTextArea", () => {
  it("parses an uploaded text file into the textarea", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const resumeBody =
      "Jane Doe — Senior Frontend Engineer with five years of TypeScript, React, and design systems work.";

    render(
      <ResumeTextArea
        label="Your resume"
        hint="Upload or paste"
        value=""
        onChange={onChange}
        placeholder="Paste here"
        accent="from-indigo-500/30 to-violet-500/10"
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([resumeBody], "resume.txt", { type: "text/plain" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(resumeBody);
    });
    expect(screen.getByText(/Loaded/)).toBeInTheDocument();
    expect(screen.getByText("resume.txt")).toBeInTheDocument();
  });

  it("falls back to the server parser when browser PDF extraction fails", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const serverText =
      "Priya Raman — Staff Data Engineer building Airflow and Snowflake pipelines for analytics teams.";
    const extractPdf = vi.fn().mockResolvedValue(serverText);

    render(
      <ResumeTextArea
        label="Your resume"
        hint="Upload or paste"
        value=""
        onChange={onChange}
        placeholder="Paste here"
        accent="from-indigo-500/30 to-violet-500/10"
        extractPdf={extractPdf}
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["%PDF-1.4 not really a pdf"], "resume.pdf", {
      type: "application/pdf",
    });
    await user.upload(input, file);

    await waitFor(() => {
      expect(extractPdf).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(serverText);
    });
  });

  it("still allows typing into the textarea", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ResumeTextArea
        label="Your resume"
        hint="Upload or paste"
        value=""
        onChange={onChange}
        placeholder="Paste here"
        accent="from-indigo-500/30 to-violet-500/10"
      />,
    );

    await user.type(screen.getByPlaceholderText("Paste here"), "Hello");
    expect(onChange).toHaveBeenCalled();
  });
});
