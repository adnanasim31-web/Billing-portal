import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProviderOverviewTabProps {
  taxId: string | null;
  taxonomyCode: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
  deaNumber: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export function ProviderOverviewTab(props: ProviderOverviewTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Licensing &amp; credentials</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Tax ID" value={props.taxId} />
          <Field label="Taxonomy code" value={props.taxonomyCode} />
          <Field label="License number" value={props.licenseNumber} />
          <Field label="License state" value={props.licenseState} />
          <Field label="DEA number" value={props.deaNumber} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Email" value={props.email} />
          <Field label="Phone" value={props.phone} />
          <Field label="Added on" value={new Date(props.createdAt).toLocaleDateString()} />
        </CardContent>
      </Card>
    </div>
  );
}
