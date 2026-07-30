"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { CrmLeadStage } from "@/types/database.types";

export interface LeadRow {
  id: string;
  contactName: string;
  companyName: string | null;
  stage: CrmLeadStage;
  estimatedValue: number | null;
  ownerName: string | null;
}

export const CRM_STAGE_LABELS: Record<CrmLeadStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  contract_sent: "Contract sent",
  client: "Client",
  lost: "Lost",
};

export const CRM_STAGE_VARIANT: Record<CrmLeadStage, "secondary" | "default" | "warning" | "success" | "destructive"> = {
  lead: "secondary",
  qualified: "default",
  proposal: "warning",
  contract_sent: "warning",
  client: "success",
  lost: "destructive",
};

function formatCurrency(amount: number | null) {
  if (amount === null) return "—";
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        accessorKey: "contactName",
        header: "Contact",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.contactName}</p>
            {row.original.companyName && <p className="text-xs text-muted-foreground">{row.original.companyName}</p>}
          </div>
        ),
      },
      {
        accessorKey: "ownerName",
        header: "Owner",
        cell: ({ row }) => <span className="text-sm">{row.original.ownerName ?? "Unassigned"}</span>,
      },
      {
        accessorKey: "estimatedValue",
        header: "Estimated value",
        cell: ({ row }) => <span className="text-sm">{formatCurrency(row.original.estimatedValue)}</span>,
      },
      {
        accessorKey: "stage",
        header: "Stage",
        cell: ({ row }) => (
          <Badge variant={CRM_STAGE_VARIANT[row.original.stage]}>{CRM_STAGE_LABELS[row.original.stage]}</Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={leads}
      emptyTitle="No leads yet"
      emptyDescription="Add your first prospective client to start the pipeline."
      pageSize={20}
      onRowClick={(lead) => router.push(`/crm/${lead.id}`)}
    />
  );
}
