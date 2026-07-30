import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listPayments } from "@/lib/services/payment-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PaymentsFilters } from "@/components/payments/payments-filters";
import { PaymentsTable, type PaymentRow } from "@/components/payments/payments-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { PaymentMethod } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Payments" };

interface PaymentsPageProps {
  searchParams: Promise<{ query?: string; method?: string; page?: string }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) redirect("/dashboard");

  const params = await searchParams;
  const method = (params.method as PaymentMethod | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { payments, total } = await listPayments({
    organizationId: user.organizationId,
    query: params.query,
    method,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    claimNumber: p.claims?.claim_number ?? "Unknown claim",
    payerName: p.payer_name,
    paymentMethod: p.payment_method,
    paymentDate: p.payment_date,
    totalAmount: Number(p.total_amount),
  }));

  const canPost = hasPermission(user, PERMISSIONS.PAYMENTS_POST);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description={`${total} payment${total === 1 ? "" : "s"} posted`}
        action={
          canPost ? (
            <Button asChild>
              <Link href="/payments/new">
                <Wallet className="h-4 w-4" />
                Post a payment
              </Link>
            </Button>
          ) : undefined
        }
      />
      <PaymentsFilters />
      <PaymentsTable payments={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
