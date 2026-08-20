"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { extractResumeText } from "@/lib/extractText";

const MAX_CHARS = 20_000;
const MAX_BYTES = 20 * 1024 * 1024;

type ResumeTextAreaProps = {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accent: string;
  disabled?: boolean;
  /** Server PDF parser used when the browser cannot extract enough text. */
  extractPdf?: (file: File) => Promise<string>;
};

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function ResumeTextArea({
  label,
  hint,
  value,
  onChange,
  placeholder,
  accent,
  disabled = false,
  extractPdf,
}: ResumeTextAreaProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (disabled || isExtracting) return;
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("File is larger than 20 MB.");
      return;
    }

    setIsExtracting(true);
    setFileName(file.name);
    try {
      let text = "";
      let usedServer = false;
      try {
        text = await extractResumeText(file);
      } catch (err) {
        if (!isPdfFile(file) || !extractPdf) throw err;
        text = await extractPdf(file);
        usedServer = true;
      }

      let trimmed = text.slice(0, MAX_CHARS).trim();
      if (!usedServer && trimmed.length < 50 && isPdfFile(file) && extractPdf) {
        trimmed = (await extractPdf(file)).slice(0, MAX_CHARS).trim();
      }
      if (!trimmed) {
        setError("No text found in this file. Try pasting the resume below.");
        return;
      }
      onChange(trimmed);
    } catch (err) {
      setFileName(null);
      setError(
        err instanceof Error
          ? err.message
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
    <div className="card p-5 relative overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`}
      />
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-white/80">{label}</label>
        <span className="text-[11px] text-white/40">{hint}</span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!disabled && !isExtracting) fileInputRef.current?.click();
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-4 text-center transition-all ${
          disabled
            ? "cursor-not-allowed border-white/5 opacity-60"
            : dragOver
              ? "cursor-pointer border-indigo-400/70 bg-indigo-500/5"
              : "cursor-pointer border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,application/pdf,text/plain,text/markdown"
          onChange={onFileChange}
          disabled={disabled || isExtracting}
          className="hidden"
        />
        <p className="text-sm text-white/80">
          {isExtracting ? (
            <>Reading {fileName ?? "file"}…</>
          ) : fileName ? (
            <>
              Loaded <span className="font-medium">{fileName}</span>
            </>
          ) : (
            <>
              <span className="font-medium">Upload a resume</span> or drag
              &amp; drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-white/40">
          PDF, TXT, or MD up to 20&nbsp;MB — parsed into the box below
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isExtracting}
        className="mt-3 w-full h-56 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm font-mono leading-relaxed placeholder:text-white/30 focus:border-indigo-400/60 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition disabled:opacity-60"
      />
    </div>
  );
}
