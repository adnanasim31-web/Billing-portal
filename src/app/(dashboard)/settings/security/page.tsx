import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/current-user-service";
import { isTwoFactorEnabled } from "@/lib/services/two-factor-service";
import { listUserSessions } from "@/lib/services/session-service";
import { TwoFactorCard } from "@/components/settings/two-factor-card";
import { SessionsList } from "@/components/settings/sessions-list";

export const metadata: Metadata = { title: "Security & Sign-In" };

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [enabled, sessions] = await Promise.all([
    isTwoFactorEnabled(user.id),
    listUserSessions(user.id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <TwoFactorCard initialEnabled={enabled} />
      <SessionsList
        sessions={sessions.map((s) => ({
          id: s.id,
          deviceLabel: s.device_label,
          ipAddress: s.ip_address,
          lastActiveAt: s.last_active_at,
        }))}
      />
    </div>
  );
}
