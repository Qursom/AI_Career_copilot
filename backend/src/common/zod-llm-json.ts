import { z } from 'zod';

/**
 * Gemini often returns numeric fields as strings; normalize before Zod.
 */
export const zScore0to100 = z.preprocess((v) => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.round(v);
  }
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/[^\d-]/g, ''), 10);
    if (!Number.isNaN(n)) return n;
  }
  return v;
}, z.number().int().min(0).max(100));

function toUnknownArray(v: unknown): unknown[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return [v];
  return [];
}

/** Primitives and JSON for objects/arrays; avoids `no-base-to-string` on `unknown`. */
function unknownToScalarString(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x == null) return '';
  if (x !== null && typeof x === 'object') {
    return JSON.stringify(x);
  }
  if (typeof x === 'function') {
    return '[function]';
  }
  if (
    typeof x === 'number' ||
    typeof x === 'boolean' ||
    typeof x === 'bigint'
  ) {
    return String(x);
  }
  if (typeof x === 'symbol') return x.toString();
  return '';
}

/**
 * Deduplicated trimmed strings, tolerating null/non-array model output.
 */
export function zStringList(minItems: number, maxItems: number) {
  return z
    .preprocess(toUnknownArray, z.array(z.unknown()))
    .transform((arr) =>
      Array.from(
        new Set(
          arr
            .map((x) => unknownToScalarString(x))
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        ),
      ),
    )
    .pipe(z.array(z.string().min(1).max(400)).min(minItems).max(maxItems));
}

/**
 * Prose fields: trim and pad when the model returns text that is slightly
 * too short for our UI/ATS schema (common with Gemini JSON mode).
 */
export function zProse(min: number, max: number) {
  return z
    .preprocess((v) => unknownToScalarString(v), z.string())
    .transform((s) => {
      const t = s.trim().slice(0, max);
      if (t.length >= min) return t;
      if (t.length === 0) {
        return 'Add more specific, role-relevant detail based on the resume and target role.'.slice(
          0,
          max,
        );
      }
      const pad =
        ' Elaborate with metrics, tools, and outcomes for the target role.';
      return (t + pad).slice(0, max);
    })
    .pipe(z.string().min(min).max(max));
}
