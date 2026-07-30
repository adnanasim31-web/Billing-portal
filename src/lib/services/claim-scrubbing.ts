/**
 * Pure claim-readiness scrubbing logic - no DB access, so it's cheap to unit
 * test. claim-service.ts fetches the claim/diagnoses/lines and hands them to
 * scrubClaim() to decide whether a claim is safe to submit.
 */
import { isValidCodeFormat } from "@/lib/validations/coding";

export interface ScrubbableDiagnosis {
  sequence: number;
  icd10Code: string;
}

export interface ScrubbableLine {
  lineNumber: number;
  procedureCode: string;
  modifier1: string | null;
  modifier2: string | null;
  diagnosisPointers: number[];
  units: number;
  chargeAmount: number;
}

export interface ScrubbableClaim {
  payerCompanyId: string | null;
  serviceDateFrom: string;
  serviceDateTo: string;
}

export interface ClaimScrubResult {
  isReadyToSubmit: boolean;
  errors: string[];
  warnings: string[];
}

export function scrubClaim(
  claim: ScrubbableClaim,
  diagnoses: ScrubbableDiagnosis[],
  lines: ScrubbableLine[]
): ClaimScrubResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!claim.payerCompanyId) {
    warnings.push("No payer selected - a payer is required before this claim can be filed electronically.");
  }
  if (new Date(claim.serviceDateTo) < new Date(claim.serviceDateFrom)) {
    errors.push("Service end date cannot be before the service start date.");
  }
  if (diagnoses.length === 0) {
    errors.push("At least one diagnosis is required.");
  }
  if (lines.length === 0) {
    errors.push("At least one procedure line is required.");
  }

  const validSequences = new Set(diagnoses.map((d) => d.sequence));

  for (const dx of diagnoses) {
    if (!isValidCodeFormat("icd10", dx.icd10Code)) {
      errors.push(`Diagnosis #${dx.sequence} (${dx.icd10Code}) is not a valid ICD-10 format.`);
    }
  }

  for (const line of lines) {
    const isCpt = isValidCodeFormat("cpt", line.procedureCode);
    const isHcpcs = isValidCodeFormat("hcpcs", line.procedureCode);
    if (!isCpt && !isHcpcs) {
      errors.push(`Line ${line.lineNumber}: "${line.procedureCode}" is not a valid CPT/HCPCS format.`);
    }
    if (line.modifier1 && !isValidCodeFormat("modifier", line.modifier1)) {
      errors.push(`Line ${line.lineNumber}: modifier "${line.modifier1}" is not a valid modifier format.`);
    }
    if (line.modifier2 && !isValidCodeFormat("modifier", line.modifier2)) {
      errors.push(`Line ${line.lineNumber}: modifier "${line.modifier2}" is not a valid modifier format.`);
    }
    if (line.diagnosisPointers.length === 0) {
      errors.push(`Line ${line.lineNumber} must point to at least one diagnosis.`);
    } else {
      for (const pointer of line.diagnosisPointers) {
        if (!validSequences.has(pointer)) {
          errors.push(`Line ${line.lineNumber} points to diagnosis #${pointer}, which does not exist on this claim.`);
        }
      }
    }
    if (line.chargeAmount <= 0) {
      errors.push(`Line ${line.lineNumber} must have a charge amount greater than zero.`);
    }
    if (line.units <= 0) {
      errors.push(`Line ${line.lineNumber} must have at least 1 unit.`);
    }
  }

  return { isReadyToSubmit: errors.length === 0, errors, warnings };
}
