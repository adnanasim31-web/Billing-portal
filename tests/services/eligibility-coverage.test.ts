import { describe, expect, it } from "vitest";
import { computeCoverageStatus } from "@/lib/services/eligibility-coverage";

const TODAY = "2026-06-15";

describe("computeCoverageStatus", () => {
  it("errors when there is no policy on file", () => {
    const result = computeCoverageStatus(null, TODAY);
    expect(result.status).toBe("error");
    expect(result.notes).toContain("No insurance policy on file");
  });

  it("is inactive when the on-file policy is marked inactive", () => {
    const result = computeCoverageStatus(
      { isActive: false, effectiveDate: null, terminationDate: null },
      TODAY
    );
    expect(result.status).toBe("inactive");
    expect(result.notes).toContain("marked inactive");
  });

  it("is active when there is no effective/termination window", () => {
    const result = computeCoverageStatus(
      { isActive: true, effectiveDate: null, terminationDate: null },
      TODAY
    );
    expect(result.status).toBe("active");
    expect(result.notes).toBeNull();
  });

  it("is inactive when coverage has not started yet", () => {
    const result = computeCoverageStatus(
      { isActive: true, effectiveDate: "2026-07-01", terminationDate: null },
      TODAY
    );
    expect(result.status).toBe("inactive");
    expect(result.notes).toContain("not yet effective");
  });

  it("is active on the exact effective date", () => {
    const result = computeCoverageStatus(
      { isActive: true, effectiveDate: TODAY, terminationDate: null },
      TODAY
    );
    expect(result.status).toBe("active");
  });

  it("is inactive when coverage has already terminated", () => {
    const result = computeCoverageStatus(
      { isActive: true, effectiveDate: null, terminationDate: "2026-01-01" },
      TODAY
    );
    expect(result.status).toBe("inactive");
    expect(result.notes).toContain("terminated");
  });

  it("is active on the exact termination date", () => {
    const result = computeCoverageStatus(
      { isActive: true, effectiveDate: null, terminationDate: TODAY },
      TODAY
    );
    expect(result.status).toBe("active");
  });

  it("is active within an open effective/termination window", () => {
    const result = computeCoverageStatus(
      { isActive: true, effectiveDate: "2026-01-01", terminationDate: "2026-12-31" },
      TODAY
    );
    expect(result.status).toBe("active");
  });
});
