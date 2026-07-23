"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OtpInput } from "@/components/auth/otp-input";

type SetupState = {
  qrCodeDataUrl: string;
  secret: string;
  backupCodes: string[];
} | null;

export function TwoFactorCard({ initialEnabled }: { initialEnabled: boolean }) {
  const [isEnabled, setIsEnabled] = React.useState(initialEnabled);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [setup, setSetup] = React.useState<SetupState>(null);
  const [code, setCode] = React.useState("");

  async function startSetup() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unable to start 2FA setup");
        return;
      }
      setSetup(data);
      setDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmSetup() {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Invalid code");
        return;
      }
      toast.success("Two-factor authentication enabled");
      setIsEnabled(true);
      setDialogOpen(false);
      setCode("");
    } finally {
      setIsLoading(false);
    }
  }

  async function disable() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", { method: "POST" });
      if (!res.ok) {
        toast.error("Unable to disable 2FA");
        return;
      }
      toast.success("Two-factor authentication disabled");
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Two-factor authentication
              <Badge variant={isEnabled ? "success" : "secondary"}>{isEnabled ? "Enabled" : "Disabled"}</Badge>
            </CardTitle>
            <CardDescription>Require an authenticator app code in addition to your password.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Works with Google Authenticator, 1Password, Authy, and any standard TOTP app. Backup codes are provided
          in case you lose access to your device.
        </CardContent>
        <CardFooter className="justify-end border-t border-border pt-6">
          {isEnabled ? (
            <Button variant="outline" onClick={disable} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
              Disable 2FA
            </Button>
          ) : (
            <Button onClick={startSetup} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Enable 2FA
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>Scan the QR code with your authenticator app, then enter the 6-digit code.</DialogDescription>
          </DialogHeader>

          {setup && (
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border border-border bg-secondary/40 p-4">
                {/* Data-URI QR generated server-side; next/image requires unoptimized for data URIs */}
                <Image src={setup.qrCodeDataUrl} alt="2FA QR code" width={176} height={176} unoptimized />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Or enter this key manually: <span className="font-mono">{setup.secret}</span>
              </p>

              <div className="rounded-md border border-border bg-secondary/40 p-3">
                <p className="mb-2 text-xs font-medium">Backup codes - store these somewhere safe</p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-muted-foreground">
                  {setup.backupCodes.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </div>

              <OtpInput value={code} onChange={setCode} disabled={isLoading} />
            </div>
          )}

          <DialogFooter>
            <Button onClick={confirmSetup} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm and enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
