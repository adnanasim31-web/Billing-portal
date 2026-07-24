import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/current-user-service";
import { getPatientById } from "@/lib/services/patient-service";
import { listPatientInsurance } from "@/lib/services/patient-insurance-service";
import { listPatientDocuments, getSignedDownloadUrl } from "@/lib/services/patient-document-service";
import { listPatientHistory } from "@/lib/services/patient-history-service";
import { listPatientNotes } from "@/lib/services/patient-notes-service";
import { PatientHeader } from "@/components/patients/patient-header";
import { PatientTabs } from "@/components/patients/patient-tabs";

export const metadata: Metadata = { title: "Patient Profile" };

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");

  const { id } = await params;
  const patient = await getPatientById(id, user.organizationId);
  if (!patient) notFound();

  const [policies, documents, history, notes] = await Promise.all([
    listPatientInsurance(id, user.organizationId),
    listPatientDocuments(id, user.organizationId),
    listPatientHistory(id, user.organizationId),
    listPatientNotes(id, user.organizationId),
  ]);

  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      category: doc.category,
      createdAt: doc.created_at,
      downloadUrl: await getSignedDownloadUrl(doc.file_path),
    }))
  );

  return (
    <div className="space-y-6">
      <PatientHeader
        id={patient.id}
        mrn={patient.mrn}
        firstName={patient.first_name}
        lastName={patient.last_name}
        dateOfBirth={patient.date_of_birth}
        sex={patient.sex}
        status={patient.status}
      />

      <PatientTabs
        patientId={patient.id}
        overview={{
          email: patient.email,
          phoneMobile: patient.phone_mobile,
          phoneHome: patient.phone_home,
          addressLine1: patient.address_line1,
          addressLine2: patient.address_line2,
          city: patient.city,
          state: patient.state,
          postalCode: patient.postal_code,
          preferredLanguage: patient.preferred_language,
          mrn: patient.mrn,
          createdAt: patient.created_at,
        }}
        insurance={policies.map((p) => ({
          id: p.id,
          rank: p.rank,
          payerName: p.payer_name,
          planName: p.plan_name,
          policyNumber: p.policy_number,
          groupNumber: p.group_number,
          subscriberName: p.subscriber_name,
          subscriberRelationship: p.subscriber_relationship,
          effectiveDate: p.effective_date,
          terminationDate: p.termination_date,
          isActive: p.is_active,
        }))}
        documents={documentsWithUrls}
        history={history.map((h) => ({
          id: h.id,
          entryType: h.entry_type,
          description: h.description,
          onsetDate: h.onset_date,
          status: h.status,
          createdAt: h.created_at,
        }))}
        notes={notes.map((n) => ({
          id: n.id,
          noteType: n.note_type,
          body: n.body,
          isPinned: n.is_pinned,
          createdAt: n.created_at,
          authorName: n.profiles ? `${n.profiles.first_name} ${n.profiles.last_name}` : "Unknown",
        }))}
      />
    </div>
  );
}
