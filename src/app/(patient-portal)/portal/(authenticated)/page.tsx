import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPortalUser, getPortalOverview } from "@/lib/services/patient-portal-service";
import { PortalClaimsTable } from "@/components/portal/portal-claims-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "My Statements" };

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function PortalOverviewPage() {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const { claims, totalBalance } = await getPortalOverview(portalUser.patientId, portalUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome, {portalUser.firstName}</h2>
        <p className="text-sm text-muted-foreground">Here are your statements and current balance.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total balance due</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{currencyFormatter.format(totalBalance)}</p>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Statements</h3>
        <PortalClaimsTable
          claims={claims.map((c) => ({
            id: c.id,
            claimNumber: c.claim_number,
            serviceDateFrom: c.service_date_from,
            serviceDateTo: c.service_date_to,
            totalChargeAmount: Number(c.total_charge_amount),
            balanceAmount: Math.max(0, Number(c.balance_amount)),
            status: c.status,
          }))}
        />
      </div>
    </div>
  );
}
