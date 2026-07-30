"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { EligibilityStatus } from "@/types/database.types";

export interface EligibilityRow {
  id: string;
  patientName: string;
  patientMrn: string;
  payerName: string | null;
  status: EligibilityStatus;
  checkedAt: string;
}

const STATUS_VARIANT: Record<EligibilityStatus, "success" | "destructive" | "warning"> = {
  active: "success",
  inactive: "destructive",
  error: "warning",
};

const STATUS_LABELS: Record<EligibilityStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  error: "Error",
};

export function EligibilityTable({ checks }: { checks: EligibilityRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<EligibilityRow>[]>(
    () => [
      {
        accessorKey: "patientName",
        header: "Patient",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.patientName}</p>
            <p className="text-xs text-muted-foreground">{row.original.patientMrn}</p>
          </div>
        ),
      },
      {
        accessorKey: "payerName",
        header: "Payer",
        cell: ({ row }) => <span className="text-sm">{row.original.payerName ?? "—"}</span>,
      },
      {
        accessorKey: "checkedAt",
        header: "Checked",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{new Date(row.original.checkedAt).toLocaleString()}</span>
        ),
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
      data={checks}
      emptyTitle="No eligibility checks yet"
      emptyDescription="Run a check to verify a patient's coverage before their visit."
      pageSize={20}
      onRowClick={(check) => router.push(`/eligibility/${check.id}`)}
    />
  );
}

export { STATUS_VARIANT as ELIGIBILITY_STATUS_VARIANT, STATUS_LABELS as ELIGIBILITY_STATUS_LABELS };
