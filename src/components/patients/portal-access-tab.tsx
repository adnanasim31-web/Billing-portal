"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InviteLinkDialog } from "@/components/shared/invite-link-dialog";

export interface PortalAccessStatus {
  state: "none" | "pending" | "active";
  email?: string;
  lastLoginAt?: string | null;
  expiresAt?: string;
}

export function PortalAccessTab({ patientId, status }: { patientId: string; status: PortalAccessStatus }) {
  const router = useRouter();
  const [isInviting, setIsInviting] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  async function handleInvite() {
    setIsInviting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/portal-invite`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to send portal invite");
        return;
      }
      if (data.emailSent) {
        toast.success(`Invite emailed to ${data.email}`);
      } else {
        setInviteUrl(data.inviteUrl);
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Patient portal access</CardTitle>
          <CardDescription>
            Lets this patient sign in separately to view their statements and balance, and make a demo payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {status.state === "active" && (
              <>
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3" />
                  Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {status.lastLoginAt
                    ? `Last signed in ${new Date(status.lastLoginAt).toLocaleString()}`
                    : "Hasn't signed in yet"}
                </span>
              </>
            )}
            {status.state === "pending" && (
              <>
                <Badge variant="warning">
                  <Mail className="h-3 w-3" />
                  Invitation pending
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Expires {status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : "soon"}
                </span>
              </>
            )}
            {status.state === "none" && <span className="text-sm text-muted-foreground">No portal access yet.</span>}
          </div>

          {status.state !== "active" && (
            <Button onClick={handleInvite} disabled={isInviting}>
              {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
              {status.state === "pending" ? "Resend invite" : "Send portal invite"}
            </Button>
          )}
        </CardContent>
      </Card>

      <InviteLinkDialog
        url={inviteUrl}
        onOpenChange={(open) => !open && setInviteUrl(null)}
        description="No email service is configured, so share this link with the patient yourself - it lets them set a password and activate their portal account."
      />
    </>
  );
}
