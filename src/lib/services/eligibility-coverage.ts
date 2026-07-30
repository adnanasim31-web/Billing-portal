/**
 * Pure coverage-status logic - no DB access, so it's cheap to unit test.
 * eligibility-service.ts fetches the patient's on-file policy and hands it
 * (plus today's date) to computeCoverageStatus() to decide the result.
 */
import type { EligibilityStatus } from "@/types/database.types";

export interface CoverageSnapshotPolicy {
  isActive: boolean;
  effectiveDate: string | null;
  terminationDate: string | null;
}

export interface CoverageStatusResult {
  status: EligibilityStatus;
  notes: string | null;
}

export function computeCoverageStatus(policy: CoverageSnapshotPolicy | null, todayIso: string): CoverageStatusResult {
  if (!policy) {
    return { status: "error", notes: "No insurance policy on file for this patient." };
  }

  if (!policy.isActive) {
    return { status: "inactive", notes: "The on-file policy is marked inactive." };
  }

  if (policy.effectiveDate && policy.effectiveDate > todayIso) {
    return { status: "inactive", notes: `Coverage is not yet effective (starts ${policy.effectiveDate}).` };
  }

  if (policy.terminationDate && policy.terminationDate < todayIso) {
    return { status: "inactive", notes: `Coverage terminated on ${policy.terminationDate}.` };
  }

  return { status: "active", notes: null };
}
