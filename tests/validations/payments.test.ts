import { describe, expect, it } from "vitest";
import { paymentSchema, paymentAllocationSchema, paymentSearchSchema } from "@/lib/validations/payments";

describe("paymentSchema", () => {
  const base = {
    claimId: "11111111-1111-1111-1111-111111111111",
    payerName: "Aetna",
    paymentDate: "2026-01-15",
    totalAmount: 150,
  };

  it("accepts a valid payment", () => {
    expect(paymentSchema.safeParse(base).success).toBe(true);
  });

  it("defaults paymentMethod to era", () => {
    const result = paymentSchema.safeParse(base);
    expect(result.success && result.data.paymentMethod).toBe("era");
  });

  it("rejects a zero or negative total amount", () => {
    expect(paymentSchema.safeParse({ ...base, totalAmount: 0 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...base, totalAmount: -10 }).success).toBe(false);
  });

  it("rejects a non-uuid claimId", () => {
    expect(paymentSchema.safeParse({ ...base, claimId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects an empty payer name", () => {
    expect(paymentSchema.safeParse({ ...base, payerName: "" }).success).toBe(false);
  });
});

describe("paymentAllocationSchema", () => {
  const base = {
    claimLineId: "22222222-2222-2222-2222-222222222222",
    paidAmount: 100,
    adjustmentAmount: 20,
  };

  it("accepts a valid allocation", () => {
    expect(paymentAllocationSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a zero-amount allocation (pure adjustment)", () => {
    expect(paymentAllocationSchema.safeParse({ ...base, paidAmount: 0 }).success).toBe(true);
  });

  it("rejects negative amounts", () => {
    expect(paymentAllocationSchema.safeParse({ ...base, paidAmount: -1 }).success).toBe(false);
    expect(paymentAllocationSchema.safeParse({ ...base, adjustmentAmount: -1 }).success).toBe(false);
  });

  it("rejects a non-uuid claimLineId", () => {
    expect(paymentAllocationSchema.safeParse({ ...base, claimLineId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("paymentSearchSchema", () => {
  it("defaults method to all", () => {
    const result = paymentSearchSchema.safeParse({});
    expect(result.success && result.data.method).toBe("all");
  });

  it("accepts a valid method filter", () => {
    expect(paymentSearchSchema.safeParse({ method: "check" }).success).toBe(true);
  });

  it("rejects an invalid method filter", () => {
    expect(paymentSearchSchema.safeParse({ method: "bitcoin" }).success).toBe(false);
  });
});
