import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listChannels } from "@/lib/services/messaging-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { MessagesWorkspace } from "@/components/messaging/messages-workspace";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.MESSAGING_USE)) redirect("/dashboard");

  const channels = await listChannels(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Internal channels for your team." />
      <MessagesWorkspace
        initialChannels={channels.map((c) => ({ id: c.id, name: c.name, description: c.description }))}
      />
    </div>
  );
}
