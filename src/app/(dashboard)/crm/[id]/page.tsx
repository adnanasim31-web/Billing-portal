import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getLeadById, listActivitiesForLead } from "@/lib/services/crm-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRM_STAGE_VARIANT, CRM_STAGE_LABELS } from "@/components/crm/leads-table";
import { LeadActivitySection } from "@/components/crm/lead-activity-section";

export const metadata: Metadata = { title: "Lead" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CRM_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const [lead, activities] = await Promise.all([
    getLeadById(id, user.organizationId),
    listActivitiesForLead(id, user.organizationId),
  ]);
  if (!lead) notFound();

  const canManage = hasPermission(user, PERMISSIONS.CRM_MANAGE);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{lead.contact_name}</h2>
            <Badge variant={CRM_STAGE_VARIANT[lead.stage]}>{CRM_STAGE_LABELS[lead.stage]}</Badge>
          </div>
          {lead.company_name && <p className="text-sm text-muted-foreground">{lead.company_name}</p>}
        </div>
        {canManage && (
          <Button variant="outline" asChild>
            <Link href={`/crm/${lead.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone} />
          <Field
            label="Estimated value"
            value={
              lead.estimated_value !== null
                ? Number(lead.estimated_value).toLocaleString(undefined, { style: "currency", currency: "USD" })
                : null
            }
          />
          <Field label="Owner" value={lead.profiles ? `${lead.profiles.first_name} ${lead.profiles.last_name}` : null} />
          <Field label="Source" value={lead.source.replace("_", " ")} />
          {lead.notes && <Field label="Notes" value={lead.notes} />}
        </CardContent>
      </Card>

      <LeadActivitySection
        leadId={lead.id}
        canManage={canManage}
        activities={activities.map((a) => ({
          id: a.id,
          activityType: a.activity_type,
          body: a.body,
          authorName: a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : "Unknown",
          createdAt: a.created_at,
        }))}
      />
    </div>
  );
}
