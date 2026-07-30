"use client";

import { Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/patients/overview-tab";
import { InsuranceTab, type InsurancePolicyRow } from "@/components/patients/insurance-tab";
import { DocumentsTab, type PatientDocumentRow } from "@/components/patients/documents-tab";
import { HistoryTab, type HistoryEntryRow } from "@/components/patients/history-tab";
import { NotesTab, type PatientNoteRow } from "@/components/patients/notes-tab";
import { PatientAppointmentsTab, type PatientAppointmentRow } from "@/components/patients/patient-appointments-tab";
import { PatientClaimsTab, type PatientClaimRow } from "@/components/patients/patient-claims-tab";
import { UpcomingModulePlaceholder } from "@/components/shared/upcoming-module-placeholder";

interface PatientTabsProps {
  patientId: string;
  overview: {
    email: string | null;
    phoneMobile: string | null;
    phoneHome: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    preferredLanguage: string;
    mrn: string;
    createdAt: string;
  };
  insurance: InsurancePolicyRow[];
  documents: PatientDocumentRow[];
  history: HistoryEntryRow[];
  notes: PatientNoteRow[];
  appointments: PatientAppointmentRow[];
  claims: PatientClaimRow[];
}

export function PatientTabs({
  patientId,
  overview,
  insurance,
  documents,
  history,
  notes,
  appointments,
  claims,
}: PatientTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
        <TabsTrigger value="insurance">Insurance ({insurance.length})</TabsTrigger>
        <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
        <TabsTrigger value="history">Medical History ({history.length})</TabsTrigger>
        <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
        <TabsTrigger value="balances">Balances</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab {...overview} />
      </TabsContent>
      <TabsContent value="appointments">
        <PatientAppointmentsTab patientId={patientId} appointments={appointments} />
      </TabsContent>
      <TabsContent value="insurance">
        <InsuranceTab patientId={patientId} policies={insurance} />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentsTab patientId={patientId} documents={documents} />
      </TabsContent>
      <TabsContent value="history">
        <HistoryTab patientId={patientId} entries={history} />
      </TabsContent>
      <TabsContent value="notes">
        <NotesTab patientId={patientId} notes={notes} />
      </TabsContent>
      <TabsContent value="claims">
        <PatientClaimsTab patientId={patientId} claims={claims} />
      </TabsContent>
      <TabsContent value="balances">
        <UpcomingModulePlaceholder icon={Wallet} title="No balance information yet" moduleName="Payment Posting" />
      </TabsContent>
    </Tabs>
  );
}
