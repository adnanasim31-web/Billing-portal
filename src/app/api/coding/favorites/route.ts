import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listUserFavorites, addFavorite, removeFavorite } from "@/lib/services/coding-service";
import { codingFavoriteSchema } from "@/lib/validations/coding";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CODING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the coding library" }, { status: 403 });
  }

  const favorites = await listUserFavorites(user.id);
  return NextResponse.json(favorites);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CODING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the coding library" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = codingFavoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  await addFavorite({
    userId: user.id,
    organizationId: user.organizationId,
    codeType: parsed.data.codeType,
    code: parsed.data.code,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.CODING_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view the coding library" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = codingFavoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  await removeFavorite({ userId: user.id, codeType: parsed.data.codeType, code: parsed.data.code });
  return NextResponse.json({ ok: true });
}
