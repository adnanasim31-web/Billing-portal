import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/services/current-user-service";
import { listPatients } from "@/lib/services/patient-service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PatientsFilters } from "@/components/patients/patients-filters";
import { PatientsTable, type PatientRow } from "@/components/patients/patients-table";
import { ServerPagination } from "@/components/shared/server-pagination";
import type { PatientStatus } from "@/types/database.types";

const PAGE_SIZE = 20;

export const metadata: Metadata = { title: "Patients" };

interface PatientsPageProps {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");

  const params = await searchParams;
  const status = (params.status as PatientStatus | "all" | undefined) ?? "all";
  const page = params.page ? Number(params.page) : 1;

  const { patients, total } = await listPatients({
    organizationId: user.organizationId,
    query: params.query,
    status,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows: PatientRow[] = patients.map((p) => ({
    id: p.id,
    mrn: p.mrn,
    firstName: p.first_name,
    lastName: p.last_name,
    dateOfBirth: p.date_of_birth,
    phoneMobile: p.phone_mobile,
    email: p.email,
    status: p.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${total} patient${total === 1 ? "" : "s"} on file`}
        action={
          <Button asChild>
            <Link href="/patients/new">
              <UserPlus className="h-4 w-4" />
              Register patient
            </Link>
          </Button>
        }
      />
      <PatientsFilters />
      <PatientsTable patients={rows} />
      <ServerPagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
