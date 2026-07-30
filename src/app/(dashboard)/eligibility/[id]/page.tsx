import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getEligibilityCheckById } from "@/lib/services/eligibility-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ELIGIBILITY_STATUS_VARIANT, ELIGIBILITY_STATUS_LABELS } from "@/components/eligibility/eligibility-table";

export const metadata: Metadata = { title: "Eligibility Check" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function EligibilityCheckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.ELIGIBILITY_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const check = await getEligibilityCheckById(id, user.organizationId);
  if (!check) notFound();

  const patientName = check.patients ? `${check.patients.first_name} ${check.patients.last_name}` : "Unknown patient";
  const providerName = check.providers
    ? check.providers.provider_type === "organization"
      ? (check.providers.organization_name ?? "Unknown provider")
      : `${check.providers.first_name ?? ""} ${check.providers.last_name ?? ""}`.trim()
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{patientName}</h2>
          <Badge variant={ELIGIBILITY_STATUS_VARIANT[check.status]}>{ELIGIBILITY_STATUS_LABELS[check.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Checked {new Date(check.checked_at).toLocaleString()}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coverage snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="Patient"
            value={
              check.patients ? (
                <Link href={`/patients/${check.patients.id}`} className="hover:underline">
                  {patientName} ({check.patients.mrn})
                </Link>
              ) : (
                patientName
              )
            }
          />
          <Field
            label="Provider"
            value={
              check.providers ? (
                <Link href={`/providers/${check.providers.id}`} className="hover:underline">
                  {providerName}
                </Link>
              ) : (
                "Not specified"
              )
            }
          />
          <Field label="Service type" value={check.service_type.replace("_", " ")} />
          <Field label="Payer" value={check.payer_name} />
          <Field label="Plan" value={check.plan_name} />
          <Field label="Policy number" value={check.policy_number} />
          <Field label="Copay" value={check.copay_amount ? `$${Number(check.copay_amount).toFixed(2)}` : null} />
          <Field
            label="Coverage window"
            value={
              check.effective_date || check.termination_date
                ? `${check.effective_date ?? "—"} to ${check.termination_date ?? "present"}`
                : null
            }
          />
          {check.notes && <Field label="Notes" value={check.notes} />}
        </CardContent>
      </Card>
    </div>
  );
}
