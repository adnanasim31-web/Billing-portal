import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getClaimById } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentForm } from "@/components/payments/payment-form";
import type { PaymentInput } from "@/lib/validations/payments";

export const metadata: Metadata = { title: "Post Payment" };

interface NewPaymentPageProps {
  searchParams: Promise<{ claimId?: string }>;
}

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_POST)) redirect("/dashboard");

  const params = await searchParams;
  let initialClaimLabel: string | undefined;
  let defaultValues: Partial<PaymentInput> | undefined;

  if (params.claimId) {
    const detail = await getClaimById(params.claimId, user.organizationId);
    if (detail) {
      initialClaimLabel = detail.claim.claim_number;
      defaultValues = {
        claimId: detail.claim.id,
        payerName: detail.claim.insurance_companies?.name ?? "",
      };
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Post a payment" description="Record an ERA/EOB or manual payment against a claim." />
      <PaymentForm defaultValues={defaultValues} initialClaimLabel={initialClaimLabel} />
    </div>
  );
}
