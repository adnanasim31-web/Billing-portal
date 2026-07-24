import { z } from "zod";

/**
 * Format-only validators for the four code types Medical Coding manages.
 * These check shape, not whether the code actually exists in the library -
 * useful later for Claims to sanity-check codes typed outside the picker.
 */
export const CODE_FORMAT_PATTERNS = {
  icd10: /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/i,
  cpt: /^[0-9]{5}$/,
  hcpcs: /^[A-Z][0-9]{4}$/i,
  modifier: /^[A-Z0-9]{2}$/i,
} as const;

export function isValidCodeFormat(codeType: keyof typeof CODE_FORMAT_PATTERNS, code: string): boolean {
  return CODE_FORMAT_PATTERNS[codeType].test(code.trim());
}

export const codingFavoriteSchema = z.object({
  codeType: z.enum(["icd10", "cpt", "hcpcs", "modifier"]),
  code: z.string().min(1).max(20),
});
export type CodingFavoriteInput = z.infer<typeof codingFavoriteSchema>;

export const codingSearchSchema = z.object({
  query: z.string().max(160).optional().or(z.literal("")),
});
export type CodingSearchInput = z.infer<typeof codingSearchSchema>;
