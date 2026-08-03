import { redirect } from "next/navigation";
import { getCurrentPortalUser } from "@/lib/services/patient-portal-service";
import { PortalHeader } from "@/components/portal/portal-header";

export default async function PortalAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader patientName={`${portalUser.firstName} ${portalUser.lastName}`} />
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
