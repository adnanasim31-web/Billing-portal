import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser, getProviderPortalMessages } from "@/lib/services/provider-portal-service";
import { ProviderPortalMessagesTab } from "@/components/provider-portal/provider-portal-messages-tab";

export const metadata: Metadata = { title: "Messages" };

export default async function ProviderMessagesPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const messages = await getProviderPortalMessages(providerUser.providerId, providerUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Messages</h2>
        <p className="text-sm text-muted-foreground">Ask your billing office a question - they&apos;ll reply here.</p>
      </div>

      <ProviderPortalMessagesTab
        initialMessages={messages.map((message) => ({
          id: message.id,
          body: message.body,
          senderType: message.sender_type,
          senderName:
            message.sender_type === "staff"
              ? message.profiles
                ? `${message.profiles.first_name} ${message.profiles.last_name}`
                : "Billing office"
              : "You",
          createdAt: message.created_at,
        }))}
      />
    </div>
  );
}
