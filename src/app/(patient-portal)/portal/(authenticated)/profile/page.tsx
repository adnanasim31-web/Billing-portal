import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPortalUser, getPortalProfile } from "@/lib/services/patient-portal-service";
import { PortalProfileForm } from "@/components/portal/portal-profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function PortalProfilePage() {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const profile = await getPortalProfile(portalUser.patientId, portalUser.organizationId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">My profile</h2>
        <p className="text-sm text-muted-foreground">Manage your contact information.</p>
      </div>

      <PortalProfileForm
        fullName={`${portalUser.firstName} ${portalUser.lastName}`}
        email={profile?.email ?? null}
        defaultValues={{
          phoneMobile: profile?.phone_mobile ?? "",
          phoneHome: profile?.phone_home ?? "",
          addressLine1: profile?.address_line1 ?? "",
          addressLine2: profile?.address_line2 ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          postalCode: profile?.postal_code ?? "",
        }}
      />
    </div>
  );
}
