"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { ProviderStatus, ProviderType } from "@/types/database.types";

export interface ProviderRow {
  id: string;
  providerType: ProviderType;
  displayName: string;
  npi: string;
  specialty: string;
  phone: string | null;
  email: string | null;
  status: ProviderStatus;
}

const STATUS_VARIANT: Record<ProviderStatus, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  pending: "warning",
};

export function ProvidersTable({ providers }: { providers: ProviderRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<ProviderRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Provider",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              {row.original.providerType === "organization" ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <Stethoscope className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{row.original.displayName}</p>
              <p className="text-xs text-muted-foreground">NPI {row.original.npi}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "specialty",
        header: "Specialty",
        cell: ({ row }) => <span className="text-sm">{row.original.specialty}</span>,
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{row.original.phone ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{row.original.email ?? "No email on file"}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={providers}
      emptyTitle="No providers yet"
      emptyDescription="Add your first rendering provider to get started."
      pageSize={20}
      onRowClick={(provider) => router.push(`/providers/${provider.id}`)}
    />
  );
}
