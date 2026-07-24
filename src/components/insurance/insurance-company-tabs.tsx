"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayerPatientsTab, type PayerPatientRow } from "@/components/insurance/payer-patients-tab";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

interface InsuranceCompanyTabsProps {
  overview: {
    phone: string | null;
    fax: string | null;
    website: string | null;
    claimsAddress: string;
    benefitsNotes: string | null;
  };
  patients: PayerPatientRow[];
}

export function InsuranceCompanyTabs({ overview, patients }: InsuranceCompanyTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="patients">Patients ({patients.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Phone" value={overview.phone} />
              <Field label="Fax" value={overview.fax} />
              <Field label="Website" value={overview.website} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claims address</CardTitle>
            </CardHeader>
            <CardContent>
              <Field label="Address" value={overview.claimsAddress} />
            </CardContent>
          </Card>
          {overview.benefitsNotes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Benefits notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{overview.benefitsNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="patients">
        <PayerPatientsTab patients={patients} />
      </TabsContent>
    </Tabs>
  );
}
