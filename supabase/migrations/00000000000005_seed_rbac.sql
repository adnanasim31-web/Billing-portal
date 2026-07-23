-- =============================================================================
-- Module 1: Authentication & User Management
-- Migration 5: Seed permission catalog + system role templates
--
-- The permission catalog intentionally covers every module in the product
-- roadmap (not just auth) so that RBAC does not need a breaking migration
-- every time a new module ships - only new rows.
-- =============================================================================

insert into public.permissions (slug, module, label, description) values
  -- Dashboard
  ('dashboard.view',            'dashboard',    'View Dashboard',            'View KPI dashboard and analytics widgets'),
  -- Users & Access
  ('users.view',                'users',        'View Users',               'View user list and profiles'),
  ('users.manage',              'users',        'Manage Users',             'Invite, edit, suspend, and remove users'),
  ('roles.manage',              'users',        'Manage Roles',             'Create/edit custom roles and permission grants'),
  ('audit_logs.view',           'users',        'View Audit Logs',          'View organization security & activity audit trail'),
  ('organization.admin',        'organization', 'Organization Admin',       'Full administrative control of the organization'),
  ('organization.settings',     'organization', 'Manage Org Settings',      'Branding, SMTP, API keys, security policy'),
  -- Patients
  ('patients.view',             'patients',     'View Patients',            'View patient records'),
  ('patients.manage',           'patients',     'Manage Patients',          'Create/edit patient records, insurance, documents'),
  -- Providers
  ('providers.view',            'providers',    'View Providers',           'View provider roster and performance'),
  ('providers.manage',          'providers',    'Manage Providers',         'Manage credentialing, schedules, NPI/Tax ID'),
  -- Insurance
  ('insurance.view',            'insurance',    'View Insurance',           'View payer records and patient insurance'),
  ('insurance.manage',          'insurance',    'Manage Insurance',         'Manage payer directory, payer IDs, eligibility'),
  -- Appointments
  ('appointments.view',         'appointments', 'View Appointments',        'View scheduling calendar'),
  ('appointments.manage',       'appointments', 'Manage Appointments',      'Create/edit/check-in/check-out appointments'),
  -- Coding
  ('coding.view',                'coding',      'View Coding Library',      'View ICD-10/CPT/HCPCS libraries'),
  ('coding.manage',              'coding',      'Manage Coding Library',    'Manage modifier library, favorites, validation rules'),
  -- Claims
  ('claims.view',                'claims',      'View Claims',              'View claim list, details, and status'),
  ('claims.manage',              'claims',      'Manage Claims',            'Create, scrub, submit, and edit claims'),
  ('claims.submit',              'claims',      'Submit Claims',            'Submit claims to clearinghouse/payer'),
  ('claims.appeal',              'claims',      'Manage Appeals',           'File and manage claim appeals'),
  -- Eligibility
  ('eligibility.view',           'eligibility', 'View Eligibility',         'View 270/271 eligibility checks and history'),
  ('eligibility.run',            'eligibility', 'Run Eligibility Checks',   'Submit new eligibility requests'),
  -- Payments
  ('payments.view',              'payments',    'View Payments',            'View ERA/EOB and payment history'),
  ('payments.post',              'payments',    'Post Payments',            'Post manual payments, adjustments, write-offs'),
  ('payments.reconcile',         'payments',    'Reconcile Payments',       'Perform payment reconciliation'),
  -- Denials
  ('denials.view',               'denials',     'View Denials',             'View denied claims and recovery dashboard'),
  ('denials.manage',             'denials',     'Manage Denials',           'Manage appeals, root cause, follow-ups'),
  -- AR
  ('ar.view',                    'ar',          'View Accounts Receivable', 'View AR aging, buckets, work queue'),
  ('ar.manage',                  'ar',          'Manage Accounts Receivable', 'Work AR queue, add collection notes'),
  -- Reports
  ('reports.view',               'reports',     'View Reports',             'View and export standard reports'),
  -- Credentialing
  ('credentialing.view',         'credentialing','View Credentialing',      'View CAQH/PECOS/NPI/DEA/license status'),
  ('credentialing.manage',       'credentialing','Manage Credentialing',    'Manage credentialing records and expirations'),
  -- Documents
  ('documents.view',             'documents',   'View Documents',           'View uploaded documents and OCR results'),
  ('documents.manage',           'documents',   'Manage Documents',         'Upload, tag, version documents'),
  -- CRM
  ('crm.view',                   'crm',         'View CRM',                 'View leads, clients, contracts, pipeline'),
  ('crm.manage',                 'crm',         'Manage CRM',               'Manage leads, contracts, sales pipeline'),
  -- Tasks & Messaging
  ('tasks.view',                 'tasks',       'View Tasks',               'View assigned tasks and deadlines'),
  ('tasks.manage',               'tasks',       'Manage Tasks',             'Create/assign/comment on tasks'),
  ('messaging.use',              'messaging',   'Use Messaging',            'Send/receive internal chat and announcements'),
  -- Subscription / Billing
  ('subscription.view',          'subscription','View Subscription',       'View plan, invoices, usage'),
  ('subscription.manage',        'subscription','Manage Subscription',     'Change plan, update billing/payment method'),
  -- AI Module
  ('ai.use',                     'ai',          'Use AI Assistant',        'Use AI coding suggestions, denial prediction, OCR')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- System role templates (organization_id is null). Cloned per-organization
