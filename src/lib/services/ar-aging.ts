/**
 * Pure AR aging logic - no DB access, so it's cheap to unit test. Bucket
 * boundaries are converted to concrete date ranges (getAgingBucketDateRange)
 * so ar-service.ts can filter/paginate at the database level via Postgrest
 * date comparisons, rather than fetching everything and filtering in JS.
 */
export type AgingBucket = "0_30" | "31_60" | "61_90" | "91_120" | "over_120";

export interface AgingDateRange {
  from: string | null;
  to: string | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toUtcDate(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00Z`);
}

function daysAgoIso(todayIso: string, days: number): string {
  const date = toUtcDate(todayIso);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function calculateDaysOutstanding(anchorDateIso: string, todayIso: string): number {
  const diff = toUtcDate(todayIso).getTime() - toUtcDate(anchorDateIso).getTime();
  return Math.max(0, Math.round(diff / MS_PER_DAY));
}

export function getAgingBucket(daysOutstanding: number): AgingBucket {
  if (daysOutstanding <= 30) return "0_30";
  if (daysOutstanding <= 60) return "31_60";
  if (daysOutstanding <= 90) return "61_90";
  if (daysOutstanding <= 120) return "91_120";
  return "over_120";
}

/** Converts a bucket into concrete [from, to] date bounds on the aging anchor date, inclusive. */
export function getAgingBucketDateRange(bucket: AgingBucket, todayIso: string): AgingDateRange {
  switch (bucket) {
    case "0_30":
      return { from: daysAgoIso(todayIso, 30), to: todayIso };
    case "31_60":
      return { from: daysAgoIso(todayIso, 60), to: daysAgoIso(todayIso, 31) };
    case "61_90":
      return { from: daysAgoIso(todayIso, 90), to: daysAgoIso(todayIso, 61) };
    case "91_120":
      return { from: daysAgoIso(todayIso, 120), to: daysAgoIso(todayIso, 91) };
    case "over_120":
      return { from: null, to: daysAgoIso(todayIso, 121) };
  }
}

export interface AgingSummaryEntry {
  count: number;
  totalBalance: number;
}

export type AgingSummary = Record<AgingBucket, AgingSummaryEntry>;

export interface AgingSummaryInput {
  balanceAmount: number;
  anchorDate: string;
}

const EMPTY_BUCKET: AgingSummaryEntry = { count: 0, totalBalance: 0 };

export function summarizeAging(claims: AgingSummaryInput[], todayIso: string): AgingSummary {
  const summary: AgingSummary = {
    "0_30": { ...EMPTY_BUCKET },
    "31_60": { ...EMPTY_BUCKET },
    "61_90": { ...EMPTY_BUCKET },
    "91_120": { ...EMPTY_BUCKET },
    over_120: { ...EMPTY_BUCKET },
  };

  for (const claim of claims) {
    const bucket = getAgingBucket(calculateDaysOutstanding(claim.anchorDate, todayIso));
    summary[bucket].count += 1;
    summary[bucket].totalBalance += claim.balanceAmount;
  }

  return summary;
}
