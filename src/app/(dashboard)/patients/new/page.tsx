import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata: Metadata = { title: "Register Patient" };

export default function NewPatientPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Register a new patient" description="Create a patient record and assign an MRN." />
      <PatientForm />
    </div>
  );
}
