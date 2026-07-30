"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";

export interface ArClaimRow {
  id: string;
  claimNumber: string;
  patientName: string;
  patientMrn: string;
  payerName: string | null;
  balanceAmount: number;
  daysOutstanding: number;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function agingVariant(days: number): "secondary" | "warning" | "destructive" {
  if (days <= 30) return "secondary";
  if (days <= 90) return "warning";
  return "destructive";
}

export function ArTable({ claims }: { claims: ArClaimRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<ArClaimRow>[]>(
    () => [
      {
        accessorKey: "claimNumber",
        header: "Claim",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.claimNumber}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.patientName} ({row.original.patientMrn})
            </p>
          </div>
        ),
      },
      {
        accessorKey: "payerName",
        header: "Payer",
        cell: ({ row }) => <span className="text-sm">{row.original.payerName ?? "—"}</span>,
      },
      {
        accessorKey: "balanceAmount",
        header: "Balance",
        cell: ({ row }) => <span className="text-sm font-medium">{formatCurrency(row.original.balanceAmount)}</span>,
      },
      {
        accessorKey: "daysOutstanding",
        header: "Days outstanding",
        cell: ({ row }) => (
          <Badge variant={agingVariant(row.original.daysOutstanding)}>{row.original.daysOutstanding} days</Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={claims}
      emptyTitle="No open balances"
      emptyDescription="Every submitted claim is fully reconciled - nothing needs follow-up right now."
      pageSize={20}
      onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
    />
  );
}
