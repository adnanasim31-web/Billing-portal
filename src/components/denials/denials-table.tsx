"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { DenialCategory, DenialResolutionStatus } from "@/types/database.types";

export interface DenialRow {
  id: string;
  claimNumber: string;
  patientName: string;
  category: DenialCategory;
  resolutionStatus: DenialResolutionStatus;
  followUpDate: string | null;
  createdAt: string;
}

const RESOLUTION_VARIANT: Record<DenialResolutionStatus, "secondary" | "warning" | "success" | "destructive"> = {
  open: "destructive",
  in_progress: "warning",
  appealed: "warning",
  resolved: "success",
  written_off: "secondary",
};

const RESOLUTION_LABELS: Record<DenialResolutionStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  appealed: "Appealed",
  resolved: "Resolved",
  written_off: "Written off",
};

const CATEGORY_LABELS: Record<DenialCategory, string> = {
  eligibility: "Eligibility",
  authorization: "Authorization",
  coding_error: "Coding error",
  timely_filing: "Timely filing",
  duplicate_claim: "Duplicate claim",
  medical_necessity: "Medical necessity",
  documentation: "Documentation",
  other: "Other",
};

export function DenialsTable({ denials }: { denials: DenialRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<DenialRow>[]>(
    () => [
      {
        accessorKey: "claimNumber",
        header: "Claim",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.claimNumber}</p>
            <p className="text-xs text-muted-foreground">{row.original.patientName}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <span className="text-sm">{CATEGORY_LABELS[row.original.category]}</span>,
      },
      {
        accessorKey: "followUpDate",
        header: "Follow-up",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.followUpDate
              ? new Date(`${row.original.followUpDate}T00:00:00`).toLocaleDateString()
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "resolutionStatus",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={RESOLUTION_VARIANT[row.original.resolutionStatus]}>
            {RESOLUTION_LABELS[row.original.resolutionStatus]}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={denials}
      emptyTitle="No denials on the worklist"
      emptyDescription="Denied and rejected claims will show up here automatically."
      pageSize={20}
      onRowClick={(denial) => router.push(`/denials/${denial.id}`)}
    />
  );
}

export { RESOLUTION_VARIANT as DENIAL_STATUS_VARIANT, RESOLUTION_LABELS as DENIAL_STATUS_LABELS, CATEGORY_LABELS as DENIAL_CATEGORY_LABELS };
