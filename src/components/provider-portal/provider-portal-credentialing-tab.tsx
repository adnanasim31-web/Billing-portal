import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CREDENTIAL_TYPE_LABELS,
  CREDENTIAL_STATUS_LABELS,
  CREDENTIAL_STATUS_VARIANT,
} from "@/components/credentialing/credentialing-table";
import { isExpired, isExpiringSoon } from "@/lib/services/credentialing-status";
import type { CredentialStatus, CredentialType } from "@/types/database.types";

export interface ProviderPortalCredentialRow {
  id: string;
  credentialType: CredentialType;
  credentialNumber: string | null;
  issuingAuthority: string | null;
  expirationDate: string | null;
  status: CredentialStatus;
}

export function ProviderPortalCredentialingTab({ credentials }: { credentials: ProviderPortalCredentialRow[] }) {
  if (credentials.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No credentials on file"
        description="Your license, DEA, and other credentialing records will appear here."
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {credentials.map((cred) => (
        <li key={cred.id} className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">{CREDENTIAL_TYPE_LABELS[cred.credentialType]}</p>
            <p className="text-xs text-muted-foreground">
              {[cred.credentialNumber, cred.issuingAuthority].filter(Boolean).join(" · ") || "No details on file"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-right">
            {cred.expirationDate && (
              <p className="text-xs text-muted-foreground">
                {isExpired(cred.expirationDate, today)
                  ? "Expired"
                  : isExpiringSoon(cred.expirationDate, today)
                    ? "Expiring soon"
                    : "Expires"}{" "}
                {new Date(`${cred.expirationDate}T00:00:00`).toLocaleDateString()}
              </p>
            )}
            <Badge variant={CREDENTIAL_STATUS_VARIANT[cred.status]}>{CREDENTIAL_STATUS_LABELS[cred.status]}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}
