"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { extractResumeText } from "@/lib/extractText";

type UploadBoxProps = {
  onAnalyze?: (payload: { text?: string; file?: File }) => void;
  isAnalyzing?: boolean;
  /** Analyze stays disabled until a target role is chosen. */
  hasRole?: boolean;
};

const MAX_CHARS = 20000;
const MAX_BYTES = 20 * 1024 * 1024;
const MIN_CHARS = 50;

function hasResumeInput(pdfFile: File | null, text: string): boolean {
  const pdfSelected =
    Boolean(pdfFile) && pdfFile!.name.toLowerCase().endsWith(".pdf");
  return pdfSelected || text.trim().length >= MIN_CHARS;
}


export default function UploadBox({
  onAnalyze,
  isAnalyzing = false,
  hasRole = false,
}: UploadBoxProps) {
  const [text, setText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_CHARS - text.length;
  const canAnalyze =
    hasResumeInput(pdfFile, text) && hasRole && !isAnalyzing && !isExtracting;

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("File is larger than 20 MB.");
      return;
    }

    setFileName(file.name);
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    setIsExtracting(true);
    try {
      const content = await extractResumeText(file);
      const trimmed = content.slice(0, MAX_CHARS);
      setText(trimmed);
      setPdfFile(isPdf ? file : null);
      if (!trimmed.trim()) {
        setError("No text found in this file. Try pasting the text below.");
      }
    } catch (err) {
      setText("");
      // Keep the PDF so Analyze can still send it to the server parser.
      setPdfFile(isPdf ? file : null);
      setError(
        err instanceof Error
          ? isPdf
            ? `${err.message} You can still click Analyze — the server will try to parse the PDF.`
            : err.message
          : "Couldn't read this file. Try pasting the text below.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all px-6 py-10 text-center ${
          dragOver
            ? "border-indigo-400 bg-indigo-500/10 shadow-[0_0_40px_-12px_rgba(99,102,241,0.7)]"
            : "border-white/12 bg-gradient-to-b from-white/[0.05] to-transparent hover:border-indigo-400/40 hover:bg-indigo-500/[0.06]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,application/pdf,text/plain,text/markdown"
          onChange={onFileChange}
          className="hidden"
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/30 to-violet-500/20 shadow-[0_0_28px_-8px_rgba(129,140,248,0.9)]">
          {isExtracting ? (
            <svg
              className="w-5 h-5 animate-spin text-indigo-300"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="3"
              />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-indigo-300"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
            </svg>
          )}
        </div>
        <p className="mt-4 text-sm text-white/85">
          {isExtracting ? (
            <>Reading {fileName ?? "file"}…</>
          ) : fileName ? (
            <>
              Loaded <span className="font-medium text-indigo-100">{fileName}</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-white">Drop your PDF here</span>
              <span className="text-white/50"> or click to browse</span>
            </>
          )}
        </p>
        <p className="mt-1.5 text-xs text-white/40">
          PDF, TXT, or MD · up to 20 MB
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="relative">
        <textarea
          placeholder="…or paste your resume text here"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          className="w-full h-48 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm font-mono leading-relaxed placeholder:text-white/30 focus:border-indigo-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
        />
        <div className="absolute bottom-3 right-4 text-[11px] font-mono text-white/40">
          {remaining.toLocaleString()} chars left
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-white/40">
          PDFs show a text preview here, then the file is parsed again on the
          server. Costs 10 coins.
        </p>
        <button
          type="button"
          disabled={!canAnalyze}
          title={
            canAnalyze
              ? undefined
              : !hasRole
                ? "Select a target role first"
                : "Upload a PDF or paste at least 50 characters first"
          }
          onClick={() => {
            if (!hasRole) {
              setError("Select a target role before analyzing.");
              return;
            }
            if (!hasResumeInput(pdfFile, text)) {
              setError(
                "Upload a PDF or paste your resume before analyzing.",
              );
              return;
            }
            onAnalyze?.(pdfFile ? { file: pdfFile } : { text: text.trim() });
          }}
          className="btn-primary"
        >
          {isAnalyzing ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeOpacity="0.3"
                  strokeWidth="3"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              Analyze resume
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="m5 12 14 0 M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
