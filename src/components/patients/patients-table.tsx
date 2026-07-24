"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PatientStatus } from "@/types/database.types";

export interface PatientRow {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneMobile: string | null;
  email: string | null;
  status: PatientStatus;
}

const STATUS_VARIANT: Record<PatientStatus, "success" | "secondary" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  deceased: "destructive",
};

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<PatientRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Patient",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(row.original.firstName, row.original.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {row.original.firstName} {row.original.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{row.original.mrn}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "dateOfBirth",
        header: "Date of birth",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.dateOfBirth + "T00:00:00").toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="text-sm">
            <p>{row.original.phoneMobile ?? "—"}</p>
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
      data={patients}
      emptyTitle="No patients yet"
      emptyDescription="Register your first patient to get started."
      pageSize={20}
      onRowClick={(patient) => router.push(`/patients/${patient.id}`)}
    />
  );
}
