import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClaimScrubResult } from "@/lib/services/claim-scrubbing";

export function ClaimScrubPanel({ result }: { result: ClaimScrubResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {result.isReadyToSubmit ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              Ready to submit
            </>
          ) : (
            <>
              <CircleAlert className="h-4 w-4 text-destructive" />
              Not ready to submit
            </>
          )}
        </CardTitle>
      </CardHeader>
      {(result.errors.length > 0 || result.warnings.length > 0) && (
        <CardContent className="space-y-3">
          {result.errors.length > 0 && (
            <ul className="space-y-1.5">
              {result.errors.map((error, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          )}
          {result.warnings.length > 0 && (
            <ul className="space-y-1.5">
              {result.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}
