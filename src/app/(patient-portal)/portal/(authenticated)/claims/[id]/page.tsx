import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentPortalUser, getPortalClaimById } from "@/lib/services/patient-portal-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PortalPaymentDialog } from "@/components/portal/portal-payment-dialog";
import type { ClaimStatus } from "@/types/database.types";

export const metadata: Metadata = { title: "Statement" };

const STATUS_VARIANT: Record<ClaimStatus, "success" | "secondary" | "destructive" | "warning" | "default"> = {
  draft: "secondary",
  ready: "default",
  submitted: "warning",
  accepted: "success",
  rejected: "destructive",
  denied: "destructive",
  paid: "success",
  appealed: "warning",
  closed: "secondary",
};

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
  denied: "Denied",
  paid: "Paid",
  appealed: "Appealed",
  closed: "Closed",
};

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function resolveProviderName(
  provider: { provider_type: string; first_name: string | null; last_name: string | null; organization_name: string | null } | null
): string {
  if (!provider) return "Unknown provider";
  return provider.provider_type === "organization"
    ? (provider.organization_name ?? "Unknown provider")
    : `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim();
}

export default async function PortalClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) redirect("/portal/login");

  const { id } = await params;
  const result = await getPortalClaimById(id, portalUser.patientId, portalUser.organizationId);
  if (!result) notFound();

  const { claim, lines, payments } = result;
  const balanceAmount = Math.max(0, Number(claim.balance_amount));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{claim.claim_number}</h2>
            <Badge variant={STATUS_VARIANT[claim.status]}>{STATUS_LABELS[claim.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{resolveProviderName(claim.providers)}</p>
        </div>
        {balanceAmount > 0 && <PortalPaymentDialog claimId={claim.id} balanceAmount={balanceAmount} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Charged</p>
            <p className="mt-0.5 text-sm">{currencyFormatter.format(Number(claim.total_charge_amount))}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Paid</p>
            <p className="mt-0.5 text-sm">{currencyFormatter.format(Number(claim.total_paid_amount))}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Adjustments</p>
            <p className="mt-0.5 text-sm">{currencyFormatter.format(Number(claim.total_adjustment_amount))}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Balance due</p>
            <p className="mt-0.5 text-sm font-semibold">{currencyFormatter.format(balanceAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="text-sm">{line.procedure_codes?.code ?? "-"}</TableCell>
                  <TableCell className="text-sm">{line.procedure_codes?.description ?? "-"}</TableCell>
                  <TableCell className="text-sm">{currencyFormatter.format(Number(line.charge_amount))}</TableCell>
                  <TableCell className="text-sm">{currencyFormatter.format(Number(line.paid_amount))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p>{payment.payer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-medium">{currencyFormatter.format(Number(payment.total_amount))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
