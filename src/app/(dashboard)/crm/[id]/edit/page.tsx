import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getLeadById } from "@/lib/services/crm-service";
import { listOrganizationUsers } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "@/components/crm/lead-form";

export const metadata: Metadata = { title: "Edit Lead" };

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CRM_MANAGE)) redirect("/dashboard");

  const { id } = await params;
  const [lead, users] = await Promise.all([
    getLeadById(id, user.organizationId),
    listOrganizationUsers(user.organizationId),
  ]);
  if (!lead) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={`Edit ${lead.contact_name}`} />
      <LeadForm
        leadId={lead.id}
        assignableUsers={users.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))}
        defaultValues={{
          contactName: lead.contact_name,
          companyName: lead.company_name ?? "",
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          stage: lead.stage,
          estimatedValue: lead.estimated_value !== null ? Number(lead.estimated_value) : undefined,
          source: lead.source,
          ownerId: lead.owner_id ?? "",
          notes: lead.notes ?? "",
        }}
      />
    </div>
  );
}
