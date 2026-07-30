import { describe, expect, it } from "vitest";
import {
  summarizeClaimsByStatus,
  summarizeCollections,
  summarizeProviderProduction,
  summarizeDenialCategories,
  calculateDenialRate,
  toCsv,
  type ReportClaimRow,
} from "@/lib/services/report-aggregation";

const claims: ReportClaimRow[] = [
  { status: "paid", providerId: "p1", providerName: "Dr. Smith", totalCharge: 200, totalPaid: 180, totalAdjustment: 20 },
  { status: "paid", providerId: "p1", providerName: "Dr. Smith", totalCharge: 100, totalPaid: 100, totalAdjustment: 0 },
  { status: "denied", providerId: "p2", providerName: "Dr. Lee", totalCharge: 150, totalPaid: 0, totalAdjustment: 0 },
];

describe("summarizeClaimsByStatus", () => {
  it("groups claims by status with counts and total charges", () => {
    const summary = summarizeClaimsByStatus(claims);
    expect(summary.paid).toEqual({ count: 2, totalCharge: 300 });
    expect(summary.denied).toEqual({ count: 1, totalCharge: 150 });
    expect(summary.rejected).toBeUndefined();
  });

  it("returns an empty object for no claims", () => {
    expect(summarizeClaimsByStatus([])).toEqual({});
  });
});

describe("summarizeCollections", () => {
  it("sums charges/paid/adjustments and computes the collection rate", () => {
    const summary = summarizeCollections(claims);
    expect(summary.totalCharge).toBe(450);
    expect(summary.totalPaid).toBe(280);
    expect(summary.totalAdjustment).toBe(20);
    expect(summary.totalBalance).toBe(150);
    expect(summary.collectionRate).toBeCloseTo(280 / 450);
  });

  it("does not divide by zero when there is no charge total", () => {
    const summary = summarizeCollections([]);
    expect(summary.collectionRate).toBe(0);
  });
});

describe("summarizeProviderProduction", () => {
  it("groups by provider and sorts by total charge descending", () => {
    const result = summarizeProviderProduction(claims);
    expect(result).toEqual([
      { providerId: "p1", providerName: "Dr. Smith", claimCount: 2, totalCharge: 300, totalPaid: 280 },
      { providerId: "p2", providerName: "Dr. Lee", claimCount: 1, totalCharge: 150, totalPaid: 0 },
    ]);
  });
});

describe("summarizeDenialCategories", () => {
  it("counts denials per category", () => {
    const summary = summarizeDenialCategories([
      { category: "coding_error" },
      { category: "coding_error" },
      { category: "timely_filing" },
    ]);
    expect(summary.coding_error).toBe(2);
    expect(summary.timely_filing).toBe(1);
  });
});

describe("calculateDenialRate", () => {
  it("computes a fraction", () => {
    expect(calculateDenialRate(5, 20)).toBe(0.25);
  });

  it("does not divide by zero", () => {
    expect(calculateDenialRate(0, 0)).toBe(0);
  });
});

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("produces a header row and data rows", () => {
    const csv = toCsv([
      { status: "paid", claims: 2, totalCharge: 300 },
      { status: "denied", claims: 1, totalCharge: 150 },
    ]);
    expect(csv).toBe("status,claims,totalCharge\npaid,2,300\ndenied,1,150");
  });

  it("quotes cells containing commas or quotes", () => {
    const csv = toCsv([{ note: 'Called payer, said "reprocessing"' }]);
    expect(csv).toBe('note\n"Called payer, said ""reprocessing"""');
  });
});
