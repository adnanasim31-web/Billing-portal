import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getArAgingSummary } from "@/lib/services/ar-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.AR_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view accounts receivable" }, { status: 403 });
  }

  const summary = await getArAgingSummary(user.organizationId);
  return NextResponse.json(summary);
}
