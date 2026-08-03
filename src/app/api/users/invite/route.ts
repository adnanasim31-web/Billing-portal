import { NextResponse } from "next/server";
import { inviteUserSchema } from "@/lib/validations/auth";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { inviteUser } from "@/lib/services/user-service";
import { sendEmail } from "@/lib/email";
import { renderInviteEmail } from "@/lib/email-templates";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to invite users" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { rawToken } = await inviteUser({
    organizationId: user.organizationId,
    email: parsed.data.email,
    roleId: parsed.data.roleId,
    invitedBy: user.id,
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${rawToken}`;

  const emailSent = await sendEmail({
    to: parsed.data.email,
    subject: "You've been invited to MedBill RCM Suite",
    html: renderInviteEmail({
      heading: "You've been invited",
      body: "You've been invited to join your organization's MedBill RCM Suite workspace. Click below to set up your account.",
      actionLabel: "Accept invitation",
      actionUrl: inviteUrl,
    }),
  });

  return NextResponse.json({ ok: true, emailSent, inviteUrl: emailSent ? undefined : inviteUrl });
}
