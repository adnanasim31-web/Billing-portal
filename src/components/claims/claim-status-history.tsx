import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLAIM_STATUS_LABELS } from "@/components/claims/claims-table";
import type { ClaimStatus } from "@/types/database.types";

export interface ClaimStatusHistoryEntry {
  id: string;
  fromStatus: ClaimStatus | null;
  toStatus: ClaimStatus;
  note: string | null;
  changedByName: string | null;
  createdAt: string;
}

export function ClaimStatusHistoryTimeline({ history }: { history: ClaimStatusHistoryEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status history</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {history.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="space-y-0.5">
                <p className="text-sm">
                  {entry.fromStatus ? (
                    <>
                      {CLAIM_STATUS_LABELS[entry.fromStatus]} <span className="text-muted-foreground">→</span>{" "}
                    </>
                  ) : (
                    ""
                  )}
                  <span className="font-medium">{CLAIM_STATUS_LABELS[entry.toStatus]}</span>
                </p>
                {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
