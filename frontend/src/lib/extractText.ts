"use client";

import type {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

// Served from /public by Next.js. Kept in sync via the `postinstall` script
// in package.json which copies it from node_modules/pdfjs-dist/legacy/build.
const WORKER_SRC = "/pdf.worker.min.mjs";

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // The `legacy` build targets older JS and avoids features like
      // Promise.try that pdfjs v5's default build requires.
      const pdfjs = (await import(
        "pdfjs-dist/legacy/build/pdf.mjs"
      )) as PdfJsModule;
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function isTextItem(
  item: TextItem | TextMarkedContent,
): item is TextItem {
  return (item as TextItem).str !== undefined;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const doc: PDFDocumentProxy = await pdfjs.getDocument({ data: buffer })
    .promise;

  const pages: string[] = [];
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();

      let lastY: number | null = null;
      let line = "";
      const lines: string[] = [];

      for (const item of content.items) {
        if (!isTextItem(item)) continue;
        const y = item.transform?.[5] ?? null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 1) {
          if (line.trim()) lines.push(line.trimEnd());
          line = "";
        }
        line += item.str;
        if (item.hasEOL) {
          if (line.trim()) lines.push(line.trimEnd());
          line = "";
        } else if (!item.str.endsWith(" ")) {
          line += " ";
        }
        lastY = y;
      }
      if (line.trim()) lines.push(line.trimEnd());

      pages.push(lines.join("\n"));
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return pages.join("\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

function hasExt(name: string, ext: string): boolean {
  return name.toLowerCase().endsWith(ext);
}

export async function extractResumeText(file: File): Promise<string> {
  const type = (file.type || "").toLowerCase();
  const name = file.name || "";

  if (type === "application/pdf" || hasExt(name, ".pdf")) {
    const text = await extractPdfText(file);
    if (!text) {
      throw new Error(
        "Couldn't extract text from this PDF. It may be a scanned image — try pasting the text instead.",
      );
    }
    return text;
  }

  if (
    type.startsWith("text/") ||
    hasExt(name, ".txt") ||
    hasExt(name, ".md")
  ) {
    return await file.text();
  }

  if (hasExt(name, ".doc") || hasExt(name, ".docx")) {
    throw new Error(
      "Word documents aren't supported yet — please export as PDF or paste the text below.",
    );
  }

  throw new Error(
    `Unsupported file type${name ? ` (${name})` : ""}. Use PDF, TXT, or MD, or paste the text below.`,
  );
}
