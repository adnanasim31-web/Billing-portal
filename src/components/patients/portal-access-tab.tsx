"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
      setInviteUrl(data.inviteUrl);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copied");
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

      <Dialog open={!!inviteUrl} onOpenChange={(open) => !open && setInviteUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portal invite link</DialogTitle>
            <DialogDescription>
              Share this link with the patient - it lets them set a password and activate their portal account.
              There&apos;s no email service configured, so it isn&apos;t sent automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={inviteUrl ?? ""} />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
