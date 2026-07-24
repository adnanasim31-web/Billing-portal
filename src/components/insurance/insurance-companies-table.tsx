"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";

export interface InsuranceCompanyRow {
  id: string;
  name: string;
  payerIdCode: string | null;
  phone: string | null;
  isActive: boolean;
}

export function InsuranceCompaniesTable({ companies }: { companies: InsuranceCompanyRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<InsuranceCompanyRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Payer",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{row.original.name}</p>
              {row.original.payerIdCode && (
                <p className="text-xs text-muted-foreground">Payer ID {row.original.payerIdCode}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone ?? "—"}</span>,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={companies}
      emptyTitle="No payers yet"
      emptyDescription="Add your first insurance company to the directory."
      pageSize={20}
      onRowClick={(company) => router.push(`/insurance/${company.id}`)}
    />
  );
}
