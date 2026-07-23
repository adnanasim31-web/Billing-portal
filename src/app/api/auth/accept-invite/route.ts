import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { passwordSchema } from "@/lib/validations/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const admin = createAdminClient();
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");

  const { data: invitation, error: inviteError } = await admin
    .from("invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteError || !invitation) {
    return NextResponse.json({ error: "This invitation link is invalid or has expired." }, { status: 400 });
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    await admin.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
    return NextResponse.json({ error: "This invitation has expired." }, { status: 400 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      organization_id: invitation.organization_id,
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Unable to create your account" },
      { status: 400 }
    );
  }

  await admin.from("profiles").update({ status: "active" }).eq("id", created.user.id);

  await admin.from("user_roles").insert({
    user_id: created.user.id,
    role_id: invitation.role_id,
    organization_id: invitation.organization_id,
    assigned_by: invitation.invited_by,
  });

  await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  await recordAuditLog({
    organizationId: invitation.organization_id,
    userId: created.user.id,
    action: "auth.invitation_accepted",
    entityType: "invitation",
    entityId: invitation.id,
  });

  return NextResponse.json({ ok: true });
}
