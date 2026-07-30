import { describe, expect, it } from "vitest";
import {
  calculateDaysOutstanding,
  getAgingBucket,
  getAgingBucketDateRange,
  summarizeAging,
} from "@/lib/services/ar-aging";

const TODAY = "2026-06-15";

describe("calculateDaysOutstanding", () => {
  it("returns 0 for the same day", () => {
    expect(calculateDaysOutstanding(TODAY, TODAY)).toBe(0);
  });

  it("counts whole days between two dates", () => {
    expect(calculateDaysOutstanding("2026-05-16", TODAY)).toBe(30);
  });

  it("never returns a negative number for a future anchor", () => {
    expect(calculateDaysOutstanding("2026-07-01", TODAY)).toBe(0);
  });
});

describe("getAgingBucket", () => {
  it("buckets boundary values correctly", () => {
    expect(getAgingBucket(0)).toBe("0_30");
    expect(getAgingBucket(30)).toBe("0_30");
    expect(getAgingBucket(31)).toBe("31_60");
    expect(getAgingBucket(60)).toBe("31_60");
    expect(getAgingBucket(61)).toBe("61_90");
    expect(getAgingBucket(90)).toBe("61_90");
    expect(getAgingBucket(91)).toBe("91_120");
    expect(getAgingBucket(120)).toBe("91_120");
    expect(getAgingBucket(121)).toBe("over_120");
    expect(getAgingBucket(500)).toBe("over_120");
  });
});

describe("getAgingBucketDateRange", () => {
  it("returns today as the upper bound for 0_30", () => {
    const range = getAgingBucketDateRange("0_30", TODAY);
    expect(range).toEqual({ from: "2026-05-16", to: "2026-06-15" });
  });

  it("returns a bounded window for a middle bucket", () => {
    const range = getAgingBucketDateRange("31_60", TODAY);
    expect(range).toEqual({ from: "2026-04-16", to: "2026-05-15" });
  });

  it("returns an open-ended lower bound for over_120", () => {
    const range = getAgingBucketDateRange("over_120", TODAY);
    expect(range.from).toBeNull();
    expect(range.to).toBe("2026-02-14");
  });

  it("produces contiguous, non-overlapping buckets", () => {
    const b0_30 = getAgingBucketDateRange("0_30", TODAY);
    const b31_60 = getAgingBucketDateRange("31_60", TODAY);
    const b61_90 = getAgingBucketDateRange("61_90", TODAY);
    const b91_120 = getAgingBucketDateRange("91_120", TODAY);
    const bOver = getAgingBucketDateRange("over_120", TODAY);

    expect(b31_60.to).toBe("2026-05-15");
    expect(b0_30.from).toBe("2026-05-16");
    expect(b61_90.to).toBe("2026-04-15");
    expect(b31_60.from).toBe("2026-04-16");
    expect(b91_120.to).toBe("2026-03-16");
    expect(b61_90.from).toBe("2026-03-17");
    expect(bOver.to).toBe("2026-02-14");
    expect(b91_120.from).toBe("2026-02-15");
  });
});

describe("summarizeAging", () => {
  it("groups claims into the correct buckets and sums balances", () => {
    const summary = summarizeAging(
      [
        { balanceAmount: 100, anchorDate: TODAY }, // 0 days -> 0_30
        { balanceAmount: 50, anchorDate: "2026-05-01" }, // 45 days -> 31_60
        { balanceAmount: 25, anchorDate: "2025-01-01" }, // way over -> over_120
      ],
      TODAY
    );

    expect(summary["0_30"]).toEqual({ count: 1, totalBalance: 100 });
    expect(summary["31_60"]).toEqual({ count: 1, totalBalance: 50 });
    expect(summary.over_120).toEqual({ count: 1, totalBalance: 25 });
    expect(summary["61_90"]).toEqual({ count: 0, totalBalance: 0 });
    expect(summary["91_120"]).toEqual({ count: 0, totalBalance: 0 });
  });

  it("returns all-zero buckets for an empty input", () => {
    const summary = summarizeAging([], TODAY);
    for (const bucket of Object.values(summary)) {
      expect(bucket).toEqual({ count: 0, totalBalance: 0 });
    }
  });

  it("accumulates multiple claims in the same bucket", () => {
    const summary = summarizeAging(
      [
        { balanceAmount: 100, anchorDate: TODAY },
        { balanceAmount: 200, anchorDate: TODAY },
      ],
      TODAY
    );
    expect(summary["0_30"]).toEqual({ count: 2, totalBalance: 300 });
  });
});
