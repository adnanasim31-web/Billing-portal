import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ProviderForm } from "@/components/providers/provider-form";

export const metadata: Metadata = { title: "Add Provider" };

export default async function NewProviderPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PROVIDERS_MANAGE)) redirect("/dashboard");

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Add a provider" description="Add a rendering or billing provider to your roster." />
      <ProviderForm />
    </div>
  );
}
