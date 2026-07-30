import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  summarizeClaimsByStatus,
  summarizeCollections,
  summarizeProviderProduction,
  summarizeDenialCategories,
  calculateDenialRate,
  type ReportClaimRow,
  type ReportDenialRow,
} from "@/lib/services/report-aggregation";
import type { ClaimStatus } from "@/types/database.types";

export interface ReportDateRange {
  from: string;
  to: string;
}

interface EmbeddedProvider {
  provider_type: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
}

function resolveProviderName(provider: EmbeddedProvider | null): string {
  if (!provider) return "Unknown provider";
  return provider.provider_type === "organization"
    ? (provider.organization_name ?? "Unknown provider")
    : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
}

async function fetchClaimsInRange(organizationId: string, range: ReportDateRange): Promise<ReportClaimRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claims")
    .select(
      "status, provider_id, total_charge_amount, total_paid_amount, total_adjustment_amount, providers:provider_id (provider_type, first_name, last_name, organization_name)"
    )
    .eq("organization_id", organizationId)
    .gte("service_date_from", range.from)
    .lte("service_date_from", range.to);
  if (error) throw error;

  return (data ?? []).map((c) => ({
    status: c.status,
    providerId: c.provider_id,
    providerName: resolveProviderName(c.providers),
    totalCharge: Number(c.total_charge_amount),
    totalPaid: Number(c.total_paid_amount),
    totalAdjustment: Number(c.total_adjustment_amount),
  }));
}

async function fetchDenialsInRange(organizationId: string, range: ReportDateRange): Promise<ReportDenialRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claim_denials")
    .select("category")
    .eq("organization_id", organizationId)
    .gte("created_at", `${range.from}T00:00:00Z`)
    .lte("created_at", `${range.to}T23:59:59Z`);
  if (error) throw error;
  return data ?? [];
}

interface MonthBounds {
  from: string;
  to: string;
  label: string;
}

function monthBounds(monthsAgo: number): MonthBounds {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: start.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
  };
}

export interface MonthlyTrendPoint {
  month: string;
  billedAmount: number;
}

/** Used by the dashboard - total charges billed per month, oldest to newest. */
export async function getMonthlyBillingTrend(organizationId: string, monthsBack = 6): Promise<MonthlyTrendPoint[]> {
  const months = Array.from({ length: monthsBack }, (_, i) => monthBounds(monthsBack - 1 - i));
  const claimsByMonth = await Promise.all(
    months.map((m) => fetchClaimsInRange(organizationId, { from: m.from, to: m.to }))
  );
  return months.map((m, i) => ({
    month: m.label,
    billedAmount: summarizeCollections(claimsByMonth[i] ?? []).totalCharge,
  }));
}

export interface ClaimStatusCount {
  status: ClaimStatus;
  count: number;
}

/** Used by the dashboard - all-time claim status mix, not scoped to a date range. */
export async function getAllTimeClaimsStatusCounts(organizationId: string): Promise<ClaimStatusCount[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("claims").select("status").eq("organization_id", organizationId);
  if (error) throw error;

  const counts = new Map<ClaimStatus, number>();
  for (const row of data ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export async function getReportsSummary(organizationId: string, range: ReportDateRange) {
  const [claims, denials] = await Promise.all([
    fetchClaimsInRange(organizationId, range),
    fetchDenialsInRange(organizationId, range),
  ]);

  const billedClaims = claims.filter((c) => c.status !== "draft" && c.status !== "ready");

  return {
    statusSummary: summarizeClaimsByStatus(claims),
    collectionsSummary: summarizeCollections(claims),
    providerProduction: summarizeProviderProduction(claims),
    denialCategorySummary: summarizeDenialCategories(denials),
    denialRate: calculateDenialRate(denials.length, billedClaims.length),
    billedClaimCount: billedClaims.length,
  };
}
