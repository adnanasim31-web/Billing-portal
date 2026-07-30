"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { PaymentMethod } from "@/types/database.types";

export interface PaymentRow {
  id: string;
  claimNumber: string;
  payerName: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  totalAmount: number;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  era: "ERA",
  check: "Check",
  credit_card: "Credit card",
  cash: "Cash",
  eft: "EFT",
  other: "Other",
};

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        accessorKey: "payerName",
        header: "Payer",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.payerName}</p>
            <p className="text-xs text-muted-foreground">{row.original.claimNumber}</p>
          </div>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: ({ row }) => <Badge variant="secondary">{METHOD_LABELS[row.original.paymentMethod]}</Badge>,
      },
      {
        accessorKey: "paymentDate",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(`${row.original.paymentDate}T00:00:00`).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => <span className="text-sm font-medium">{formatCurrency(row.original.totalAmount)}</span>,
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={payments}
      emptyTitle="No payments posted yet"
      emptyDescription="Post a payment against a claim to start reconciling it."
      pageSize={20}
      onRowClick={(payment) => router.push(`/payments/${payment.id}`)}
    />
  );
}

export { METHOD_LABELS as PAYMENT_METHOD_LABELS };
