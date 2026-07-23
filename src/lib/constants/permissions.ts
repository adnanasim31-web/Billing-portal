/** Mirrors supabase/migrations/00000000000005_seed_rbac.sql permission slugs. */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  AUDIT_LOGS_VIEW: "audit_logs.view",
  ORGANIZATION_ADMIN: "organization.admin",
  ORGANIZATION_SETTINGS: "organization.settings",
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
