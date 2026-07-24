import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function searchIcd10Codes(query?: string) {
  const admin = createAdminClient();
  let queryBuilder = admin.from("icd10_codes").select("*").order("code").limit(100);
  if (query) {
    const term = query.trim();
    queryBuilder = queryBuilder.or(`code.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data, error } = await queryBuilder;
  if (error) throw error;
  return data;
}

export async function searchProcedureCodes(query?: string, codeSet?: "CPT" | "HCPCS") {
  const admin = createAdminClient();
  let queryBuilder = admin.from("procedure_codes").select("*").order("code").limit(100);
  if (codeSet) queryBuilder = queryBuilder.eq("code_set", codeSet);
  if (query) {
    const term = query.trim();
    queryBuilder = queryBuilder.or(`code.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data, error } = await queryBuilder;
  if (error) throw error;
  return data;
}

export async function searchModifiers(query?: string) {
  const admin = createAdminClient();
  let queryBuilder = admin.from("modifiers").select("*").order("code").limit(100);
  if (query) {
    const term = query.trim();
    queryBuilder = queryBuilder.or(`code.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data, error } = await queryBuilder;
  if (error) throw error;
  return data;
}

export async function listUserFavorites(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coding_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addFavorite(params: {
  userId: string;
  organizationId: string;
  codeType: "icd10" | "cpt" | "hcpcs" | "modifier";
  code: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("coding_favorites").insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    code_type: params.codeType,
    code: params.code,
  });
  if (error && error.code !== "23505") throw error;
}

export async function removeFavorite(params: {
  userId: string;
  codeType: "icd10" | "cpt" | "hcpcs" | "modifier";
  code: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("coding_favorites")
    .delete()
    .eq("user_id", params.userId)
    .eq("code_type", params.codeType)
    .eq("code", params.code);
  if (error) throw error;
}
