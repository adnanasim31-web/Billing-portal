import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listCredentialsNeedingExpirationNotice,
  markCredentialsNotified,
} from "@/lib/services/credentialing-service";
import { resolveProviderDisplayName } from "@/lib/services/provider-display-name";
import { sendEmail } from "@/lib/email";
import { renderInviteEmail } from "@/lib/email-templates";
import type { CredentialType } from "@/types/database.types";

// Duplicated from credentialing-table.tsx's CREDENTIAL_TYPE_LABELS rather
// than imported - that file is a "use client" component, and importing it
// here would pull its whole client bundle (Badge, DataTable, react-table)
// into this server route for the sake of one small labels object.
const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  npi: "NPI",
  state_license: "State license",
  dea: "DEA registration",
  malpractice_insurance: "Malpractice insurance",
  board_certification: "Board certification",
  caqh: "CAQH",
  w9: "W9",
  other: "Other",
};

/**
 * Vercel Cron hits this daily (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when that
 * env var is set on the project - this route rejects anything else so the
 * endpoint can't be used to spam providers by anyone who finds the URL.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await listCredentialsNeedingExpirationNotice();
  if (credentials.length === 0) {
    return NextResponse.json({ providersNotified: 0, credentialsNotified: 0 });
  }

  const byProvider = new Map<string, typeof credentials>();
  for (const credential of credentials) {
    const list = byProvider.get(credential.provider_id) ?? [];
    list.push(credential);
    byProvider.set(credential.provider_id, list);
  }

  const admin = createAdminClient();
  let providersNotified = 0;
  const notifiedCredentialIds: string[] = [];

  for (const [providerId, providerCredentials] of byProvider) {
    // No portal account means nowhere to send the email and nothing the
    // provider could do about it from the portal anyway - skip without
    // marking notified, so this is retried once an account exists.
    const { data: account } = await admin
      .from("provider_portal_accounts")
      .select("email")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (!account) continue;

    const providerRecord = providerCredentials[0]?.providers;
    const providerName = providerRecord ? resolveProviderDisplayName(providerRecord) : "there";

    const items = providerCredentials
      .map((c) => `${CREDENTIAL_TYPE_LABELS[c.credential_type]} - expires ${c.expiration_date}`)
      .join("<br />");

    const emailSent = await sendEmail({
      to: account.email,
      subject: "Credentials expiring soon",
      html: renderInviteEmail({
        heading: "Credentials expiring soon",
        body: `Hi ${providerName}, the following credentials on file are expiring within 30 days:<br /><br />${items}`,
        actionLabel: "View credentialing",
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/credentialing`,
      }),
    });

    // Only mark notified once the email actually went out - if SMTP isn't
    // configured, sendEmail returns false rather than throwing, and this
    // sweep should retry tomorrow instead of silently giving up forever.
    if (emailSent) {
      providersNotified += 1;
      notifiedCredentialIds.push(...providerCredentials.map((c) => c.id));
    }
  }

  await markCredentialsNotified(notifiedCredentialIds);

  return NextResponse.json({ providersNotified, credentialsNotified: notifiedCredentialIds.length });
}
