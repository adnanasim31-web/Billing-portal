import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

export interface PayerPatientRow {
  policyId: string;
  rank: string;
  policyNumber: string;
  isActive: boolean;
  patientId: string;
  mrn: string;
  patientName: string;
}

export function PayerPatientsTab({ patients }: { patients: PayerPatientRow[] }) {
  if (patients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No patients on this payer yet"
        description="Patients will show up here once their insurance policy references this payer."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {patients.map((p) => (
        <li key={p.policyId} className="flex items-center justify-between gap-3 p-4">
          <div>
            <Link href={`/patients/${p.patientId}`} className="text-sm font-medium hover:underline">
              {p.patientName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {p.mrn} · Policy #{p.policyNumber} · <span className="capitalize">{p.rank}</span>
            </p>
          </div>
          <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Active" : "Inactive"}</Badge>
        </li>
      ))}
    </ul>
  );
}
