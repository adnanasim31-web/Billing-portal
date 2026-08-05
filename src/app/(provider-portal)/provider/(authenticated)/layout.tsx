import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser } from "@/lib/services/provider-portal-service";
import { ProviderPortalSidebar } from "@/components/provider-portal/provider-portal-sidebar";
import { ProviderPortalHeader } from "@/components/provider-portal/provider-portal-header";

export default async function ProviderAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderPortalSidebar providerName={providerUser.displayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProviderPortalHeader providerName={providerUser.displayName} />
        <main className="mx-auto w-full max-w-4xl flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
