import { redirect } from "next/navigation";
import { getCurrentPortalUser } from "@/lib/services/patient-portal-service";
import { PortalSidebar } from "@/components/portal/portal-sidebar";
import { PortalHeader } from "@/components/portal/portal-header";

export default async function PortalAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const fullName = `${portalUser.firstName} ${portalUser.lastName}`;

  return (
    <div className="flex min-h-screen bg-background">
      <PortalSidebar patientName={fullName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader firstName={portalUser.firstName} lastName={portalUser.lastName} />
        <main className="mx-auto w-full max-w-4xl flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
