import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { AppointmentInput, AppointmentStatusInput } from "@/lib/validations/appointments";
import type { AppointmentStatus, Database } from "@/types/database.types";

const OVERLAP_ERROR = "This provider already has an appointment during that time";

function toTimestamps(date: string, startTime: string, endTime: string) {
  // Simplification: treats date+time as UTC. A per-organization timezone
  // (see README Future Improvements) is needed before this is correct for
  // practices outside UTC.
  return {
    scheduled_start: new Date(`${date}T${startTime}:00Z`).toISOString(),
    scheduled_end: new Date(`${date}T${endTime}:00Z`).toISOString(),
  };
}

export interface ListAppointmentsParams {
  organizationId: string;
  date?: string;
  providerId?: string;
  status?: AppointmentStatus | "all";
}

export async function listAppointments(params: ListAppointmentsParams) {
  const admin = createAdminClient();
  let queryBuilder = admin
    .from("appointments")
    .select(
      "*, patients:patient_id (id, mrn, first_name, last_name), providers:provider_id (id, first_name, last_name, organization_name, provider_type)"
    )
    .eq("organization_id", params.organizationId)
    .order("scheduled_start");

  if (params.date) {
    const start = `${params.date}T00:00:00Z`;
    const end = `${params.date}T23:59:59Z`;
    queryBuilder = queryBuilder.gte("scheduled_start", start).lte("scheduled_start", end);
  }
  if (params.providerId) {
    queryBuilder = queryBuilder.eq("provider_id", params.providerId);
  }
  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;
  return data;
}

export async function listAppointmentsForPatient(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select("*, providers:provider_id (id, first_name, last_name, organization_name, provider_type)")
    .eq("patient_id", patientId)
    .eq("organization_id", organizationId)
    .order("scheduled_start", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAppointmentById(appointmentId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "*, patients:patient_id (id, mrn, first_name, last_name), providers:provider_id (id, first_name, last_name, organization_name, provider_type)"
    )
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAppointment(params: {
  organizationId: string;
  createdBy: string;
  input: AppointmentInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .insert({
      organization_id: params.organizationId,
      patient_id: params.input.patientId,
      provider_id: params.input.providerId,
      appointment_type: params.input.appointmentType,
      ...toTimestamps(params.input.date, params.input.startTime, params.input.endTime),
      reason: params.input.reason || null,
      location: params.input.location || null,
      created_by: params.createdBy,
      updated_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23P01") throw new Error(OVERLAP_ERROR);
    throw error;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.createdBy,
    action: "appointment.created",
    entityType: "appointment",
    entityId: data.id,
  });

  return data;
}

export async function updateAppointment(params: {
  appointmentId: string;
  organizationId: string;
  updatedBy: string;
  input: AppointmentInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .update({
      patient_id: params.input.patientId,
      provider_id: params.input.providerId,
      appointment_type: params.input.appointmentType,
      ...toTimestamps(params.input.date, params.input.startTime, params.input.endTime),
      reason: params.input.reason || null,
      location: params.input.location || null,
      updated_by: params.updatedBy,
    })
    .eq("id", params.appointmentId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23P01") throw new Error(OVERLAP_ERROR);
    throw error;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.updatedBy,
    action: "appointment.updated",
    entityType: "appointment",
    entityId: params.appointmentId,
  });

  return data;
}

export async function updateAppointmentStatus(params: {
  appointmentId: string;
  organizationId: string;
  actingUserId: string;
  input: AppointmentStatusInput;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const patch: Database["public"]["Tables"]["appointments"]["Update"] = {
    status: params.input.status,
    updated_by: params.actingUserId,
  };
  if (params.input.status === "checked_in") patch.checked_in_at = now;
  if (params.input.status === "completed") patch.checked_out_at = now;
  if (params.input.status === "cancelled") {
    patch.cancelled_at = now;
    patch.cancellation_reason = params.input.cancellationReason || null;
  }

  const { data, error } = await admin
    .from("appointments")
    .update(patch)
    .eq("id", params.appointmentId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "appointment.status_changed",
    entityType: "appointment",
    entityId: params.appointmentId,
    metadata: { status: params.input.status },
  });

  return data;
}
