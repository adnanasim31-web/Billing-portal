import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { scrubClaimById } from "@/lib/services/claim-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CLAIMS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view claims" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const result = await scrubClaimById(id, user.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to scrub claim" },
      { status: 400 }
    );
  }
}
