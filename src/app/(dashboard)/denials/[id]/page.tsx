import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getDenialById } from "@/lib/services/denial-service";
import { listOrganizationUsers } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DENIAL_STATUS_VARIANT, DENIAL_STATUS_LABELS } from "@/components/denials/denials-table";
import { DenialDetailForm } from "@/components/denials/denial-detail-form";

export const metadata: Metadata = { title: "Denial" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function DenialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.DENIALS_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const [denial, users] = await Promise.all([
    getDenialById(id, user.organizationId),
    listOrganizationUsers(user.organizationId),
  ]);
  if (!denial) notFound();

  const patientName = denial.claims?.patients
    ? `${denial.claims.patients.first_name} ${denial.claims.patients.last_name}`
    : "Unknown patient";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{denial.claims?.claim_number ?? "Unknown claim"}</h2>
          <Badge variant={DENIAL_STATUS_VARIANT[denial.resolution_status]}>
            {DENIAL_STATUS_LABELS[denial.resolution_status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Opened {new Date(denial.created_at).toLocaleString()}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Denial details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field
            label="Claim"
            value={
              denial.claims ? (
                <Link href={`/claims/${denial.claims.id}`} className="hover:underline">
                  {denial.claims.claim_number}
                </Link>
              ) : (
                "Unknown claim"
              )
            }
          />
          <Field
            label="Patient"
            value={
              denial.claims?.patients ? (
                <Link href={`/patients/${denial.claims.patients.id}`} className="hover:underline">
                  {patientName} ({denial.claims.patients.mrn})
                </Link>
              ) : (
                patientName
              )
            }
          />
          <Field label="Triggered by" value={denial.claim_status === "denied" ? "Claim denied" : "Claim rejected"} />
          <Field label="Payer/reason at the time" value={denial.reason_detail} />
          {denial.resolved_at && <Field label="Resolved" value={new Date(denial.resolved_at).toLocaleString()} />}
        </CardContent>
      </Card>

      <DenialDetailForm
        denialId={denial.id}
        canManage={hasPermission(user, PERMISSIONS.DENIALS_MANAGE)}
        assignableUsers={users.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))}
        defaultValues={{
          category: denial.category,
          assignedTo: denial.assigned_to ?? "",
          followUpDate: denial.follow_up_date ?? "",
          resolutionStatus: denial.resolution_status,
          resolutionNotes: denial.resolution_notes ?? "",
        }}
      />
    </div>
  );
}