-- by clone_system_roles_for_org() whenever a new organization is created.
-- ---------------------------------------------------------------------------
insert into public.roles (organization_id, name, slug, description, is_system) values
  (null, 'Owner',       'owner',        'Full, unrestricted access to the organization.', true),
  (null, 'Admin',       'admin',        'Administrative access excluding subscription/billing ownership.', true),
  (null, 'Biller',      'biller',       'Claims, payments, denials, and AR workflow access.', true),
  (null, 'Provider',    'provider',     'Clinical/provider portal access: own claims, revenue, credentialing.', true),
  (null, 'Front Desk',  'front-desk',   'Patient registration, scheduling, eligibility.', true),
  (null, 'Auditor',     'auditor',      'Read-only access across the organization plus audit logs.', true),
  (null, 'Read Only',   'read-only',    'Read-only access to core operational modules.', true)
on conflict (organization_id, slug) do nothing;

-- Owner: every permission
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'owner' and r.organization_id is null
on conflict do nothing;

-- Admin: everything except subscription.manage and organization.admin
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'admin' and r.organization_id is null
  and p.slug not in ('subscription.manage', 'organization.admin')
on conflict do nothing;

-- Biller
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'biller' and r.organization_id is null
  and p.slug in (
    'dashboard.view', 'patients.view', 'insurance.view', 'coding.view',
    'claims.view', 'claims.manage', 'claims.submit', 'claims.appeal',
    'eligibility.view', 'eligibility.run', 'payments.view', 'payments.post',
    'payments.reconcile', 'denials.view', 'denials.manage', 'ar.view', 'ar.manage',
    'reports.view', 'documents.view', 'documents.manage', 'tasks.view', 'tasks.manage',
    'messaging.use', 'ai.use'
  )
on conflict do nothing;

-- Provider (provider portal)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'provider' and r.organization_id is null
  and p.slug in (
    'dashboard.view', 'claims.view', 'reports.view', 'credentialing.view',
    'documents.view', 'messaging.use'
  )
on conflict do nothing;

-- Front Desk
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'front-desk' and r.organization_id is null
  and p.slug in (
    'dashboard.view', 'patients.view', 'patients.manage', 'appointments.view',
    'appointments.manage', 'eligibility.view', 'eligibility.run', 'documents.view',
    'documents.manage', 'messaging.use'
  )
on conflict do nothing;

-- Auditor: read-only + audit logs
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'auditor' and r.organization_id is null
  and (p.slug like '%.view' or p.slug = 'audit_logs.view')
on conflict do nothing;

-- Read Only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.slug = 'read-only' and r.organization_id is null
  and p.slug in ('dashboard.view', 'patients.view', 'claims.view', 'payments.view', 'reports.view')
on conflict do nothing;
