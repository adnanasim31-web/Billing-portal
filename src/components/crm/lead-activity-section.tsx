"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, Phone, Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { CRM_ACTIVITY_TYPES, type CrmActivityInput } from "@/lib/validations/crm";
import type { CrmActivityType } from "@/types/database.types";

const ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
};

const ACTIVITY_TYPE_ICONS: Record<CrmActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: MessageSquareText,
};

export interface ActivityRow {
  id: string;
  activityType: CrmActivityType;
  body: string;
  authorName: string;
  createdAt: string;
}

export function LeadActivitySection({
  leadId,
  activities,
  canManage,
}: {
  leadId: string;
  activities: ActivityRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [activityType, setActivityType] = React.useState<CrmActivityInput["activityType"]>("note");
  const [body, setBody] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleAdd() {
    if (!body.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add activity");
        return;
      }
      toast.success("Activity logged");
      setBody("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Select value={activityType} onValueChange={(value) => setActivityType(value as CrmActivityType)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACTIVITY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <textarea
              rows={3}
              placeholder="What happened?"
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={!body.trim() || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Log activity
              </Button>
            </div>
          </div>
        )}

        {activities.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No activity logged yet" />
        ) : (
          <ul className="divide-y divide-border">
            {activities.map((activity) => {
              const Icon = ACTIVITY_TYPE_ICONS[activity.activityType];
              return (
                <li key={activity.id} className="flex gap-3 py-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{activity.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACTIVITY_TYPE_LABELS[activity.activityType]} · {activity.authorName} ·{" "}
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
