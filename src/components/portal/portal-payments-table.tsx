"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { PAYMENT_METHOD_LABELS } from "@/components/payments/payments-table";
import type { PaymentMethod } from "@/types/database.types";

export interface PortalPaymentRow {
  id: string;
  claimNumber: string;
  providerName: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
}

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function PortalPaymentsTable({ payments }: { payments: PortalPaymentRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<PortalPaymentRow>[]>(
    () => [
      {
        accessorKey: "paymentDate",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(`${row.original.paymentDate}T00:00:00`).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "claimNumber",
        header: "Statement",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.claimNumber}</p>
            <p className="text-xs text-muted-foreground">{row.original.providerName}</p>
          </div>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: ({ row }) => <Badge variant="secondary">{PAYMENT_METHOD_LABELS[row.original.paymentMethod]}</Badge>,
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{currencyFormatter.format(row.original.totalAmount)}</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={payments}
      emptyTitle="No payments yet"
      emptyDescription="Payments you make toward a statement will appear here."
      pageSize={10}
      onRowClick={(payment) => router.push(`/portal/payments/${payment.id}`)}
    />
  );
}
