import Link from "next/link";
import { Plus, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { CLAIM_STATUS_VARIANT, CLAIM_STATUS_LABELS } from "@/components/claims/claims-table";
import type { ClaimStatus } from "@/types/database.types";

export interface ProviderClaimRow {
  id: string;
  claimNumber: string;
  patientName: string;
  totalChargeAmount: number;
  status: ClaimStatus;
}

export function ProviderClaimsTab({ providerId, claims }: { providerId: string; claims: ProviderClaimRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" asChild>
          <Link href={`/claims/new?providerId=${providerId}`}>
            <Plus className="h-4 w-4" />
            Create claim
          </Link>
        </Button>
      </div>

      {claims.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No claims yet" description="Create this provider's first claim." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {claims.map((claim) => (
            <li key={claim.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/claims/${claim.id}`} className="text-sm font-medium hover:underline">
                  {claim.claimNumber}
                </Link>
                <p className="text-xs text-muted-foreground">{claim.patientName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {claim.totalChargeAmount.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                </span>
                <Badge variant={CLAIM_STATUS_VARIANT[claim.status]}>{CLAIM_STATUS_LABELS[claim.status]}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
