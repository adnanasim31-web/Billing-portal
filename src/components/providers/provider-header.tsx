import Link from "next/link";
import { Building2, Pencil, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProviderStatus, ProviderType } from "@/types/database.types";

const STATUS_VARIANT: Record<ProviderStatus, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  pending: "warning",
};

interface ProviderHeaderProps {
  id: string;
  providerType: ProviderType;
  displayName: string;
  credentialSuffix: string | null;
  npi: string;
  specialty: string;
  status: ProviderStatus;
}

export function ProviderHeader(props: ProviderHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          {props.providerType === "organization" ? (
            <Building2 className="h-6 w-6" />
          ) : (
            <Stethoscope className="h-6 w-6" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {props.displayName}
              {props.credentialSuffix ? `, ${props.credentialSuffix}` : ""}
            </h2>
            <Badge variant={STATUS_VARIANT[props.status]} className="capitalize">
              {props.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            NPI {props.npi} · {props.specialty}
          </p>
        </div>
      </div>
      <Button variant="outline" asChild>
        <Link href={`/providers/${props.id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit provider
        </Link>
      </Button>
    </div>
  );
}
