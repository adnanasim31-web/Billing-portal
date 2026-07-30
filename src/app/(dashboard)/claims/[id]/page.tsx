import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getClaimById, scrubClaimById } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLAIM_STATUS_VARIANT, CLAIM_STATUS_LABELS } from "@/components/claims/claims-table";
import { ClaimStatusActions } from "@/components/claims/claim-status-actions";
import { ClaimDiagnosesSection } from "@/components/claims/claim-diagnoses-section";
import { ClaimLinesSection } from "@/components/claims/claim-lines-section";
import { ClaimScrubPanel } from "@/components/claims/claim-scrub-panel";
import { ClaimStatusHistoryTimeline } from "@/components/claims/claim-status-history";
import type { ClaimStatus } from "@/types/database.types";

export const metadata: Metadata = { title: "Claim" };

const EDITABLE_STATUSES = ["draft", "ready"];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString();
}

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CLAIMS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const [detail, scrubResult] = await Promise.all([
    getClaimById(id, user.organizationId),
    scrubClaimById(id, user.organizationId).catch(() => null),
  ]);
  if (!detail) notFound();

  const { claim, diagnoses, lines, history } = detail;

  const patientName = claim.patients ? `${claim.patients.first_name} ${claim.patients.last_name}` : "Unknown patient";
  const providerName = claim.providers
    ? claim.providers.provider_type === "organization"
      ? (claim.providers.organization_name ?? "Unknown provider")
      : `${claim.providers.first_name ?? ""} ${claim.providers.last_name ?? ""}`.trim()
    : "Unknown provider";

  const canManage = hasPermission(user, PERMISSIONS.CLAIMS_MANAGE);
  const canEdit = canManage && EDITABLE_STATUSES.includes(claim.status);

  const diagnosisRows = diagnoses.map((d) => ({
    id: d.id,
    sequence: d.sequence,
    icd10Code: d.icd10_code,
    description: d.icd10_codes?.description ?? "",
  }));

  const lineRows = lines.map((l) => ({
    id: l.id,
    lineNumber: l.line_number,
    procedureCode: l.procedure_code,
    description: l.procedure_codes?.description ?? "",
    modifier1: l.modifier_1,
    modifier2: l.modifier_2,
    diagnosisPointers: l.diagnosis_pointers ?? [],
    units: l.units,
    chargeAmount: Number(l.charge_amount),
  }));

  const historyRows = history.map((h) => ({
    id: h.id,
    fromStatus: h.from_status as ClaimStatus | null,
    toStatus: h.to_status as ClaimStatus,
    note: h.note,
    changedByName: h.profiles ? `${h.profiles.first_name} ${h.profiles.last_name}` : null,
    createdAt: h.created_at,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{claim.claim_number}</h2>
            <Badge variant={CLAIM_STATUS_VARIANT[claim.status]}>{CLAIM_STATUS_LABELS[claim.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {patientName} · {providerName}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" asChild>
            <Link href={`/claims/${claim.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <ClaimStatusActions
        claimId={claim.id}
        status={claim.status}
        canSubmit={hasPermission(user, PERMISSIONS.CLAIMS_SUBMIT)}
        canAppeal={hasPermission(user, PERMISSIONS.CLAIMS_APPEAL)}
        isReadyToSubmit={scrubResult?.isReadyToSubmit ?? false}
      />

      {scrubResult && <ClaimScrubPanel result={scrubResult} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claim details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="Patient"
            value={
              claim.patients ? (
                <Link href={`/patients/${claim.patients.id}`} className="hover:underline">
                  {patientName} ({claim.patients.mrn})
                </Link>
              ) : (
                patientName
              )
            }
          />
          <Field
            label="Provider"
            value={
              claim.providers ? (
                <Link href={`/providers/${claim.providers.id}`} className="hover:underline">
                  {providerName}
                </Link>
              ) : (
                providerName
              )
            }
          />
          <Field
            label="Payer"
            value={
              claim.insurance_companies ? (
                <Link href={`/insurance/${claim.insurance_companies.id}`} className="hover:underline">
                  {claim.insurance_companies.name}
                </Link>
              ) : (
                "No payer selected"
              )
            }
          />
          <Field label="Place of service" value={claim.place_of_service} />
          <Field
            label="Service dates"
            value={`${formatDate(claim.service_date_from)}${
              claim.service_date_to !== claim.service_date_from ? ` - ${formatDate(claim.service_date_to)}` : ""
            }`}
          />
          <Field label="Total charge" value={formatCurrency(Number(claim.total_charge_amount))} />
          <Field label="Total paid" value={formatCurrency(Number(claim.total_paid_amount))} />
          <Field label="Total adjustment" value={formatCurrency(Number(claim.total_adjustment_amount))} />
          {claim.rejection_reason && <Field label="Rejection reason" value={claim.rejection_reason} />}
          {claim.appeal_notes && <Field label="Appeal notes" value={claim.appeal_notes} />}
          {claim.notes && <Field label="Notes" value={claim.notes} />}
        </CardContent>
      </Card>

      <ClaimDiagnosesSection claimId={claim.id} diagnoses={diagnosisRows} canEdit={canEdit} />
      <ClaimLinesSection
        claimId={claim.id}
        lines={lineRows}
        diagnosisSequences={diagnosisRows.map((d) => d.sequence)}
        canEdit={canEdit}
      />
      <ClaimStatusHistoryTimeline history={historyRows} />
    </div>
  );
}
