"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { isExpired, isExpiringSoon } from "@/lib/services/credentialing-status";
import type { CredentialStatus, CredentialType } from "@/types/database.types";

export interface CredentialRow {
  id: string;
  providerId: string;
  providerName: string;
  credentialType: CredentialType;
  credentialNumber: string | null;
  expirationDate: string | null;
  status: CredentialStatus;
}

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  npi: "NPI",
  state_license: "State license",
  dea: "DEA registration",
  malpractice_insurance: "Malpractice insurance",
  board_certification: "Board certification",
  caqh: "CAQH",
  w9: "W9",
  other: "Other",
};

export const CREDENTIAL_STATUS_LABELS: Record<CredentialStatus, string> = {
  active: "Active",
  expired: "Expired",
  pending_renewal: "Pending renewal",
  revoked: "Revoked",
};

export const CREDENTIAL_STATUS_VARIANT: Record<CredentialStatus, "success" | "destructive" | "warning" | "secondary"> = {
  active: "success",
  expired: "destructive",
  pending_renewal: "warning",
  revoked: "secondary",
};

function ExpirationBadge({ expirationDate }: { expirationDate: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  if (isExpired(expirationDate, today)) return <Badge variant="destructive">Expired</Badge>;
  if (isExpiringSoon(expirationDate, today)) return <Badge variant="warning">Expiring soon</Badge>;
  return null;
}

export function CredentialingTable({ credentials }: { credentials: CredentialRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<CredentialRow>[]>(
    () => [
      {
        accessorKey: "providerName",
        header: "Provider",
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.providerName}</span>,
      },
      {
        accessorKey: "credentialType",
        header: "Credential",
        cell: ({ row }) => (
          <div>
            <p className="text-sm">{CREDENTIAL_TYPE_LABELS[row.original.credentialType]}</p>
            {row.original.credentialNumber && (
              <p className="text-xs text-muted-foreground">{row.original.credentialNumber}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "expirationDate",
        header: "Expiration",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {row.original.expirationDate
                ? new Date(`${row.original.expirationDate}T00:00:00`).toLocaleDateString()
                : "—"}
            </span>
            <ExpirationBadge expirationDate={row.original.expirationDate} />
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={CREDENTIAL_STATUS_VARIANT[row.original.status]}>
            {CREDENTIAL_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={credentials}
      emptyTitle="No credentialing records"
      emptyDescription="Add license, DEA, and insurance records from a provider's profile."
      pageSize={20}
      onRowClick={(credential) => router.push(`/providers/${credential.providerId}`)}
    />
  );
}
