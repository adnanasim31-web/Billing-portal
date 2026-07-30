import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listOrganizationUsers } from "@/lib/services/user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "@/components/crm/lead-form";

export const metadata: Metadata = { title: "New Lead" };

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CRM_MANAGE)) redirect("/dashboard");

  const users = await listOrganizationUsers(user.organizationId);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add a lead" description="Track a new prospective client relationship." />
      <LeadForm assignableUsers={users.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))} />
    </div>
  );
}
