"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { ClaimStatus } from "@/types/database.types";

export interface PortalClaimRow {
  id: string;
  claimNumber: string;
  serviceDateFrom: string;
  serviceDateTo: string;
  totalChargeAmount: number;
  balanceAmount: number;
  status: ClaimStatus;
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

export function PortalClaimsTable({ claims }: { claims: PortalClaimRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<PortalClaimRow>[]>(
    () => [
      {
        accessorKey: "claimNumber",
        header: "Statement",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.claimNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(`${row.original.serviceDateFrom}T00:00:00`).toLocaleDateString()} -{" "}
              {new Date(`${row.original.serviceDateTo}T00:00:00`).toLocaleDateString()}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
      {
        accessorKey: "totalChargeAmount",
        header: "Charged",
        cell: ({ row }) => <span className="text-sm">{currencyFormatter.format(row.original.totalChargeAmount)}</span>,
      },
      {
        accessorKey: "balanceAmount",
        header: "Balance due",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{currencyFormatter.format(row.original.balanceAmount)}</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={claims}
      emptyTitle="No statements yet"
      emptyDescription="Statements will appear here once a claim has been submitted on your behalf."
      pageSize={10}
      onRowClick={(claim) => router.push(`/portal/claims/${claim.id}`)}
    />
  );
}
