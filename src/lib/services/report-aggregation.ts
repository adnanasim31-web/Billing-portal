/**
 * Pure report aggregation logic - no DB access, so it's cheap to unit test.
 * report-service.ts fetches the raw claim/denial rows for a date range and
 * hands them to these functions to produce the numbers the Reports page
 * renders.
 */
import type { ClaimStatus, DenialCategory } from "@/types/database.types";

export interface ReportClaimRow {
  status: ClaimStatus;
  providerId: string;
  providerName: string;
  totalCharge: number;
  totalPaid: number;
  totalAdjustment: number;
}

export interface StatusSummaryEntry {
  count: number;
  totalCharge: number;
}

export type ClaimsStatusSummary = Partial<Record<ClaimStatus, StatusSummaryEntry>>;

export function summarizeClaimsByStatus(claims: ReportClaimRow[]): ClaimsStatusSummary {
  const summary: ClaimsStatusSummary = {};
  for (const claim of claims) {
    const entry = summary[claim.status] ?? { count: 0, totalCharge: 0 };
    entry.count += 1;
    entry.totalCharge += claim.totalCharge;
    summary[claim.status] = entry;
  }
  return summary;
}

export interface CollectionsSummary {
  totalCharge: number;
  totalPaid: number;
  totalAdjustment: number;
  totalBalance: number;
  /** Fraction of total charges collected, 0-1. */
  collectionRate: number;
}

export function summarizeCollections(claims: ReportClaimRow[]): CollectionsSummary {
  const totals = claims.reduce(
    (acc, c) => ({
      totalCharge: acc.totalCharge + c.totalCharge,
      totalPaid: acc.totalPaid + c.totalPaid,
      totalAdjustment: acc.totalAdjustment + c.totalAdjustment,
    }),
    { totalCharge: 0, totalPaid: 0, totalAdjustment: 0 }
  );

  return {
    ...totals,
    totalBalance: totals.totalCharge - totals.totalPaid - totals.totalAdjustment,
    collectionRate: totals.totalCharge > 0 ? totals.totalPaid / totals.totalCharge : 0,
  };
}

export interface ProviderProductionEntry {
  providerId: string;
  providerName: string;
  claimCount: number;
  totalCharge: number;
  totalPaid: number;
}

export function summarizeProviderProduction(claims: ReportClaimRow[]): ProviderProductionEntry[] {
  const byProvider = new Map<string, ProviderProductionEntry>();
  for (const claim of claims) {
    const entry = byProvider.get(claim.providerId) ?? {
      providerId: claim.providerId,
      providerName: claim.providerName,
      claimCount: 0,
      totalCharge: 0,
      totalPaid: 0,
    };
    entry.claimCount += 1;
    entry.totalCharge += claim.totalCharge;
    entry.totalPaid += claim.totalPaid;
    byProvider.set(claim.providerId, entry);
  }
  return Array.from(byProvider.values()).sort((a, b) => b.totalCharge - a.totalCharge);
}

export interface ReportDenialRow {
  category: DenialCategory;
}

export type DenialCategorySummary = Partial<Record<DenialCategory, number>>;

export function summarizeDenialCategories(denials: ReportDenialRow[]): DenialCategorySummary {
  const summary: DenialCategorySummary = {};
  for (const denial of denials) {
    summary[denial.category] = (summary[denial.category] ?? 0) + 1;
  }
  return summary;
}

/** Fraction of billed claims that were denied in the same window, 0-1. */
export function calculateDenialRate(denialEventCount: number, billedClaimCount: number): number {
  return billedClaimCount > 0 ? denialEventCount / billedClaimCount : 0;
}

export function toCsv(rows: Record<string, string | number>[]): string {
  const [firstRow] = rows;
  if (!firstRow) return "";
  const headers = Object.keys(firstRow);
  const escapeCell = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCell(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}
