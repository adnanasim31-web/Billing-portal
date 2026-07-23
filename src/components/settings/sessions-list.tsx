"use client";

import * as React from "react";
import { Laptop, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/utils";

export interface SessionRow {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [rows, setRows] = React.useState(sessions);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  async function revoke(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to revoke session");
        return;
      }
      setRows((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session revoked");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Devices currently signed in to your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No other active sessions.</p>}
        {rows.map((session, index) => (
          <React.Fragment key={session.id}>
            {index > 0 && <Separator />}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <Laptop className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{session.deviceLabel ?? "Unknown device"}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? "Unknown IP"} - active {formatRelativeTime(session.lastActiveAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revoke(session.id)}
                disabled={revokingId === session.id}
              >
                {revokingId === session.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Revoke
              </Button>
            </div>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
