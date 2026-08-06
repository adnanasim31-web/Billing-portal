import { describe, expect, it } from "vitest";
import { paymentRefundSchema } from "@/lib/validations/payment-refunds";

describe("paymentRefundSchema", () => {
  const base = {
    paymentAllocationId: "11111111-1111-1111-1111-111111111111",
    amount: 40,
    reason: "overpayment" as const,
  };

  it("accepts a valid refund", () => {
    expect(paymentRefundSchema.safeParse(base).success).toBe(true);
  });

  it("accepts optional notes", () => {
    expect(paymentRefundSchema.safeParse({ ...base, notes: "Patient overpaid at checkout" }).success).toBe(true);
  });

  it("rejects a zero amount", () => {
    expect(paymentRefundSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(paymentRefundSchema.safeParse({ ...base, amount: -10 }).success).toBe(false);
  });

  it("rejects an invalid reason", () => {
    expect(paymentRefundSchema.safeParse({ ...base, reason: "not_a_reason" }).success).toBe(false);
  });

  it("rejects a non-uuid payment allocation id", () => {
    expect(paymentRefundSchema.safeParse({ ...base, paymentAllocationId: "not-a-uuid" }).success).toBe(false);
  });
});
