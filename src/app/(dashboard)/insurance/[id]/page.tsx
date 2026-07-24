import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, ShieldCheck } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getInsuranceCompanyById, listPatientsForPayer } from "@/lib/services/insurance-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InsuranceCompanyTabs } from "@/components/insurance/insurance-company-tabs";

export const metadata: Metadata = { title: "Payer Profile" };

export default async function InsuranceCompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.INSURANCE_VIEW)) redirect("/dashboard");

  const { id } = await params;
  const company = await getInsuranceCompanyById(id, user.organizationId);
  if (!company) notFound();

  const policies = await listPatientsForPayer(id, user.organizationId);

  const claimsAddress = [
    company.claims_address_line1,
    company.claims_address_line2,
    company.claims_city,
    company.claims_state,
    company.claims_postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{company.name}</h2>
              <Badge variant={company.is_active ? "success" : "secondary"}>
                {company.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {company.payer_id_code && (
              <p className="text-sm text-muted-foreground">Payer ID {company.payer_id_code}</p>
            )}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/insurance/${company.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit payer
          </Link>
        </Button>
      </div>

      <InsuranceCompanyTabs
        overview={{
          phone: company.phone,
          fax: company.fax,
          website: company.website,
          claimsAddress,
          benefitsNotes: company.benefits_notes,
        }}
        patients={policies.map((p) => ({
          policyId: p.id,
          rank: p.rank,
          policyNumber: p.policy_number,
          isActive: p.is_active,
          patientId: p.patients?.id ?? "",
          mrn: p.patients?.mrn ?? "",
          patientName: p.patients ? `${p.patients.first_name} ${p.patients.last_name}` : "Unknown patient",
        }))}
      />
    </div>
  );
}
