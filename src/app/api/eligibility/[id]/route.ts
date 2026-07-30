import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getEligibilityCheckById } from "@/lib/services/eligibility-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.ELIGIBILITY_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view eligibility checks" }, { status: 403 });
  }

  const { id } = await params;
  const check = await getEligibilityCheckById(id, user.organizationId);
  if (!check) return NextResponse.json({ error: "Eligibility check not found" }, { status: 404 });

  return NextResponse.json(check);
}
