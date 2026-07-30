"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { ClaimStatus } from "@/types/database.types";

export interface ClaimRow {
  id: string;
  claimNumber: string;
  patientName: string;
  patientMrn: string;
  providerName: string;
  serviceDateFrom: string;
  serviceDateTo: string;
  totalChargeAmount: number;
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

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString();
}

export function ClaimsTable({ claims }: { claims: ClaimRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<ClaimRow>[]>(
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
        accessorKey: "providerName",
        header: "Provider",
        cell: ({ row }) => <span className="text-sm">{row.original.providerName}</span>,
      },
      {
        accessorKey: "serviceDateFrom",
        header: "Service dates",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.serviceDateFrom)}
            {row.original.serviceDateTo !== row.original.serviceDateFrom
              ? ` - ${formatDate(row.original.serviceDateTo)}`
              : ""}
          </span>
        ),
      },
      {
        accessorKey: "totalChargeAmount",
        header: "Charge",
        cell: ({ row }) => <span className="text-sm font-medium">{formatCurrency(row.original.totalChargeAmount)}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={claims}
      emptyTitle="No claims yet"
      emptyDescription="Create a claim to start the billing cycle for a visit."
      pageSize={20}
      onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
    />
  );
}

export { STATUS_VARIANT as CLAIM_STATUS_VARIANT, STATUS_LABELS as CLAIM_STATUS_LABELS };
