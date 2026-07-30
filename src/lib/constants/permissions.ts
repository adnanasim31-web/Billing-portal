/** Mirrors supabase/migrations/00000000000005_seed_rbac.sql permission slugs. */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  AUDIT_LOGS_VIEW: "audit_logs.view",
  ORGANIZATION_ADMIN: "organization.admin",
  ORGANIZATION_SETTINGS: "organization.settings",
  PATIENTS_VIEW: "patients.view",
  PATIENTS_MANAGE: "patients.manage",
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_MANAGE: "documents.manage",
  PROVIDERS_VIEW: "providers.view",
  PROVIDERS_MANAGE: "providers.manage",
  INSURANCE_VIEW: "insurance.view",
  INSURANCE_MANAGE: "insurance.manage",
  APPOINTMENTS_VIEW: "appointments.view",
  APPOINTMENTS_MANAGE: "appointments.manage",
  CODING_VIEW: "coding.view",
  CLAIMS_VIEW: "claims.view",
  CLAIMS_MANAGE: "claims.manage",
  CLAIMS_SUBMIT: "claims.submit",
  CLAIMS_APPEAL: "claims.appeal",
  ELIGIBILITY_VIEW: "eligibility.view",
  ELIGIBILITY_RUN: "eligibility.run",
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_POST: "payments.post",
  PAYMENTS_RECONCILE: "payments.reconcile",
  DENIALS_VIEW: "denials.view",
  DENIALS_MANAGE: "denials.manage",
  AR_VIEW: "ar.view",
  AR_MANAGE: "ar.manage",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLE_SLUGS = [
  "owner",
  "admin",
  "biller",
  "provider",
  "front-desk",
  "auditor",
  "read-only",
] as const;

export type SystemRoleSlug = (typeof SYSTEM_ROLE_SLUGS)[number];

export const ROLE_LABELS: Record<SystemRoleSlug, string> = {
  owner: "Owner",
  admin: "Admin",
  biller: "Biller",
  provider: "Provider",
  "front-desk": "Front Desk",
  auditor: "Auditor",
  "read-only": "Read Only",
};
