import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { CodingTabs } from "@/components/coding/coding-tabs";

export const metadata: Metadata = { title: "Coding Library" };

export default async function CodingLibraryPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.CODING_VIEW)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coding library"
        description="Browse ICD-10, CPT, HCPCS, and modifier reference codes, and star your most-used ones."
      />
      <CodingTabs />
    </div>
  );
}
