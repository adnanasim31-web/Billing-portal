import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser } from "@/lib/services/provider-portal-service";
import { ProviderPortalHeader } from "@/components/provider-portal/provider-portal-header";

export default async function ProviderAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  return (
    <div className="min-h-screen bg-background">
      <ProviderPortalHeader providerName={providerUser.displayName} />
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
