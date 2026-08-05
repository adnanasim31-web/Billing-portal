import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentProviderPortalUser,
  getProviderPortalAppointments,
  getProviderPortalClaims,
  getProviderPortalCredentials,
} from "@/lib/services/provider-portal-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderPortalAppointmentsTab } from "@/components/provider-portal/provider-portal-appointments-tab";
import { ProviderPortalClaimsTab } from "@/components/provider-portal/provider-portal-claims-tab";
import { ProviderPortalCredentialingTab } from "@/components/provider-portal/provider-portal-credentialing-tab";

export const metadata: Metadata = { title: "Provider Dashboard" };

function patientName(patient: { first_name: string; last_name: string } | null): string {
  if (!patient) return "Unknown patient";
  return `${patient.first_name} ${patient.last_name}`;
}

export default async function ProviderDashboardPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const [appointments, claims, credentials] = await Promise.all([
    getProviderPortalAppointments(providerUser.providerId, providerUser.organizationId),
    getProviderPortalClaims(providerUser.providerId, providerUser.organizationId),
    getProviderPortalCredentials(providerUser.providerId, providerUser.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome, {providerUser.displayName}</h2>
        <p className="text-sm text-muted-foreground">Your appointment schedule, claims, and credentialing status.</p>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList className="flex-wrap">
          <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
          <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="credentialing">Credentialing ({credentials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <ProviderPortalAppointmentsTab
            appointments={appointments.map((appt) => ({
              id: appt.id,
              patientName: patientName(appt.patients),
              scheduledStart: appt.scheduled_start,
              reason: appt.reason,
              status: appt.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="claims">
          <ProviderPortalClaimsTab
            claims={claims.map((claim) => ({
              id: claim.id,
              claimNumber: claim.claim_number,
              patientName: patientName(claim.patients),
              serviceDateFrom: claim.service_date_from,
              status: claim.status,
              totalChargeAmount: Number(claim.total_charge_amount),
              balanceAmount: Math.max(0, Number(claim.balance_amount ?? 0)),
            }))}
          />
        </TabsContent>

        <TabsContent value="credentialing">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
