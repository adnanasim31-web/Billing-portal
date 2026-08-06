import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { ClaimStatus } from "@/types/database.types";

export interface ProviderPortalClaimRow {
  id: string;
  claimNumber: string;
  patientName: string;
  serviceDateFrom: string;
  status: ClaimStatus;
  totalChargeAmount: number;
  balanceAmount: number;
}

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

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function ProviderPortalClaimsTab({ claims }: { claims: ProviderPortalClaimRow[] }) {
  if (claims.length === 0) {
    return <EmptyState icon={ReceiptText} title="No claims yet" description="Claims billed under your NPI will appear here." />;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {claims.map((claim) => (
        <li key={claim.id} className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{claim.claimNumber}</p>
              <Badge variant={STATUS_VARIANT[claim.status]} className="capitalize">
                {claim.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {claim.patientName} · {new Date(`${claim.serviceDateFrom}T00:00:00`).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{currencyFormatter.format(claim.totalChargeAmount)}</p>
            {claim.balanceAmount > 0 && (
              <p className="text-xs text-muted-foreground">{currencyFormatter.format(claim.balanceAmount)} due</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
