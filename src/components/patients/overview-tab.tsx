import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewTabProps {
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
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

export function OverviewTab(props: OverviewTabProps) {
  const address = [props.addressLine1, props.addressLine2, props.city, props.state, props.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Email" value={props.email} />
          <Field label="Mobile phone" value={props.phoneMobile} />
          <Field label="Home phone" value={props.phoneHome} />
          <Field label="Preferred language" value={props.preferredLanguage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Mailing address" value={address} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Medical record number" value={props.mrn} />
          <Field label="Registered on" value={new Date(props.createdAt).toLocaleDateString()} />
        </CardContent>
      </Card>
    </div>
  );
}
