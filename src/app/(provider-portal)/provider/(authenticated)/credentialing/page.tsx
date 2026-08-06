import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser, getProviderPortalCredentials } from "@/lib/services/provider-portal-service";
import { ProviderPortalCredentialingTab } from "@/components/provider-portal/provider-portal-credentialing-tab";

export const metadata: Metadata = { title: "My Credentialing" };

export default async function ProviderCredentialingPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const credentials = await getProviderPortalCredentials(providerUser.providerId, providerUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Credentialing</h2>
        <p className="text-sm text-muted-foreground">Your license, DEA, and other credentialing records.</p>
      </div>

      <ProviderPortalCredentialingTab
        credentials={credentials.map((cred) => ({
          id: cred.id,
          credentialType: cred.credential_type,
          credentialNumber: cred.credential_number,
          issuingAuthority: cred.issuing_authority,
          expirationDate: cred.expiration_date,
          status: cred.status,
        }))}
      />
    </div>
  );
}
