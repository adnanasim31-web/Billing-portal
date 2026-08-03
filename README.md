# MedBill RCM Suite

Enterprise medical billing & revenue cycle management (RCM) SaaS platform.
Built module by module. Shipped so far:

- **Module 1: Authentication & User Management**
- **Module 2: Patients**
- **Module 3: Providers**
- **Module 4: Insurance** (payer directory)
- **Module 5: Appointments**
- **Module 6: Medical Coding** (ICD-10/CPT/HCPCS/Modifiers)

## Architecture decision

The original spec called for a Laravel 12 / PHP 8.4 backend. Since this repo is
wired to **Vercel + Supabase**, the stack was adapted to deploy natively on that
infrastructure instead of standing up a second PHP runtime:

- **Next.js 15 (App Router) + React 19 + TypeScript** for both frontend and
  backend (Route Handlers replace Laravel controllers, `lib/services/*`
  replaces the Laravel service layer).
- **Supabase Postgres** for the database, **Supabase Auth** for
  credential/session management, Row Level Security for authorization.
- Everything ships as a single Vercel deployment.

The Laravel-style separation the spec asked for (Controllers -> Services ->
Repositories, Form Requests, Policies) is preserved conceptually:

| Laravel concept        | This codebase                                  |
|-------------------------|-------------------------------------------------|
| Controller               | `src/app/api/**/route.ts` (Route Handlers)      |
| Form Request validation  | `src/lib/validations/*.ts` (Zod schemas)        |
| Service layer            | `src/lib/services/*.ts`                         |
| Policy / Gate            | `has_permission()` Postgres function + RLS      |
| Eloquent Model           | Supabase-typed queries against `database.types.ts` |
| Migration                | `supabase/migrations/*.sql`                     |
| Job / Queue              | Not yet needed in Module 1 (see Future Work)    |

## Tech stack

- Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui (hand-rolled,
  Radix-based), TanStack Table, React Hook Form + Zod, Recharts, Framer
  Motion, Lucide icons.
- Supabase (Postgres, Auth, RLS). Storage/S3-compatible buckets are wired in
  once the Documents module ships.
- Vitest for unit tests.

## Design system

| Token            | Value                          |
|-------------------|---------------------------------|
| Primary            | `#0F6CBD`                       |
| Sidebar            | `#071C34`                       |
| Background         | `#F5F7FB`                       |
| Cards              | White / `hsl(var(--card))`      |
| Border radius       | `14px`                          |
| Typography          | Inter                           |
| Icons               | Lucide                          |
| Spacing             | 8px grid                        |

Light and dark themes are both implemented via CSS variables in
`src/app/globals.css` and toggled with `next-themes`.

---

## 1. UI Design

- **Auth screens** (`src/app/(auth)/*`): split-screen layout - dark brand
  panel (`#071C34`) on the left with product highlights, form on the right.
  Covers Login, Register, Forgot Password, Reset Password, Email OTP
  verification, 2FA verification, and Accept Invite.
- **Dashboard shell** (`src/app/(dashboard)/*`): collapsible dark sidebar,
  sticky navbar with search/notifications/theme toggle/user menu, white
  content area with rounded (14px) cards and soft shadows - directly
  inspired by the reference screenshot's KPI/chart layout, restyled to be
  cleaner and less dense (Kareo/AdvancedMD/Stripe-Dashboard influence).
  The dashboard page shipped with placeholder sample data in Module 1, to
  establish the visual system before the Claims/Payments/Denials/AR/Reports
  modules existed to supply real numbers. It was rewired to fully live data
  once those modules shipped - see "Dashboard: live data" below.
- **Settings**: tabbed Profile / Security / Team Members / Roles &
  Permissions pages.

## 2. Database Tables

All in `supabase/migrations/`, applied in order:

1. `00000000000001_core_schema.sql` - `organizations`, `profiles`, `roles`,
   `permissions`, `role_permissions`, `user_roles`, `invitations`.
2. `00000000000002_auth_security.sql` - `two_factor_auth`, `otp_codes`,
   `user_sessions`, `login_attempts`, `audit_logs`.
3. `00000000000003_functions_triggers.sql` - `current_organization_id()`,
   `has_permission()`, `is_org_admin()`, `is_super_admin()`,
   `handle_new_user()` (auth.users -> profiles), `clone_system_roles_for_org()`.
4. `00000000000004_rls_policies.sql` - Row Level Security for every table.
5. `00000000000005_seed_rbac.sql` - permission catalog (spans all future
   modules, not just auth) + 7 system role templates.

### Relationships

```
organizations 1---N profiles
organizations 1---N roles (org-scoped; organization_id NULL = system template)
roles N---N permissions        (via role_permissions)
profiles N---N roles           (via user_roles, scoped to organization_id)
profiles 1---1 two_factor_auth
profiles 1---N user_sessions
organizations 1---N invitations --- roles
profiles 1---N audit_logs (nullable - system actions have no user_id)
```

Key constraints: `organizations.slug` unique; `profiles.email` unique
(citext, case-insensitive); `roles (organization_id, slug)` unique;
`invitations` has a partial unique index preventing two pending invites to
the same email in the same org. Indexes cover every foreign key plus the
hot lookup paths (`profiles.organization_id`, `audit_logs (organization_id,
created_at desc)`, `login_attempts (email, created_at desc)`, etc).

## 3. Models

No ORM models in the Laravel sense - `src/types/database.types.ts` is the
hand-authored `Database` type (regenerate with `npm run db:types` once the
Supabase project is linked) that gives every `supabase.from(table)` call
full row/insert/update typing.

## 4. Controllers (Route Handlers)

`src/app/api/**/route.ts` - one file per endpoint, see the API reference
below. Each handler: parses/validates the body with Zod, calls into the
service layer, and returns a typed JSON response.

## 5. Services

`src/lib/services/*.ts` - all business logic lives here, never in route
handlers or components:

- `auth-service.ts` - registration (org + owner provisioning), login lockout
  bookkeeping, 2FA requirement checks.
- `otp-service.ts` - one-time code issue/verify (hashed, rate-limited).
- `two-factor-service.ts` - TOTP enrollment (QR + backup codes), verification.
- `session-service.ts` - device/session registry + revocation.
- `user-service.ts` - org user listing, invitations, status changes.
- `role-service.ts` - role/permission catalog, custom role creation, role
  assignment.
- `audit-service.ts` - append-only audit log writes/reads.
- `current-user-service.ts` - resolves the authenticated user's profile,
  roles, and effective permission set for use in Server Components.

## 6. APIs

All endpoints are under `src/app/api`. Auth endpoints operate on the
Supabase session cookie (no bearer tokens needed client-side).

| Method | URL                              | Purpose                                   | Auth required |
|--------|-----------------------------------|--------------------------------------------|----------------|
| POST   | `/api/auth/register`              | Create organization + owner account        | No |
| POST   | `/api/auth/login`                 | Sign in; returns `{ requiresTwoFactor }`   | No |
| POST   | `/api/auth/logout`                | Sign out, clear session + MFA cookie       | Yes |
| POST   | `/api/auth/forgot-password`       | Send password reset email                  | No |
| POST   | `/api/auth/reset-password`        | Set new password from reset-link session   | Recovery session |
| POST   | `/api/auth/change-password`       | Change password (re-verifies current one)  | Yes |
| POST   | `/api/auth/verify-otp`            | Verify a 6-digit email/SMS OTP             | No |
| POST   | `/api/auth/accept-invite`         | Accept an org invitation, set password     | No (token-based) |
| POST   | `/api/auth/2fa/setup`             | Begin TOTP enrollment (QR + backup codes)  | Yes |
| POST   | `/api/auth/2fa/confirm`           | Confirm enrollment with a 6-digit code     | Yes |
| POST   | `/api/auth/2fa/verify`            | Verify 2FA at login time                   | Partial session |
| POST   | `/api/auth/2fa/disable`           | Disable 2FA                                | Yes |
| DELETE | `/api/auth/sessions/:id`          | Revoke a device session                    | Yes |
| PATCH  | `/api/profile`                    | Update the current user's profile          | Yes |
| POST   | `/api/users/invite`               | Invite a teammate (`users.manage`)         | Yes + permission |
| PATCH  | `/api/users/:id/status`           | Activate/suspend/remove a user             | Yes + permission |
| POST   | `/api/roles`                      | Create a custom role (`roles.manage`)      | Yes + permission |

Every handler validates its body against the matching Zod schema in
`src/lib/validations/auth.ts` and returns `400` with the first validation
message on failure, `401` when unauthenticated, `403` when the caller lacks
the required permission, and `500` only for unexpected failures (Supabase
errors are surfaced as `400` with their message where safe to do so).

## 7. Validation

`src/lib/validations/auth.ts` - Zod schemas for every form and API payload
(login, register, forgot/reset password, OTP, 2FA, profile update, change
password, invite user, create role). Password policy: 10-72 chars, at least
one uppercase, lowercase, digit, and symbol - enforced client-side (instant
feedback + strength meter) and server-side (defense in depth).

## 8. Frontend Pages

- `src/app/(auth)/{login,register,forgot-password,reset-password,verify-otp,two-factor,accept-invite}/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/settings/{profile,security,users,roles}/page.tsx`

## 9. Components

- `src/components/ui/*` - hand-rolled shadcn/ui primitives (button, input,
  label, card, dialog, dropdown-menu, tabs, avatar, badge, separator,
  switch, select, table, skeleton, sonner toast, progress, tooltip, form,
  checkbox) - Radix UI + `class-variance-authority` + Tailwind, matching the
  design tokens above.
- `src/components/auth/*` - brand panel, all auth forms, OTP input,
  password strength meter.
- `src/components/layout/*` - collapsible `Sidebar`, `Navbar`, `UserMenu`,
  `ThemeToggle`.
- `src/components/dashboard/*` - `KpiCard`, `RevenueChart`, `ClaimStatusDonut`.
- `src/components/settings/*` - profile/password forms, 2FA card, sessions
  list, invite dialog, users table, roles grid, create-role dialog.
- `src/components/shared/*` - reusable `DataTable` (TanStack Table +
  pagination), `EmptyState`, `PageHeader`.

## 10. Business Logic

- **Multi-tenancy**: every user belongs to exactly one `organization`; all
  RLS policies scope reads/writes to `current_organization_id()`.
- **RBAC**: permissions are granted to roles, roles to users, all scoped per
  organization. Seven system role templates (Owner, Admin, Biller, Provider,
  Front Desk, Auditor, Read Only) are cloned into every new organization via
  a database trigger, so a fresh org is immediately usable without manual
  setup. Org admins can additionally define custom roles.
- **Account lockout**: 5 failed logins locks the account for 15 minutes
  (`profiles.failed_login_attempts` / `locked_until`), independently of
  Supabase's own auth rate limiting.
- **2FA gate**: enabling 2FA does not block Supabase's own session
  establishment (it authenticates via password first); a signed `mb_mfa`
  cookie (HMAC over the user id) is required by the dashboard layout before
  any protected page renders, forcing a second verification step whenever
  the cookie is absent or invalid.
- **Invitations**: token is emailed once, only its SHA-256 hash is stored;
  accepting an invite provisions the auth user, activates the profile, and
  grants the invited role - all in one server-side request using
  the service-role client (RLS is bypassed intentionally here since the
  invitee isn't authenticated yet).
- **Audit trail**: every security-relevant action (login, failed login,
  password change, 2FA enable/disable, role/user changes, invitations) is
  written to the append-only `audit_logs` table via the service role -
  client code has no insert policy on that table.

## 11. Testing

`tests/` (Vitest):
- `tests/validations/auth.test.ts` - password policy, login/register/OTP/
  role schemas.
- `tests/services/auth-service.test.ts` - `slugify()` edge cases.
- `tests/services/mfa-cookie.test.ts` - HMAC signing/validation.

Run with `npm test`. Service-layer tests that need a live Supabase project
(e.g. `registerOrganizationOwner`) are integration-level and are left for
the CI environment once a Supabase project is provisioned (see Future
Improvements).

## 12. Folder Structure

```
supabase/
  migrations/            SQL migrations (schema, security, functions, RLS, seed)
src/
  app/
    (auth)/               Public auth route group + layout
    (dashboard)/           Authenticated app shell (sidebar/navbar) + settings
    api/                  Route Handlers (auth, users, roles, profile)
    globals.css           Design tokens (light + dark)
    layout.tsx            Root layout (fonts, theme provider, toaster)
  components/
    ui/                   shadcn/ui-style primitives
    auth/                 Auth forms + brand panel
    layout/               Sidebar, navbar, user menu
    dashboard/            KPI cards, charts
    settings/             Profile/security/users/roles UI
    shared/                DataTable, EmptyState, PageHeader
    providers/            ThemeProvider
  lib/
    supabase/              Browser/server/admin/middleware clients
    services/               Business logic (service layer)
    validations/            Zod schemas
    constants/               Permissions, nav config
    utils.ts, request-context.ts, mfa-cookie.ts, ua-parser.ts
  types/
    database.types.ts       Hand-authored Supabase Database type
tests/                      Vitest unit tests
middleware.ts               Session refresh + route protection
```

## 13. Future Improvements

- **Documents/Notifications module**: replace the `console.info` invite
  link in `/api/users/invite` with real transactional email (Resend/SES)
  and avatar upload to Supabase Storage.
- **Rate limiting**: move `login_attempts`/OTP throttling to a proper
  sliding-window limiter (Upstash Redis) instead of a per-request Postgres
  count.
- **Session device metadata**: replace the dependency-free UA parser with a
  proper library once IP geolocation (city/region/country) is wired up.
- **SSO**: SAML/OIDC for enterprise customers (Supabase supports SSO on
  paid tiers) - would slot into the existing `roles`/`user_roles` model
  unchanged.
- **CI**: GitHub Actions running `npm run lint`, `npm run typecheck`,
  `npm test`, and `supabase db lint` on every PR.
- **E2E tests**: Playwright coverage for the login -> 2FA -> dashboard and
  invite -> accept -> login flows once a seeded test Supabase project
  exists in CI.
- Every module after this one (Claims, Patients, Eligibility, Payments,
  Denials, AR, Reports, Credentialing, Documents, CRM, Messaging, AI, and
  the Client/Provider/Patient portals) reuses this same
  RLS-per-organization + service-layer + Zod-validated-API pattern - Module
  1 is the foundation the rest of the suite builds on.

---

# Module 2: Patients

Patient registration, profile, insurance on file, documents, medical history,
and notes - the foundational entity that Claims, Appointments, and
Eligibility will all reference once those modules ship. The Claims,
Balances, and Payment History tabs on the patient profile intentionally
render an "upcoming module" placeholder rather than fake data.

## 1. UI Design

- **Patients list** (`/patients`): searchable, filterable `DataTable` (name/
  MRN/email search, status filter) with server-side pagination, matching the
  Module 1 card/table visual system.
- **Register/Edit patient** (`/patients/new`, `/patients/[id]/edit`): a
  sectioned form (Demographics / Contact / Address) sharing one
  `PatientForm` component and Zod schema for both create and edit.
- **Patient profile** (`/patients/[id]`): header with avatar, MRN, age, DOB,
  status badge, and a tabbed workspace - Overview, Insurance, Documents,
  Medical History, Notes, plus disabled-look placeholders for Claims and
  Balances.

## 2. Database Tables

Added in `supabase/migrations/00000000000006_patients_schema.sql` and
`00000000000007_patients_rls_storage.sql`:

- `patients` - demographics, MRN (unique per org, format `MB-000001`),
  guarantor self-reference, status.
- `patient_insurance_policies` - primary/secondary/tertiary coverage; a
  partial unique index (`WHERE is_active = true`) enforces at most one
  active policy per rank per patient while preserving history.
- `patient_documents` - metadata for files in the `patient-documents`
  Supabase Storage bucket (private, 25MB limit, PDF/image/Word mime types
  allow-listed).
- `patient_medical_history` - unified condition/allergy/medication/surgery/
  immunization timeline.
- `patient_notes` - free-text notes (general/billing/clinical/collections),
  pinnable.

All five tables are organization-scoped and RLS-protected using the same
`current_organization_id()` / `has_permission()` helpers from Module 1,
gated behind the `patients.view` / `patients.manage` / `documents.view` /
`documents.manage` permissions already seeded in Module 1's permission
catalog - no new RBAC migration was needed.

### Relationships

```
organizations 1---N patients
patients 1---N patient_insurance_policies
patients 1---N patient_documents
patients 1---N patient_medical_history
patients 1---N patient_notes --- profiles (author_id)
patients 1---1 patients (guarantor_patient_id, self-referencing, nullable)
```

### Storage

The `patient-documents` bucket uses the path convention
`{organization_id}/{patient_id}/{uuid}-{filename}`, and its `storage.objects`
RLS policies check `(storage.foldername(name))[1] = current_organization_id()`
so a signed upload/download URL can never be reused across organizations.

## 3. Models

`src/types/database.types.ts` extended with `patients`,
`patient_insurance_policies`, `patient_documents`, `patient_medical_history`,
and `patient_notes` - including their FK `Relationships` metadata, which
Postgrest's embedded-select type inference requires (e.g. `patient_notes`
joined to `profiles` via `author_id` for the Notes tab's author name).

## 4. Controllers (Route Handlers)

`src/app/api/patients/**/route.ts` - 10 endpoints (see API table below),
mirroring the Module 1 pattern: permission-checked, Zod-validated, thin.

## 5. Services

- `patient-service.ts` - MRN generation (sequential per org, retries on a
  rare concurrent-registration collision), search/pagination, create/update.
- `patient-insurance-service.ts` - list/add coverage; adding a new *active*
  policy for a rank automatically deactivates the prior active one for that
  rank so history is preserved without violating the partial unique index.
- `patient-document-service.ts` - signed upload URL issuance, metadata
  recording, signed download URL generation, delete (storage object + row).
- `patient-history-service.ts` / `patient-notes-service.ts` - CRUD for the
  medical history timeline and notes, including note pin/unpin.

## 6. APIs

| Method | URL                                              | Purpose                          |
|--------|----------------------------------------------------|-----------------------------------|
| GET    | `/api/patients`                                    | Search/paginate patients          |
| POST   | `/api/patients`                                    | Register a patient (`patients.manage`) |
| GET    | `/api/patients/:id`                                | Get a patient                     |
| PATCH  | `/api/patients/:id`                                | Update a patient (`patients.manage`) |
| GET/POST | `/api/patients/:id/insurance`                    | List/add insurance policies       |
| DELETE | `/api/patients/:id/insurance/:policyId`            | Deactivate a policy               |
| POST   | `/api/patients/:id/documents/upload-url`           | Issue a signed Storage upload URL |
| GET/POST | `/api/patients/:id/documents`                    | List documents (with signed download URLs) / record uploaded metadata |
| DELETE | `/api/patients/:id/documents/:documentId`          | Delete a document (storage + row) |
| GET/POST | `/api/patients/:id/history`                      | List/add medical history entries  |
| DELETE | `/api/patients/:id/history/:entryId`               | Delete a history entry            |
| GET/POST | `/api/patients/:id/notes`                        | List/add notes                    |
| PATCH/DELETE | `/api/patients/:id/notes/:noteId`             | Pin/unpin or delete a note         |

File bytes never pass through the Next.js server: the browser uploads
directly to Supabase Storage using a signed upload URL/token
(`supabase.storage.from(bucket).uploadToSignedUrl(...)`), and the server
only ever handles metadata.

## 7. Validation

`src/lib/validations/patients.ts` - patient demographics (DOB can't be in
the future, SSN last-4 must be exactly 4 digits), insurance policy
(termination date must be on/after the effective date), document metadata
(25MB cap enforced both client- and server-side), history entry, note, and
search/pagination params.

## 8. Frontend Pages

- `src/app/(dashboard)/patients/page.tsx` (list)
- `src/app/(dashboard)/patients/new/page.tsx` (register)
- `src/app/(dashboard)/patients/[id]/page.tsx` (profile)
- `src/app/(dashboard)/patients/[id]/edit/page.tsx` (edit)

## 9. Components

`src/components/patients/*` - `PatientForm`, `PatientsTable`,
`PatientsFilters`, `PatientHeader`, `PatientTabs`, `OverviewTab`,
`InsuranceTab`, `DocumentsTab`, `HistoryTab`, `NotesTab`,
`UpcomingModulePlaceholder`. New shared components: `ServerPagination`
(`src/components/shared/`) for server-fetched pages, and a generic
`onRowClick` prop added to the Module 1 `DataTable`.

## 10. Business Logic

- **MRN generation**: sequential per organization (`MB-000001`, `MB-000002`,
  ...), with retry-on-conflict (Postgres `23505`) to handle the rare race
  between two simultaneous registrations.
- **Insurance rank supersession**: a patient can have at most one *active*
  policy per rank (enforced by a partial unique index); adding a new active
  policy for an already-covered rank deactivates the old one rather than
  rejecting the request, preserving coverage history.
- **Document storage isolation**: every object path is prefixed with the
  organization id, and Storage RLS policies enforce that prefix server-side
  - a signed URL minted for one org's patient document cannot be
    replayed against another org's data even if leaked.
- **Audit trail**: every patient create/update, insurance add/deactivate,
  document upload/delete, history add/delete, and note add/delete writes to
  `audit_logs`, consistent with Module 1.

## 11. Testing

- `tests/validations/patients.test.ts` - patient/insurance/document/history/
  note schema edge cases (future DOB, bad SSN format, termination-before-
  effective date, oversized file, empty note body).
- `tests/services/patient-document-service.test.ts` - storage path
  construction: org/patient scoping, filename sanitization, uniqueness.

## 12. Folder Structure

```
supabase/migrations/
  00000000000006_patients_schema.sql
  00000000000007_patients_rls_storage.sql
src/
  app/(dashboard)/patients/
    page.tsx                  list
    new/page.tsx               register
    [id]/page.tsx               profile
    [id]/edit/page.tsx           edit
  app/api/patients/            10 route handlers (see API table)
  components/patients/          PatientForm, tables, tabs
  components/shared/
    server-pagination.tsx      new
    data-table.tsx              + onRowClick prop
  hooks/use-debounced-callback.ts  new
  lib/services/patient-*.ts      5 services
  lib/validations/patients.ts
tests/
  validations/patients.test.ts
  services/patient-document-service.test.ts
```

## 13. Future Improvements

- **Duplicate-patient detection**: fuzzy match on name + DOB + phone at
  registration time to warn front-desk staff before creating a duplicate MRN.
- **Real payer directory**: `patient_insurance_policies.payer_name`/
  `payer_id_code` are free text today; once the Insurance module ships,
  migrate these to a foreign key into a proper `insurance_companies` table
  with real payer IDs and eligibility integration.
- **OCR on upload**: auto-extract policy number/group number from an
  uploaded insurance card image (ties into the AI module's "OCR Insurance
  Cards" feature).
- **Structured clinical coding**: `patient_medical_history` is a simple
  free-text timeline; a clinical-grade build-out would code conditions to
  ICD-10 and medications to RxNorm/NDC once the Medical Coding module ships.
- **Guarantor billing**: `guarantor_patient_id` exists on the schema but
  there's no UI yet to assign/manage a responsible party distinct from the
  patient - natural to add once statements/billing exist.
- Claims, Balances, and Payment History tabs go from placeholders to real
  data automatically once the Claims and Payment Posting modules ship,
  since they already read from the same `patients.id` foreign key those
  modules will use.

---

# Module 3: Providers & Module 4: Insurance

Built together since Claims needs both: a rendering provider and a payer.
Scope notes carried over from the original spec's module boundaries:
- Deep CAQH/PECOS credentialing workflows and expiration-tracking alerts
  are the future **Credentialing** module - Providers here holds only the
  identifying/licensing fields Claims needs (NPI, Tax ID, license, DEA).
- 270/271 electronic eligibility checks are the future **Eligibility**
  module - Insurance here is just the payer/company directory (name, payer
  ID, claims address, benefits notes). Patient-side insurance policies
  shipped in Module 2 and are unchanged.

## 1. UI Design

- **Providers list** (`/providers`): searchable/filterable roster, same
  `DataTable` pattern as Patients, with an avatar-style icon distinguishing
  individual clinicians from organizations/groups.
- **Provider profile** (`/providers/[id]`): header + tabs - Overview
  (licensing/contact), Schedule (weekly availability), and placeholders for
  Claims/Performance/Credentialing.
- **Insurance list** (`/insurance`): payer directory with search.
- **Payer profile** (`/insurance/[id]`): Overview (contact/claims address/
  benefits notes) and a **Patients** tab - a real, non-placeholder list of
  every patient currently carrying that payer, pulled from Module 2's
  `patient_insurance_policies`.
- **Cross-module integration**: the patient Insurance tab (Module 2) now
  offers a "payer from directory" picker that auto-fills payer name/ID from
  this module's directory, falling back to free text if a payer isn't in
  the directory yet.

## 2. Database Tables

`supabase/migrations/00000000000008_providers_schema.sql` through
`00000000000011_grant_front_desk_insurance_view.sql`:

- `providers` - individual or organization/group providers. NPI unique per
  org; a check constraint enforces first/last name for individuals and an
  organization name for groups (whichever `provider_type` requires).
- `provider_schedules` - recurring weekly availability blocks
  (`day_of_week` 0-6, start/end time, location) - foundational for the
  future Appointments module.
- `insurance_companies` - payer directory (name unique per org, payer ID,
  claims address, benefits notes).
- `patient_insurance_policies` (Module 2) gained a nullable
  `payer_company_id` FK to `insurance_companies` - additive only, existing
  free-text `payer_name`/`payer_id_code` columns are untouched so policies
  entered before a payer exists in the directory keep working.

All three new tables are organization-scoped and RLS-protected using the
already-seeded `providers.*`/`insurance.*` permissions from Module 1 - no
new RBAC migration was needed for the permission catalog itself. One small
RBAC *grant* migration (0011) was needed: Front Desk staff register
patients and pick payers while doing so, but the Module 1 seed hadn't
given that role `insurance.view` - migration 0011 grants it to both the
global role template (future orgs) and any already-cloned Front Desk roles
in existing organizations (past orgs), since role cloning only happens
once at organization creation.

### Relationships

```
organizations 1---N providers
providers 1---N provider_schedules
organizations 1---N insurance_companies
insurance_companies 1---N patient_insurance_policies (payer_company_id, nullable)
```

## 3. Models

`src/types/database.types.ts` extended with `providers`,
`provider_schedules`, `insurance_companies`, and a patched
`patient_insurance_policies` (new `payer_company_id` field +
`Relationships` entry pointing at `insurance_companies`).

## 4. Controllers (Route Handlers)

`src/app/api/providers/**` and `src/app/api/insurance-companies/**` -
9 endpoints total, same permission-checked/Zod-validated/thin pattern as
every prior module.

## 5. Services

- `provider-service.ts` - search/pagination, create/update with a
  friendly error when an NPI collides with an existing provider in the org.
- `provider-schedule-service.ts` - list/add/remove weekly availability
  blocks.
- `insurance-service.ts` - search/pagination, create/update, a lightweight
  `listActiveInsuranceCompaniesForSelect` for populating the payer picker,
  and `listPatientsForPayer` (an embedded-select join from
  `patient_insurance_policies` to `patients`) powering the payer profile's
  Patients tab.

## 6. APIs

| Method | URL                                          | Purpose                              |
|--------|------------------------------------------------|----------------------------------------|
| GET    | `/api/providers`                                | Search/paginate providers               |
| POST   | `/api/providers`                                | Add a provider (`providers.manage`)     |
| GET    | `/api/providers/:id`                            | Get a provider                          |
| PATCH  | `/api/providers/:id`                            | Update a provider (`providers.manage`)  |
| GET/POST | `/api/providers/:id/schedule`                 | List/add weekly availability            |
| DELETE | `/api/providers/:id/schedule/:scheduleId`       | Remove an availability block            |
| GET    | `/api/insurance-companies`                      | Search/paginate payers, or `?select=1` for a lightweight active-only list |
| POST   | `/api/insurance-companies`                      | Add a payer (`insurance.manage`)        |
| GET    | `/api/insurance-companies/:id`                  | Get a payer                             |
| PATCH  | `/api/insurance-companies/:id`                  | Update a payer (`insurance.manage`)     |

## 7. Validation

`src/lib/validations/providers.ts` - NPI (exactly 10 digits), Tax ID/EIN
format, DEA number format (2 letters + 7 digits), a `superRefine` enforcing
first/last name XOR organization name based on `providerType`, and a
schedule schema requiring end time after start time.
`src/lib/validations/insurance.ts` - payer name required, loose
website/phone format checks.

## 8. Frontend Pages

- `src/app/(dashboard)/providers/{page,new/page,[id]/page,[id]/edit/page}.tsx`
- `src/app/(dashboard)/insurance/{page,new/page,[id]/page,[id]/edit/page}.tsx`

## 9. Components

- `src/components/providers/*` - `ProviderForm` (conditional individual/
  organization fields), `ProvidersTable`, `ProvidersFilters`,
  `ProviderHeader`, `ProviderTabs`, `ProviderOverviewTab`, `ScheduleTab`.
- `src/components/insurance/*` - `InsuranceCompanyForm`,
  `InsuranceCompaniesTable`, `InsuranceSearch`, `InsuranceCompanyTabs`,
  `PayerPatientsTab`.
- `UpcomingModulePlaceholder` was promoted from `components/patients/` to
  `components/shared/` since Providers now uses it too (Claims/Performance/
  Credentialing tabs).

## 10. Business Logic

- **Provider identity branching**: a single `providers` table serves both
  individual clinicians and organizations/groups via `provider_type`, with
  a database check constraint (not just app-layer validation) requiring
  the right name field is populated for each type.
- **NPI uniqueness**: enforced per-organization at the database level
  (`unique (organization_id, npi)`); the service layer translates the
  resulting Postgres `23505` error into a friendly message instead of a
  raw constraint violation.
- **Payer directory as a soft dependency**: `patient_insurance_policies`
  can reference a directory payer (`payer_company_id`) or stand alone with
  free-text `payer_name` - the directory enriches data entry without
  becoming a hard requirement, so Module 2 continues to work standalone.
- **Cross-module read**: the payer profile's Patients tab is a live query,
  not a placeholder - proof that the org-scoped, service-layer architecture
  from Module 1 composes cleanly across modules built independently.

## 11. Testing

- `tests/validations/providers.test.ts` - individual-vs-organization
  branching, NPI/DEA format edge cases, schedule time ordering.
- `tests/validations/insurance.test.ts` - payer name/website validation.

## 12. Folder Structure

```
supabase/migrations/
  00000000000008_providers_schema.sql
  00000000000009_insurance_schema.sql
  00000000000010_providers_insurance_rls.sql
  00000000000011_grant_front_desk_insurance_view.sql
src/
  app/(dashboard)/providers/          list, new, [id], [id]/edit
  app/(dashboard)/insurance/           list, new, [id], [id]/edit
  app/api/providers/                   4 route handlers
  app/api/insurance-companies/         2 route handlers
  components/providers/                 form, table, filters, tabs, schedule
  components/insurance/                  form, table, search, tabs
  lib/services/provider-service.ts
  lib/services/provider-schedule-service.ts
  lib/services/insurance-service.ts
  lib/validations/providers.ts
  lib/validations/insurance.ts
tests/
  validations/providers.test.ts
  validations/insurance.test.ts
```

## 13. Future Improvements

- **NPI Luhn validation**: current validation only checks digit count/
  format; the NPI standard has a real check-digit algorithm that could be
  added for stronger data quality.
- **Provider-payer credentialing status**: once the Credentialing module
  ships, link providers to insurance_companies with an enrollment/
  in-network status per payer (a provider can be in-network with some
  payers and not others).
- **Schedule conflict detection**: `provider_schedules` doesn't currently
  prevent overlapping blocks for the same provider/day - worth adding once
  the Appointments module needs to book against real availability.
- **Payer plan types**: `insurance_companies` is company-level only; a
  future `insurance_plans` child table could capture HMO/PPO/EPO variants
  per payer once Eligibility needs to distinguish them.
- **Bulk import**: NPPES NPI registry lookup/autofill when adding a
  provider, and a CSV import for payer directories, would both reduce
  manual data entry at organization onboarding.

---

# Module 5: Appointments & Module 6: Medical Coding

Built together: Appointments needed Providers (Module 3) to book against,
and both are prerequisites for Claims. Medical Coding is largely
independent but shipped alongside since it's a similarly-scoped reference
library module.

**A note on scope for both**: this module also went back and added
page-level permission checks (`hasPermission()` + redirect) to the
patient profile page, since building the new Appointments tab surfaced a
gap - Modules 1-4's dashboard pages fetch data directly via the admin
Supabase client (which bypasses RLS) without checking the caller's RBAC
permission first, relying only on the API routes for enforcement. The new
Appointments/Coding pages ship with the check from day one; the
pre-existing gap in Patients/Providers/Insurance/Settings pages is called
out explicitly in Future Improvements below rather than silently patched
everywhere, since that's a larger, deliberate cross-module pass.

## 1. UI Design

- **Appointments** (`/appointments`): a day-schedule list (date/provider/
  status filters) rather than a full drag-drop calendar grid - keeps the
  bundle free of a heavy calendar library while still covering scheduling,
  check-in/check-out, and provider assignment. Appointment detail page
  surfaces the valid next status transitions as buttons (e.g. "Check in"
  only appears on a `scheduled` appointment).
- **Medical Coding** (`/coding`): tabbed browser - My Favorites, ICD-10,
  CPT, HCPCS, Modifiers - each with live search and a star-to-favorite
  toggle per code.
- **Cross-module integration**: the patient profile gained a real
  Appointments tab, and appointment scheduling can be launched directly
  from a patient's profile (`/appointments/new?patientId=...`) with the
  patient pre-filled.

## 2. Database Tables

`supabase/migrations/00000000000012` through `00000000000016`:

- `appointments` - patient/provider/time range/status/type. A **GiST
  exclusion constraint** (`btree_gist` extension) makes provider
  double-booking impossible at the database level, not just app-side
  validation - two active appointments for the same provider with
  overlapping time ranges are rejected by Postgres itself. Cancelled/
  no-show appointments are excluded from the overlap check since they no
  longer occupy the calendar.
- `icd10_codes`, `procedure_codes` (CPT/HCPCS), `modifiers` - shared
  master-data reference libraries, **not** organization-scoped (every org
  sees the same ICD-10/CPT/HCPCS/modifier codes), seeded with ~100
  representative common-specialty codes (see Future Improvements for
  loading the full NLM/CMS code sets).
- `coding_favorites` - per-user quick-access favorites into those
  libraries.

All are RLS-protected using the already-seeded `appointments.*`/
`coding.view` permissions from Module 1 - no permission-catalog migration
needed. `icd10_codes`/`procedure_codes`/`modifiers` have select-only
policies (writes are service-role/seed-managed); `coding_favorites` is
strictly per-user (`user_id = auth.uid()`).

### Relationships

```
patients 1---N appointments N---1 providers
profiles 1---N coding_favorites  (favorites reference icd10_codes/procedure_codes/modifiers by code, not FK - see below)
```

`coding_favorites.code` is intentionally not a foreign key, since it can
point into one of three different reference tables depending on
`code_type` - Postgres doesn't support a conditional/polymorphic FK, so
this is validated at the application layer (the code must exist in the
matching library) rather than the database layer.

## 3. Models

`src/types/database.types.ts` extended with `appointments`, `icd10_codes`,
`procedure_codes`, `modifiers`, `coding_favorites`.

## 4. Controllers (Route Handlers)

`src/app/api/appointments/**` and `src/app/api/coding/**` - 8 endpoints.

## 5. Services

- `appointment-service.ts` - day/patient-scoped listing, create/update
  (translating the GiST exclusion constraint's Postgres `23P01` error
  into a friendly "provider already booked" message), and status
  transitions that stamp `checked_in_at`/`checked_out_at`/`cancelled_at`
  as appropriate.
- `coding-service.ts` - search across the three code libraries, favorite
  add/remove.

## 6. APIs

| Method | URL                                | Purpose                                     |
|--------|--------------------------------------|-----------------------------------------------|
| GET    | `/api/appointments`                  | List appointments (date/provider/status filters) |
| POST   | `/api/appointments`                  | Schedule an appointment (`appointments.manage`) |
| GET    | `/api/appointments/:id`              | Get an appointment                             |
| PATCH  | `/api/appointments/:id`              | Reschedule/edit (`appointments.manage`)        |
| PATCH  | `/api/appointments/:id/status`       | Transition status (check-in/start/complete/cancel/no-show) |
| GET    | `/api/coding/icd10`                  | Search ICD-10 codes                            |
| GET    | `/api/coding/procedures`             | Search CPT/HCPCS (`?codeSet=CPT\|HCPCS`)       |
| GET    | `/api/coding/modifiers`              | Search modifiers                               |
| GET/POST/DELETE | `/api/coding/favorites`     | List/add/remove the caller's favorites         |

## 7. Validation

`src/lib/validations/appointments.ts` - end time after start time on the
same day; a `superRefine`-style check requiring a cancellation reason only
when the target status is `cancelled`.
`src/lib/validations/coding.ts` - format-only regex validators per code
type (`isValidCodeFormat`), reusable later by Claims to sanity-check codes
entered outside the picker.

## 8. Frontend Pages

- `src/app/(dashboard)/appointments/{page,new/page,[id]/page,[id]/edit/page}.tsx`
- `src/app/(dashboard)/coding/page.tsx`

## 9. Components

- `src/components/appointments/*` - `AppointmentForm`,
  `AppointmentFilters`, `AppointmentsScheduleList`,
  `AppointmentDetailActions`.
- `src/components/coding/*` - `CodingTabs`, `CodingBrowser`,
  `FavoritesTab`.
- `src/components/shared/search-combobox.tsx` - new reusable type-ahead
  select (fetches options from the server as the user types), used for the
  patient/provider pickers on the appointment form. Generic enough for
  future modules (e.g. Claims' patient/provider selection) to reuse as-is.

## 10. Business Logic

- **Double-booking prevention at the data layer**: rather than checking
  for overlaps in application code (which has TOCTOU race conditions under
  concurrent requests), the `appointments` table uses a GiST exclusion
  constraint - Postgres itself guarantees no two active appointments for
  the same provider can overlap, regardless of how many requests race to
  create them.
- **Status transition guardrails**: the UI only ever offers the valid next
  actions for an appointment's current status (e.g. you cannot "complete"
  a `scheduled` appointment without checking in first), though the API
  itself accepts any of the six statuses - the guardrail is UX, not a
  state-machine enforced server-side (see Future Improvements).
- **Shared reference data**: ICD-10/CPT/HCPCS/modifiers are loaded once as
  platform-wide master data rather than duplicated per organization,
  consistent with how these code sets work in reality (every practice
  uses the same national code sets).

## 11. Testing

- `tests/validations/appointments.test.ts` - time ordering, cancellation-
  reason requirement, UUID/date format checks.
- `tests/validations/coding.test.ts` - per-code-type format validators.

## 12. Folder Structure

```
supabase/migrations/
  00000000000012_appointments_schema.sql
  00000000000013_appointments_rls.sql
  00000000000014_coding_schema.sql
  00000000000015_coding_rls.sql
  00000000000016_coding_seed.sql
src/
  app/(dashboard)/appointments/        list, new, [id], [id]/edit
  app/(dashboard)/coding/               page.tsx
  app/api/appointments/                 3 route handlers
  app/api/coding/                       4 route handlers
  components/appointments/               form, filters, schedule list, detail actions
  components/coding/                     tabs, browser, favorites
  components/shared/search-combobox.tsx  new
  lib/services/appointment-service.ts
  lib/services/coding-service.ts
  lib/validations/appointments.ts
  lib/validations/coding.ts
tests/
  validations/appointments.test.ts
  validations/coding.test.ts
```

## 13. Future Improvements

- **Per-organization timezone**: `appointment-service.ts` currently treats
  date+time input as UTC (documented in a code comment) - correct
  scheduling requires storing each organization's IANA timezone
  (`organizations.timezone` already exists in the schema from Module 1 but
  isn't read here yet) and converting local time to UTC on write.
- **Server-side status state machine**: status transitions are only
  guarded in the UI; the API will currently accept any status value from
  any prior status. A `is_valid_transition(from, to)` check belongs in
  `updateAppointmentStatus()` before this is safe to expose to a public
  API client.
- **Full code sets**: load the complete ICD-10-CM (~70,000 codes) and
  CPT/HCPCS sets from the NLM/CMS/AMA distributions instead of the ~100-
  code representative sample, likely via a scheduled import job rather
  than a SQL seed file.
- **Recurring appointments and reminders**: no recurrence rule or
  patient reminder (SMS/email) support yet - natural additions once the
  Messaging module ships.
- **Code validation in Claims**: `isValidCodeFormat()` exists but isn't
  called from anywhere yet - wire it into the future Claims module's
  diagnosis/procedure code entry for real-time format feedback.

---

## Addendum: page-level authorization cleanup

Every dashboard page across Modules 1-6 now checks `hasPermission()` before
fetching or rendering data - not just the API routes. Previously, pages
for Patients, Providers, Insurance, and Settings (Team Members, Roles)
fetched data directly via server-side service calls (which use the
service-role client and therefore bypass RLS) without first confirming the
caller's role actually grants the relevant permission; only the
corresponding `POST`/`PATCH`/`DELETE` API routes enforced it. In practice
this was low-risk with the default seeded roles (all sensibly scoped), but
it meant a custom restricted role (e.g. one deliberately missing
`patients.view`) could still reach a page's data by navigating to it
directly, since nothing hid the route itself.

Each page now redirects to `/dashboard` (or, for the dashboard page
itself, to `/settings/profile` - a safe, permission-check-free landing
page - to avoid a redirect loop) if the signed-in user's role lacks the
matching permission:

| Page(s)                                    | Permission checked      |
|----------------------------------------------|---------------------------|
| `/dashboard`                                  | `dashboard.view`          |
| `/patients`, `/patients/[id]`                  | `patients.view`            |
| `/patients/new`, `/patients/[id]/edit`         | `patients.manage`          |
| `/providers`, `/providers/[id]`                | `providers.view`            |
| `/providers/new`, `/providers/[id]/edit`       | `providers.manage`          |
| `/insurance`, `/insurance/[id]`                | `insurance.view`            |
| `/insurance/new`, `/insurance/[id]/edit`       | `insurance.manage`          |
| `/settings/users`                              | `users.view`                |
| `/settings/roles`                              | `roles.manage`              |
| `/appointments/*`, `/coding`                   | already checked from Module 5/6's initial build |

`/settings/profile` and `/settings/security` are intentionally left
unguarded - they're self-scoped (every authenticated user manages their
own profile and security settings regardless of role), so there's no
permission to check.

No schema, migration, or API changes were needed - this was purely
additive page-level guards using the existing `hasPermission()` helper and
`PERMISSIONS` constants from Module 1. Verified with typecheck, lint, the
full test suite, and a production build; behavior is unchanged for every
seeded role (Owner, Admin, Biller, Provider, Front Desk, Auditor, Read
Only) since each already has the permissions its own pages check.

---

# Module 7: Claims

The natural next module once Patients, Providers, Insurance, and Medical
Coding are all in place for it to draw on. Claims is the core of the
"revenue cycle" in RCM: it turns a visit into a billable, trackable claim
that moves through draft → submission → payer adjudication → payment/
appeal.

## 1. UI Design

- **Claims list** (`/claims`): one list, filterable by status, doubles as
  the "submission queue" (`ready`/`submitted`), "rejected claims"
  (`rejected`), and "accepted claims" (`accepted`) views from the original
  spec, rather than four separate pages - the same pattern used for
  Appointments in Module 5.
- **Claim creation**: a simple shell form (patient, rendering provider,
  payer, service date range, place of service, notes) creates a `draft`
  claim and redirects to its detail page - the same "create shell, then
  attach" pattern as Patients/Providers, rather than a stateful multi-step
  wizard with client-side array state.
- **Claim detail** (`/claims/[id]`): diagnoses and procedure lines are
  added incrementally via dialogs (search-and-pick from the Module 6 code
  libraries), a scrubbing panel shows exactly what's blocking submission,
  and status-transition buttons only show the valid next actions for the
  claim's current status (mirroring Appointments' detail-actions pattern).
  A status-history timeline records every transition with who/when/why.

## 2. Database Tables

`supabase/migrations/00000000000017` and `00000000000018`:

- `claims` - the claim shell: patient/provider/payer/policy, service date
  range, place of service, status, running `total_charge_amount`/
  `total_paid_amount`/`total_adjustment_amount`, and denormalized
  timestamp+reason columns for the four most operationally relevant
  transitions (`submitted_at`, `accepted_at`, `rejected_at`+
  `rejection_reason`, `appealed_at`+`appeal_notes`). Other transitions
  (denied, paid, closed, back to draft) are recorded only in
  `claim_status_history`, not given their own columns, to avoid schema
  bloat - the history table is the full audit trail regardless.
- `claim_diagnoses` - up to 12 ICD-10 pointers per claim (`sequence`
  1-12), FK'd to `icd10_codes.code` so a claim can never reference a
  diagnosis code that doesn't exist in the library.
- `claim_lines` - CPT/HCPCS procedure lines with up to 2 modifiers,
  `diagnosis_pointers` (a `smallint[]` referencing `claim_diagnoses
  .sequence`), units, and charge/paid/adjustment amounts. FK'd to
  `procedure_codes.code`/`modifiers.code`.
- `claim_status_history` - append-only audit trail of every status
  transition (`from_status`, `to_status`, `note`, `changed_by`,
  `created_at`).

All four tables are RLS-protected using the `claims.view`/`claims.manage`
permissions already seeded in Module 1's permission catalog - no RBAC
migration was needed. `claims.submit`/`claims.appeal` (also already
seeded) gate the submit/appeal status transitions specifically at the
application layer (API route + service), since those are state-transition
actions rather than distinct row-level access patterns RLS can express.

### Relationships

```
patients 1---N claims N---1 providers
claims N---1 insurance_companies (payer, nullable)
claims N---1 patient_insurance_policies (nullable)
claims 1---N claim_diagnoses N---1 icd10_codes
claims 1---N claim_lines N---1 procedure_codes
claims 1---N claim_status_history N---1 profiles (changed_by)
```

## 3. Models

`src/types/database.types.ts` extended with `claims`, `claim_diagnoses`,
`claim_lines`, `claim_status_history`, and a new `ClaimStatus` union type
(`draft | ready | submitted | accepted | rejected | denied | paid |
appealed | closed`).

## 4. Controllers (Route Handlers)

`src/app/api/claims/**` - 8 endpoints (list/create, get/update shell,
status transitions, scrub, diagnoses add/remove, lines add/remove).

## 5. Services

- `claim-service.ts` - claim number generation (`CLM-000001`, same
  sequential-count-with-retry pattern as patient MRNs), CRUD for the
  shell, diagnosis/line management with running-total recomputation on
  every line add/remove, and status transitions that stamp the relevant
  timestamp/reason columns and always write a `claim_status_history` row.
  Shell/diagnosis/line edits are blocked with a friendly error once a
  claim leaves `draft`/`ready` (`assertShellEditable`), so a submitted
  claim's billed details can't be silently changed after the fact.
- `claim-scrubbing.ts` - **pure, DB-free** claim-readiness logic
  (`scrubClaim`), deliberately separated from `claim-service.ts` so it's
  cheap to unit test without mocking Supabase. Checks: at least one
  diagnosis and one procedure line exist, every ICD-10/CPT/HCPCS/modifier
  code matches its format (reusing `isValidCodeFormat()` from Module 6 -
  the integration point that module's README had already flagged), every
  line's diagnosis pointers resolve to a diagnosis that actually exists on
  the claim, charge amounts and units are positive, and the service date
  range is valid. Missing payer is a warning, not a blocking error.

## 6. APIs

| Method | URL                                          | Purpose                                         |
|--------|------------------------------------------------|--------------------------------------------------|
| GET    | `/api/claims`                                   | List claims (query/status/provider filters)       |
| POST   | `/api/claims`                                   | Create a claim shell (`claims.manage`)            |
| GET    | `/api/claims/:id`                               | Get a claim + diagnoses + lines + status history  |
| PATCH  | `/api/claims/:id`                               | Edit the shell (`claims.manage`, draft/ready only) |
| PATCH  | `/api/claims/:id/status`                        | Transition status (`claims.manage`, plus `claims.submit`/`claims.appeal` for those specific transitions) |
| GET    | `/api/claims/:id/scrub`                         | Run readiness scrubbing, return errors/warnings   |
| POST   | `/api/claims/:id/diagnoses`                     | Add a diagnosis pointer (`claims.manage`)         |
| DELETE | `/api/claims/:id/diagnoses/:diagnosisId`        | Remove a diagnosis pointer (`claims.manage`)      |
| POST   | `/api/claims/:id/lines`                         | Add a procedure line (`claims.manage`)            |
| DELETE | `/api/claims/:id/lines/:lineId`                 | Remove a procedure line (`claims.manage`)         |

## 7. Validation

`src/lib/validations/claims.ts` - `claimSchema` (service end date not
before the start date), `claimDiagnosisSchema`/`claimLineSchema` (reusing
`isValidCodeFormat()` for ICD-10/CPT/HCPCS/modifier format checks),
`claimStatusChangeSchema` (requires a note when rejecting or denying).

## 8. Frontend Pages

- `src/app/(dashboard)/claims/{page,new/page,[id]/page,[id]/edit/page}.tsx`

## 9. Components

- `src/components/claims/*` - `ClaimsTable`, `ClaimsFilters`, `ClaimForm`,
  `ClaimDiagnosesSection`, `ClaimLinesSection`, `ClaimScrubPanel`,
  `ClaimStatusActions`, `ClaimStatusHistoryTimeline`.
- `src/components/patients/patient-claims-tab.tsx` and
  `src/components/providers/provider-claims-tab.tsx` - replace the
  `UpcomingModulePlaceholder` "Claims" tabs added in earlier modules with
  real, filtered claim lists and a "Create claim" shortcut that pre-fills
  the patient or provider (`/claims/new?patientId=...` /
  `?providerId=...`), mirroring the pattern already used for Appointments.

## 10. Business Logic

- **Shell lock after submission**: once a claim leaves `draft`/`ready`,
  its patient/provider/payer/dates, diagnoses, and procedure lines can no
  longer be edited or removed (`assertShellEditable` in
  `claim-service.ts`) - correcting a submitted claim means reopening it
  back to `draft` first (`rejected` → `draft` is a modeled transition),
  which also keeps the status-history trail honest about what was billed
  when.
- **Running totals, not a database trigger**: `total_charge_amount` /
  `total_paid_amount` / `total_adjustment_amount` are recomputed in
  application code every time a line is added or removed, rather than via
  a Postgres trigger - keeps the logic visible and testable in
  TypeScript, at the cost of needing every future write path to remember
  to call `recomputeClaimTotals()` (see Future Improvements).
- **Scrubbing is advisory, not yet enforced server-side**: the claim
  detail page disables the "Submit claim" button when scrubbing reports
  errors, but the `PATCH /api/claims/:id/status` endpoint does not itself
  re-run `scrubClaim()` before accepting a `submitted` transition - a
  determined API client could submit an incomplete claim. Flagged below
  as a Future Improvement rather than silently left unmentioned.
- **Status lifecycle**: `draft → ready → submitted → {accepted, rejected,
  denied}`; `rejected → draft` (revise & resubmit); `denied → {appealed,
  closed}`; `appealed → {accepted, denied}`; `accepted → paid → closed`.
  Every transition is recorded in `claim_status_history` regardless of
  which columns on `claims` it also updates.

## 11. Testing

- `tests/validations/claims.test.ts` - claim shell date ordering,
  diagnosis sequence bounds and ICD-10 format, procedure line CPT/HCPCS/
  modifier format and diagnosis-pointer requirement, status-change note
  requirements for reject/deny.
- `tests/services/claim-scrubbing.test.ts` - the full `scrubClaim()`
  readiness matrix: missing payer (warning only), missing diagnoses/
  lines, malformed codes, dangling diagnosis pointers, non-positive
  charge/units, invalid date range.

## 12. Folder Structure

```
supabase/migrations/
  00000000000017_claims_schema.sql
  00000000000018_claims_rls.sql
src/
  app/(dashboard)/claims/               list, new, [id], [id]/edit
  app/api/claims/                       8 route handlers
  components/claims/                     table, filters, form, diagnoses/lines sections, scrub panel, status actions/history
  components/patients/patient-claims-tab.tsx
  components/providers/provider-claims-tab.tsx
  lib/services/claim-service.ts
  lib/services/claim-scrubbing.ts        pure, DB-free readiness logic
  lib/validations/claims.ts
tests/
  validations/claims.test.ts
  services/claim-scrubbing.test.ts
```

## 13. Future Improvements

- **Server-side scrub enforcement**: `PATCH /api/claims/:id/status` should
  re-run `scrubClaimById()` and reject a `submitted` transition with a 400
  if `isReadyToSubmit` is false, instead of relying solely on the UI
  disabling the button.
- **Clearinghouse/payer integration**: `submitted` currently just flips a
  status and stamps a timestamp - a real system would generate an X12
  837 file (or call a clearinghouse API) and later ingest an 835/277 to
  drive status automatically instead of manual buttons.
- **Trigger-based totals**: move `recomputeClaimTotals()` into a Postgres
  trigger on `claim_lines` insert/update/delete so every future write
  path (including future Payment Posting writes to `paid_amount`) can't
  forget to keep `claims.total_*` in sync.
- **Patient insurance policy picker in the claim form**: the schema
  supports `patient_insurance_policy_id`, but the create/edit form only
  exposes a payer-company dropdown for now - wiring in a per-patient
  policy picker (dependent on the selected patient) is a natural
  follow-up once the form needs primary/secondary COB logic.

---

# Module 8: Eligibility Verification

## 1. UI Design

- **Eligibility list** (`/eligibility`): a history of every check run,
  filterable by patient name and status (Active/Inactive/Error).
- **Run a check** (`/eligibility/new`): pick a patient (and optionally a
  rendering provider + service type), submit, and land directly on the
  result. Reachable from the list page and, more usefully, from a "Check
  eligibility" shortcut on the patient profile's Insurance tab
  (`/eligibility/new?patientId=...`) - the same pre-fill pattern used for
  Appointments and Claims.
- **Result detail** (`/eligibility/[id]`): a snapshot card showing the
  computed status plus the payer/plan/copay/coverage-window data the
  check was based on.

**Important framing, stated plainly**: this module verifies coverage
against the insurance policy **already on file** in this system (its
`is_active` flag and effective/termination dates) - it does **not** call a
real payer or clearinghouse. A production RCM system would submit an X12
270 eligibility request and parse the payer's 271 response; that
integration doesn't exist here (see Future Improvements). Every result
page and the README say this explicitly so it's never mistaken for a live
payer confirmation.

## 2. Database Tables

`supabase/migrations/00000000000019` and `00000000000020`:

- `eligibility_checks` - an **immutable** snapshot per check: which
  patient/policy/provider/service type was checked, the computed
  `status` (`active`/`inactive`/`error`), and a copy of the payer name,
  plan name, policy number, copay, and effective/termination dates *as
  they were at check time* - so a later edit to the patient's policy
  doesn't rewrite history. `checked_by`/`checked_at` complete the audit
  trail. There is no update/delete path - only insert and select RLS
  policies exist, unlike every other module's tables.

RLS reuses the `eligibility.view`/`eligibility.run` permissions already
seeded in Module 1's permission catalog (and already granted to Biller
and Front Desk) - no RBAC migration needed.

### Relationships

```
patients 1---N eligibility_checks N---1 providers (optional)
eligibility_checks N---1 patient_insurance_policies (nullable - the policy snapshotted)
```

## 3. Models

`src/types/database.types.ts` extended with `eligibility_checks` and two
new union types: `EligibilityStatus` (`active | inactive | error`) and
`EligibilityServiceType` (`general | specialist | behavioral_health |
urgent_care | telehealth | other`).

## 4. Controllers (Route Handlers)

`src/app/api/eligibility/**` - 3 endpoints (list, create, get one).

## 5. Services

- `eligibility-coverage.ts` - **pure, DB-free** `computeCoverageStatus()`,
  deliberately separated from `eligibility-service.ts` so it's cheap to
  unit test (same split as Module 7's `claim-scrubbing.ts`). Given a
  policy snapshot and today's date: no policy → `error`; policy marked
  inactive, not yet effective, or already terminated → `inactive` (each
  with an explanatory note); otherwise → `active`.
- `eligibility-service.ts` - resolves which policy to check (an explicit
  `patientInsurancePolicyId`, or the patient's active primary-ranked
  policy if none was specified), calls `computeCoverageStatus()`, and
  inserts the immutable snapshot row.

## 6. APIs

| Method | URL                     | Purpose                                              |
|--------|---------------------------|---------------------------------------------------------|
| GET    | `/api/eligibility`        | List checks (query/status filters, `eligibility.view`)   |
| POST   | `/api/eligibility`        | Run a new check (`eligibility.run`)                      |
| GET    | `/api/eligibility/:id`    | Get one check's snapshot                                 |

## 7. Validation

`src/lib/validations/eligibility.ts` - `eligibilityCheckSchema` (patient
required, provider/policy optional UUIDs, service type enum defaulting to
`general`), `eligibilitySearchSchema` (status filter defaulting to `all`).

## 8. Frontend Pages

- `src/app/(dashboard)/eligibility/{page,new/page,[id]/page}.tsx` - no
  edit page, since results are immutable snapshots.

## 9. Components

- `src/components/eligibility/*` - `EligibilityTable`,
  `EligibilityFilters`, `EligibilityCheckForm`.
- `src/components/patients/insurance-tab.tsx` - gained a "Check
  eligibility" button next to "Add insurance".

## 10. Business Logic

- **Snapshot, not a live reference**: every field that could change later
  (payer name, plan, copay, coverage dates) is copied onto the
  `eligibility_checks` row at check time rather than joined live from
  `patient_insurance_policies` - so historical checks stay accurate even
  after the patient's policy is edited or superseded.
- **Policy resolution**: if the caller doesn't specify which policy to
  check, the service defaults to the patient's active policy with the
  lowest rank (primary before secondary before tertiary) - the policy
  that would actually be billed first.
- **No live payer call**: `status` is derived entirely from data already
  in this system, not a real X12 270/271 round-trip - stated explicitly
  in the UI, this README, and Future Improvements so it's never confused
  with a real-time payer confirmation.

## 11. Testing

- `tests/validations/eligibility.test.ts` - schema defaults and UUID/enum
  validation.
- `tests/services/eligibility-coverage.test.ts` - the full
  `computeCoverageStatus()` matrix: no policy, inactive policy, no
  coverage window, not-yet-effective, already-terminated, and
  boundary-date (exact effective/termination day) cases.

## 12. Folder Structure

```
supabase/migrations/
  00000000000019_eligibility_schema.sql
  00000000000020_eligibility_rls.sql
src/
  app/(dashboard)/eligibility/         list, new, [id]
  app/api/eligibility/                 3 route handlers
  components/eligibility/               table, filters, check form
  lib/services/eligibility-service.ts
  lib/services/eligibility-coverage.ts  pure, DB-free status logic
  lib/validations/eligibility.ts
tests/
  validations/eligibility.test.ts
  services/eligibility-coverage.test.ts
```

## 13. Future Improvements

- **Real clearinghouse/payer integration**: submit an X12 270 (or call a
  clearinghouse API like Availity/Change Healthcare) and parse the 271
  response for deductible, coinsurance, out-of-pocket-max, and
  service-type-specific coverage - none of which this module fabricates,
  since it only has on-file data to work with.
- **Batch/pre-visit checks**: run eligibility automatically for tomorrow's
  scheduled appointments overnight rather than only on-demand, surfacing
  problems (expired coverage, no policy on file) before the patient
  arrives.
- **Policy picker in the check form**: like Claims' equivalent future
  improvement, the create form doesn't yet expose a per-patient policy
  picker when a patient has multiple policies on file - it always
  resolves to the primary. A dependent policy dropdown is a natural
  follow-up.

---

# Module 9: Payment Posting

The natural follow-on to Claims: this module fills in the
`claim_lines.paid_amount`/`adjustment_amount` and
`claims.total_paid_amount`/`total_adjustment_amount` columns that Module 7
scaffolded but never wrote to - turning an accepted claim into a
reconciled one.

## 1. UI Design

- **Payments list** (`/payments`): every payment posted, filterable by
  payer/reference-number search and payment method.
- **Post a payment** (`/payments/new`): pick a claim (search by claim
  number), payer name, method, date, reference number, and total amount -
  creates the payment shell. Reachable from the list page and from a
  "Post payment" shortcut on the claim detail page
  (`/payments/new?claimId=...`) once a claim has left `draft`/`ready`,
  with the payer name pre-filled from the claim's payer when known.
- **Payment detail** (`/payments/[id]`): an "unapplied balance" card (how
  much of this payment hasn't been allocated to a line yet), the claim's
  procedure lines with running charge/paid/adjustment/balance figures,
  an "Allocate to a line" dialog, and a list of what this specific
  payment has applied so far.
- **Claim detail integration**: `claim-lines-section.tsx` now shows paid
  amount and remaining balance under each line's charge once any payment
  has been applied, and a new "Payments" card lists every payment posted
  against the claim.

## 2. Database Tables

`supabase/migrations/00000000000021` and `00000000000022`:

- `payments` - one row per payment received against a claim (ERA/EOB
  batch or a manual entry): payer name, method, date, reference number,
  and `total_amount` - the cash/credit actually received. Like
  `eligibility_checks`, this is insert/select only - no update/delete
  policy - a correction is a new payment or allocation, not an edit to
  history.
- `payment_allocations` - how a payment's money (and any accompanying
  contractual adjustment) applies to one specific `claim_line`. A payment
  can allocate across multiple lines (one allocation row each); `unique
  (payment_id, claim_line_id)` means correcting an allocation means
  posting a new payment rather than editing this one.

RLS reuses the `payments.view`/`payments.post` permissions already
seeded in Module 1's catalog (and already granted to Biller, with
`payments.view` also granted to Read Only and Auditor) - no RBAC
migration needed. `payments.reconcile` is also already seeded and
granted to Biller, but isn't wired to a distinct action yet in this
module - see Future Improvements.

### Relationships

```
claims 1---N payments
payments 1---N payment_allocations N---1 claim_lines
```

## 3. Models

`src/types/database.types.ts` extended with `payments`,
`payment_allocations`, and a new `PaymentMethod` union type (`era |
check | credit_card | cash | eft | other`).

## 4. Controllers (Route Handlers)

`src/app/api/payments/**` - 4 endpoints (list, create, get one, allocate).

## 5. Services

- `payment-service.ts` - `createPayment()`, listing, `getPaymentById()`
  (payment + its claim's procedure lines + this payment's allocations +
  the patient), and `addPaymentAllocation()`: inserts the allocation,
  **increments** (not overwrites) the target `claim_line`'s
  `paid_amount`/`adjustment_amount` so multiple payments over time
  accumulate correctly, calls Module 7's now-exported
  `recomputeClaimTotals()` to roll the new line totals up to the claim,
  and auto-transitions the claim to `paid` (via Module 7's
  `changeClaimStatus()`, writing a status-history entry) once the claim
  is `accepted`/`appealed` and fully reconciled.
- `payment-reconciliation.ts` - **pure, DB-free** `isClaimFullyReconciled()`,
  split out the same way as `claim-scrubbing.ts`/`eligibility-coverage.ts`
  so the "is this claim paid off" threshold (with a small epsilon for
  floating-point rounding) is cheap to unit test in isolation.

## 6. APIs

| Method | URL                              | Purpose                                         |
|--------|-------------------------------------|----------------------------------------------------|
| GET    | `/api/payments`                     | List payments (query/method filters, `payments.view`) |
| POST   | `/api/payments`                     | Post a payment shell against a claim (`payments.post`) |
| GET    | `/api/payments/:id`                 | Get a payment + claim's lines + its allocations       |
| POST   | `/api/payments/:id/allocations`     | Allocate paid/adjustment amounts to a claim line (`payments.post`) |

## 7. Validation

`src/lib/validations/payments.ts` - `paymentSchema` (positive total
amount, required payer name/date), `paymentAllocationSchema`
(non-negative paid/adjustment amounts - zero paid with a positive
adjustment is valid, e.g. a pure contractual write-off), and
`paymentSearchSchema` (method filter defaulting to `all`).

## 8. Frontend Pages

- `src/app/(dashboard)/payments/{page,new/page,[id]/page}.tsx` - no edit
  page; payments are append-only, matching the DB layer.

## 9. Components

- `src/components/payments/*` - `PaymentsTable`, `PaymentsFilters`,
  `PaymentForm`, `PaymentAllocationSection`.
- `src/components/claims/claim-lines-section.tsx` - extended to display
  paid amount and remaining balance per line.
- `src/app/(dashboard)/claims/[id]/page.tsx` - gained a "Payments" card
  and a permission/status-gated "Post payment" shortcut.

## 10. Business Logic

- **Accumulate, don't overwrite**: `addPaymentAllocation()` increments a
  claim line's `paid_amount`/`adjustment_amount` by this allocation's
  amounts rather than setting them outright - so a partially-paid claim
  that later receives a second payment (e.g. secondary insurance, then a
  patient payment) keeps prior postings intact.
- **Reuse, not duplication, for claim totals**: rather than re-deriving
  `claims.total_paid_amount`/`total_adjustment_amount` with separate
  logic, payment posting calls the exact same `recomputeClaimTotals()`
  Module 7 already uses for line add/remove - one source of truth for
  "what does this claim's bottom line look like."
- **Auto-paid is opportunistic, not mandatory**: a claim only
  auto-transitions to `paid` when it's currently `accepted` or `appealed`
  and the reconciled total (paid + adjustment) meets or exceeds the
  charge - a partial payment leaves the claim's status untouched rather
  than forcing a decision the biller hasn't made yet.

## 11. Testing

- `tests/validations/payments.test.ts` - payment/allocation/search schema
  validation, including the zero-paid-with-adjustment case.
- `tests/services/payment-reconciliation.test.ts` - the
  `isClaimFullyReconciled()` matrix: exact match, overpayment, partial,
  untouched, and the floating-point rounding tolerance boundary.

## 12. Folder Structure

```
supabase/migrations/
  00000000000021_payments_schema.sql
  00000000000022_payments_rls.sql
src/
  app/(dashboard)/payments/            list, new, [id]
  app/api/payments/                    4 route handlers
  components/payments/                  table, filters, form, allocation section
  lib/services/payment-service.ts
  lib/services/payment-reconciliation.ts  pure, DB-free reconciliation threshold
  lib/validations/payments.ts
tests/
  validations/payments.test.ts
  services/payment-reconciliation.test.ts
```

## 13. Future Improvements

- **ERA/835 file ingestion**: `payment_method: 'era'` exists as a label,
  but there's no actual X12 835 file parser - payments are always
  entered by hand. A real clearinghouse integration would ingest an 835
  and auto-create the payment + line-level allocations from its claim
  adjustment segments (including standard CARC/RARC reason codes, rather
  than the free-text `adjustment_reason` field here).
- **`payments.reconcile` isn't wired to anything yet**: the permission
  exists in the catalog and is granted to Biller, but there's no distinct
  "reconciliation" workflow (e.g. matching posted payments against bank
  deposits) - right now `payments.post` covers the entire posting flow.
- **No void/reversal flow**: correcting a bad allocation today means
  posting an offsetting payment by hand; a dedicated void action that
  reverses a specific allocation's effect on `claim_lines` and
  `claims.total_*` would be safer.
- **Patient-responsibility tracking**: this module posts payer and
  patient payments identically against the same claim; a real system
  would split out patient responsibility (copay/coinsurance/deductible)
  as its own trackable balance, feeding the eventual AR/Reports modules.

---

# Module 10: Denial Management

## 1. UI Design

- **Denial worklist** (`/denials`): every open (and resolved) denial
  event, filterable by resolution status and root-cause category. There
  is no manual "create denial" page - entries appear here automatically,
  the moment a claim is marked `denied` or `rejected` on its own detail
  page (Module 7).
- **Denial detail** (`/denials/[id]`): the claim/patient it's attached
  to, the reason captured at denial time, and an editable worklist form -
  root-cause category, assignee, follow-up date, resolution status, and
  resolution notes. Read-only for anyone with `denials.view` but not
  `denials.manage` (e.g. Auditor) - the form renders as a disabled
  `<fieldset>` with no Save button for them.

## 2. Database Tables

`supabase/migrations/00000000000023` and `00000000000024`:

- `claim_denials` - one row per denial/rejection **event** (not one row
  per claim - if a claim is rejected, resubmitted, and later denied for a
  different reason, that's two separate worklist entries, each with its
  own audit trail). Deliberately separate from Module 7's
  `claim_status_history` (an append-only, immutable transition log) since
  this table needs to be *edited over time* as a biller works the denial:
  `category`, `assigned_to`, `follow_up_date`, `resolution_status`, and
  `resolution_notes` all change as the case progresses, and
  `resolved_at` is stamped once `resolution_status` reaches `resolved`
  or `written_off`.

RLS reuses the `denials.view`/`denials.manage` permissions already
seeded in Module 1's catalog (and already granted to Biller, with
Admin/Owner covered by their broader grants and Auditor covered by its
`%.view` wildcard) - no RBAC migration needed.

### Relationships

```
claims 1---N claim_denials N---1 profiles (assigned_to)
```

## 3. Models

`src/types/database.types.ts` extended with `claim_denials` and three new
union types: `DenialClaimStatus` (`denied | rejected` - which transition
opened this entry), `DenialCategory` (`eligibility | authorization |
coding_error | timely_filing | duplicate_claim | medical_necessity |
documentation | other`), and `DenialResolutionStatus` (`open |
in_progress | appealed | resolved | written_off`).

## 4. Controllers (Route Handlers)

`src/app/api/denials/**` - 3 endpoints (list, get one, update). No create
endpoint - see Business Logic below for why creation is a side effect of
the claims status route instead.

## 5. Services

- `denial-service.ts` - `createDenialRecordForClaim()` (called from the
  claims status API route, not from `claim-service.ts` itself - see
  below), `listDenials()`/`getDenialById()` with the claim/patient/
  assignee embedded, and `updateDenial()` which stamps `resolved_at` when
  the new status is `resolved`/`written_off` and clears it otherwise (so
  reopening a denial - moving it back to `in_progress` - correctly un-sets
  the resolution timestamp).

## 6. APIs

| Method | URL                | Purpose                                                |
|--------|----------------------|-----------------------------------------------------------|
| GET    | `/api/denials`       | List worklist entries (query/status/category filters, `denials.view`) |
| GET    | `/api/denials/:id`   | Get one entry                                              |
| PATCH  | `/api/denials/:id`   | Update category/assignee/follow-up/resolution (`denials.manage`) |

## 7. Validation

`src/lib/validations/denials.ts` - `denialUpdateSchema` (requires
resolution notes when the new status is `resolved` or `written_off`, via
a `refine`), `denialSearchSchema` (status/category filters defaulting to
`all`).

## 8. Frontend Pages

- `src/app/(dashboard)/denials/{page,[id]/page}.tsx` - no `new` page by
  design.

## 9. Components

- `src/components/denials/*` - `DenialsTable`, `DenialsFilters`,
  `DenialDetailForm`.

## 10. Business Logic

- **Creation lives in the API route, not the service layer**: rather
  than having Module 7's `claim-service.ts` import from this later
  module (a backwards dependency an earlier module shouldn't need to
  know about), `src/app/api/claims/[id]/status/route.ts` calls
  `createDenialRecordForClaim()` itself, right after a successful
  `denied`/`rejected` transition, passing along the same rejection/denial
  note the biller already typed as the initial `reason_detail`. This
  keeps `claim-service.ts` completely unmodified and keeps the
  dependency direction correct (a controller coordinating two services,
  not one module reaching into a module that didn't exist when it was
  written) - the same reasoning Module 9 used the *other* direction
  (payment posting calling into the already-existing
  `recomputeClaimTotals()`).
- **One row per denial event, not per claim**: no dedupe logic checks
  for an existing open `claim_denials` row before inserting - a claim
  that bounces `rejected → draft → resubmitted → denied` gets two
  worklist entries, preserving the full history of what actually
  happened rather than collapsing it into one mutable record.
- **Independent of the claim's own status lifecycle**: marking a denial
  `resolved` here does **not** change the claim's status, and appealing a
  claim (Module 7's own `appealed` transition) does not auto-update the
  denial's `resolution_status` - the two are intentionally decoupled so
  this module doesn't need to react to every future Claims status change
  (see Future Improvements for the case this doesn't yet handle well).

## 11. Testing

- `tests/validations/denials.test.ts` - category/date format validation
  and the resolution-notes-required-on-resolve/write-off `refine` check.

## 12. Folder Structure

```
supabase/migrations/
  00000000000023_denials_schema.sql
  00000000000024_denials_rls.sql
src/
  app/(dashboard)/denials/              list, [id]
  app/api/denials/                      3 route handlers
  app/api/claims/[id]/status/route.ts   updated: opens a denial record on deny/reject
  components/denials/                    table, filters, detail form
  lib/services/denial-service.ts
  lib/validations/denials.ts
tests/
  validations/denials.test.ts
```

## 13. Future Improvements

- **Auto-resolve on claim outcome**: when an appealed claim later reaches
  `paid` (Module 9's auto-paid-on-full-reconciliation) or `closed`, the
  matching `claim_denials` row doesn't automatically flip to `resolved` -
  a biller has to close it out by hand. Wiring this would mean either the
  claims status route or the payment service reaching into
  `denial-service.ts`, deliberately deferred to keep this module's first
  version decoupled and simple.
- **CARC/RARC-coded categories**: `category` is a small fixed enum, not
  the real X12 Claim Adjustment Reason Code / Remittance Advice Remark
  Code taxonomy a production clearinghouse integration (Module 9's own
  Future Improvement) would eventually populate automatically from an
  835's adjustment segments.
- **Overdue follow-up alerting**: `follow_up_date` is stored and
  filterable but nothing surfaces "this is overdue" - no dashboard widget
  or notification yet flags a denial whose follow-up date has passed.
- **Bulk assignment**: denials are assigned one at a time from the detail
  page; a real worklist would let a supervisor bulk-assign a batch to a
  biller from the list view.

---

# Module 11: Accounts Receivable

Where Claims, Payments, and Denials all converge: an open-balance work
queue with an aging report, built almost entirely on data those three
modules already maintain.

## 1. UI Design

- **AR work queue** (`/ar`): five aging-bucket summary cards (0-30,
  31-60, 61-90, 91-120, 120+ days, each with a claim count and total
  balance) above a filterable, paginated list of every claim with an
  open balance. Filter by claim number or aging bucket.
- **No separate AR detail page** - each row links straight to the
  existing claim detail page (Module 7) rather than duplicating claim
  information in a parallel view.
- **Claim detail integration**: a new "Collections" card shows the
  claim's open balance and a running log of follow-up notes ("Called
  payer, said reprocessing..."), visible to `ar.view` and editable by
  `ar.manage`, shown only once a claim has actually been billed (not on
  `draft`/`ready` claims).

## 2. Database Tables

`supabase/migrations/00000000000025` and `00000000000026`:

- **`claims.balance_amount`** (altered onto the existing table, not a
  new table): a Postgres **generated column**
  (`total_charge_amount - total_paid_amount - total_adjustment_amount`,
  `stored`) - lets Postgrest filter/sort/paginate "claims with an open
  balance" directly at the database level (`.gt("balance_amount", 0)`)
  instead of fetching every claim and filtering in application code.
  Indexed (partial, `where balance_amount > 0`) for the work queue query.
- `ar_notes` - an append-only collections follow-up log per claim,
  distinct from Module 7's `claim_status_history` (status transitions)
  and Module 10's `claim_denials` (denial-specific worklist) - this is
  general collections activity on *any* claim with a balance, whether or
  not it was ever denied.

RLS on `ar_notes` reuses the `ar.view`/`ar.manage` permissions already
seeded in Module 1's catalog (and already granted to Biller) - no RBAC
migration needed.

### Relationships

```
claims 1---N ar_notes N---1 profiles (author_id)
```

## 3. Models

`src/types/database.types.ts`: `claims.Row` gained `balance_amount`;
added the new `ar_notes` table.

## 4. Controllers (Route Handlers)

`src/app/api/ar/**` - 3 endpoints (work queue list, aging summary,
per-claim collection notes).

## 5. Services

- `ar-aging.ts` - **pure, DB-free** aging logic, same split as
  `claim-scrubbing.ts`/`eligibility-coverage.ts`/
  `payment-reconciliation.ts`: `calculateDaysOutstanding()`,
  `getAgingBucket()`, `getAgingBucketDateRange()` (the key piece - turns
  a bucket like `31_60` into concrete `submitted_at` date bounds so the
  service layer can filter at the database level instead of computing
  ages for every row in JS), and `summarizeAging()` for the dashboard
  cards.
- `ar-service.ts` - `listArClaims()` (paginated work queue: `balance_amount
  > 0`, excludes `draft`/`ready`, optional aging-bucket date-range
  filter), `getArAgingSummary()` (fetches balance + anchor date for every
  open-balance claim, hands them to `summarizeAging()`), and
  `listArNotesForClaim()`/`addArNote()`.

## 6. APIs

| Method | URL                          | Purpose                                              |
|--------|--------------------------------|---------------------------------------------------------|
| GET    | `/api/ar`                       | Paginated work queue (query/aging-bucket filters, `ar.view`) |
| GET    | `/api/ar/summary`               | Aging bucket totals for the dashboard cards (`ar.view`)  |
| GET    | `/api/ar/:claimId/notes`         | List a claim's collection notes (`ar.view`)              |
| POST   | `/api/ar/:claimId/notes`         | Add a collection note (`ar.manage`)                      |

## 7. Validation

`src/lib/validations/ar.ts` - `arNoteSchema` (non-empty note body),
`arSearchSchema` (aging bucket filter defaulting to `all`).

## 8. Frontend Pages

- `src/app/(dashboard)/ar/page.tsx` - the only new page; everything else
  reuses Module 7's claim detail page.

## 9. Components

- `src/components/ar/*` - `ArAgingSummary`, `ArFilters`, `ArTable`,
  `ClaimCollectionsSection`.
- `src/app/(dashboard)/claims/[id]/page.tsx` - gained the Collections
  card.

## 10. Business Logic

- **The database does the filtering, not application code**: this was
  the central design decision of the module. Rather than fetching every
  claim for an org and computing balances/ages in JavaScript (which
  breaks pagination and gets slower as an org's claim volume grows),
  `balance_amount` is a stored generated column Postgrest can query
  directly, and aging-bucket filters are translated to concrete date
  bounds *before* the query runs, so `.gte()`/`.lte()` on `submitted_at`
  do the real filtering in Postgres.
- **The aging anchor is `submitted_at`, not `service_date_from`**: AR
  aging measures how long a bill has been outstanding *since it was
  billed*, not since the visit happened - a claim sitting in `draft` for
  a month before submission shouldn't already look like a 30-day-old
  receivable the moment it's submitted. (It falls back to
  `service_date_from` only in the summary computation, defensively, in
  case `submitted_at` is ever null.)
- **AR is a lens over existing data, not a new source of truth**: this
  module introduces exactly one new table (`ar_notes`, pure collections
  commentary) - the balance and aging figures themselves are entirely
  derived from what Claims (Module 7) and Payments (Module 9) already
  maintain, so there's no risk of the AR view drifting out of sync with
  the claim it's describing.

## 11. Testing

- `tests/services/ar-aging.test.ts` - day-count edge cases (same day,
  future anchor), bucket boundary values (30/31, 60/61, etc.), that the
  five bucket date ranges are contiguous and non-overlapping, and the
  summary aggregation (grouping, summing, empty input).
- `tests/validations/ar.test.ts` - note body and aging-bucket filter
  validation.

## 12. Folder Structure

```
supabase/migrations/
  00000000000025_ar_balance_column.sql
  00000000000026_ar_notes_schema.sql
src/
  app/(dashboard)/ar/page.tsx
  app/api/ar/                          3 route handlers
  components/ar/                        aging summary, filters, table, collections section
  app/(dashboard)/claims/[id]/page.tsx  updated: Collections card
  lib/services/ar-service.ts
  lib/services/ar-aging.ts              pure, DB-free aging logic
  lib/validations/ar.ts
tests/
  services/ar-aging.test.ts
  validations/ar.test.ts
```

## 13. Future Improvements

- **Materialized aging summary at scale**: `getArAgingSummary()` fetches
  every open-balance claim's balance/anchor date with no pagination cap
  - fine for a single practice's claim volume, but a very large org would
  want a materialized view or a Postgres aggregate query instead of
  summing in JavaScript.
- **Follow-up scheduling on AR itself**: Module 10's denial worklist has
  `follow_up_date`/`assigned_to`; a general (non-denial) AR claim with an
  aging balance has no equivalent - collection notes exist, but nothing
  tracks "who owns this" or "when to check back" the way denials do.
- **Patient vs. payer balance split**: like Module 9's own noted gap,
  `balance_amount` doesn't distinguish what's owed by the payer versus
  the patient (copay/coinsurance/deductible) - a real AR module would
  age and report on those separately.
- **Bulk actions from the work queue**: notes are added one claim at a
  time from its detail page; a supervisor working a list of 50 stale
  claims has no way to bulk-tag or bulk-assign them from `/ar` itself.

---

# Module 12: Reports

A read-only lens over data every prior billing module already maintains -
no new tables, just aggregation and CSV export.

## 1. UI Design

- **Reports** (`/reports`): a from/to date-range picker above four
  sections - Collections Summary, Claims by Status, Provider Production,
  and Denials by Category (with an overall denial rate) - each with its
  own "Export CSV" button. Defaults to the trailing 90 days if no range
  is set.

## 2. Database Tables

None. This module reads `claims` (filtered by `service_date_from` within
the selected range) and `claim_denials` (filtered by `created_at` within
the range) - both already exist. `reports.view` was already seeded in
Module 1's permission catalog (and granted to Biller, Admin, Auditor via
its `%.view` wildcard, and Read Only) - no RBAC migration needed. There is
no `reports.manage`; reports are inherently read-only/export-only, which
the permission catalog already reflected from the start.

## 3. Models

No new types beyond the aggregation shapes in `report-aggregation.ts`
(not persisted, so they live as plain TypeScript interfaces, not
`database.types.ts` entries).

## 4. Controllers (Route Handlers)

`src/app/api/reports/**` - 2 endpoints (JSON summary, CSV export).

## 5. Services

- `report-aggregation.ts` - **pure, DB-free** functions, the same split
  used by every prior module's business logic
  (`claim-scrubbing`/`eligibility-coverage`/`payment-reconciliation`/
  `ar-aging`): `summarizeClaimsByStatus()`, `summarizeCollections()`
  (charge/paid/adjustment/balance totals plus a collection-rate
  percentage), `summarizeProviderProduction()` (grouped and sorted by
  charge volume), `summarizeDenialCategories()`, `calculateDenialRate()`,
  and `toCsv()` (a small, dependency-free CSV serializer with proper
  quote/comma escaping).
- `report-service.ts` - fetches claims in the date range (joined to
  `providers` for names) and denials in the date range, then hands both
  to the aggregation functions above.

## 6. APIs

| Method | URL                    | Purpose                                                       |
|--------|--------------------------|--------------------------------------------------------------------|
| GET    | `/api/reports/summary`   | All four aggregations for a date range (`reports.view`)             |
| GET    | `/api/reports/export`    | CSV download for one section (`?type=status\|collections\|providers\|denials`) |

## 7. Validation

`src/lib/validations/reports.ts` - `reportDateRangeSchema` (optional
YYYY-MM-DD `from`/`to`), `reportExportSchema` (adds the export `type`
enum).

## 8. Frontend Pages

- `src/app/(dashboard)/reports/page.tsx` - the only page; calls
  `getReportsSummary()` directly rather than fetching its own API route,
  consistent with every other server-rendered page in this app.

## 9. Components

- `src/components/reports/*` - `ReportDateRangeFilter`,
  `ClaimsStatusSection`, `CollectionsSection`, `ProviderProductionSection`,
  `DenialCategorySection`.

## 10. Business Logic

- **The service/aggregation split, once more**: exactly the same
  reasoning as Modules 7/8/9/11 - fetching is I/O, bucketing/summing is
  logic, and keeping them in separate files means the logic can be unit
  tested without touching Supabase at all.
- **Two different date dimensions, on purpose**: claims are windowed by
  `service_date_from` (a report titled "March collections" should mean
  visits that happened in March, not claims merely touched that month),
  while denials are windowed by `claim_denials.created_at` (when the
  denial was *opened*, matching Module 10's own worklist framing) -
  documented explicitly rather than silently picking one and hoping it
  reads naturally for both.
- **CSV export reuses the exact same aggregation the page renders**:
  `/api/reports/export` calls `getReportsSummary()` and formats the same
  summary object the UI displays, so the downloaded file can never drift
  from what's on screen.

## 11. Testing

- `tests/services/report-aggregation.test.ts` - every aggregation
  function (grouping, sorting, zero-division guards) and `toCsv()`
  (header/row formatting, comma/quote escaping).

## 12. Folder Structure

```
src/
  app/(dashboard)/reports/page.tsx
  app/api/reports/                      2 route handlers
  components/reports/                    date filter, 4 summary sections
  lib/services/report-service.ts
  lib/services/report-aggregation.ts     pure, DB-free aggregation + CSV
  lib/validations/reports.ts
tests/
  services/report-aggregation.test.ts
```

## 13. Future Improvements

- **No pagination/cap on the underlying fetch**: like Module 11's aging
  summary, `fetchClaimsInRange()` pulls every matching claim with no
  limit - fine at demo scale, but a very large org over a wide date range
  would want a database-side aggregate query instead of summing in JS.
- **No saved/scheduled reports**: every report is computed on-demand for
  whatever range is in the URL; a real system would let a biller save a
  report configuration or schedule a recurring email export.
- **No chart visualizations**: everything renders as tables and summary
  numbers - trend charts (collections over time, denial rate over time)
  would need either a charting library or hand-rolled SVG, deliberately
  out of scope here.
- **Combined multi-sheet export**: each CSV export is one section at a
  time; a single workbook-style export covering all four sections isn't
  implemented.

---

# Module 13: Credentialing

Fills in the "Credentialing" tab left as a placeholder on the provider
profile since Module 3, plus an organization-wide worklist for tracking
which providers have expiring licenses, DEA registrations, or malpractice
coverage.

## 1. UI Design

- **Provider profile "Credentialing" tab**: replaces the
  `UpcomingModulePlaceholder` with a real list of that provider's
  credentialing records - type, number, issuing authority, expiration
  date, a manually-set status badge, and a computed "Expiring soon"/
  "Expired" badge layered on top. Add/edit via one shared dialog; delete
  inline. Hidden entirely (not just disabled) for viewers without
  `credentialing.view` - the tab trigger itself doesn't render.
- **Credentialing worklist** (`/credentialing`): every credentialing
  record across every provider in the org, filterable by status and by
  "expiring in 60 days" - the compliance-officer view, as opposed to the
  provider profile's per-provider view. Rows link to the provider's
  profile rather than a separate detail page.

## 2. Database Tables

`supabase/migrations/00000000000027` and `00000000000028`:

- `provider_credentials` - one row per credentialing item (NPI, state
  license, DEA registration, malpractice insurance, board certification,
  CAQH, W9, other), with an optional issue/expiration window, a
  manually-set `status` (`active`/`expired`/`pending_renewal`/`revoked`),
  and free-text notes.

RLS reuses the `credentialing.view`/`credentialing.manage` permissions
already seeded in Module 1's catalog. Notably, `credentialing.manage` is
**not** granted to Biller in the seed - only Admin/Owner (via their
broad grants) can add or edit records, while Provider (their own status)
and Auditor (via the `%.view` wildcard) can view - a real-world scope
choice (credentialing is typically an administrative/compliance
function, not a billing one) that required no changes, since Module 1's
catalog already reflected it.

### Relationships

```
providers 1---N provider_credentials
```

## 3. Models

`src/types/database.types.ts` extended with `provider_credentials` and
two new union types: `CredentialType` (`npi | state_license | dea |
malpractice_insurance | board_certification | caqh | w9 | other`) and
`CredentialStatus` (`active | expired | pending_renewal | revoked`).

## 4. Controllers (Route Handlers)

`src/app/api/credentialing/route.ts` (org-wide list) plus
`src/app/api/providers/[id]/credentials/**` (2 route files, 4 handlers:
list/create, update/delete) - nested under `/api/providers` since a
credential always belongs to exactly one provider, but gated by
`credentialing.*` permissions rather than `providers.*`, since
credentialing is its own permission domain.

## 5. Services

- `credentialing-status.ts` - **pure, DB-free** `isExpired()`/
  `isExpiringSoon()` (default 60-day warning window), the same pattern
  as every prior module's business logic. This is a computed alert layer
  independent of the record's manually-set `status` field: a credential
  a biller marked "active" can still be flagged "Expiring soon" the
  moment its `expiration_date` falls inside the window - the two
  indicators are shown side by side rather than one replacing the other.
- `credentialing-service.ts` - org-wide and per-provider listing, plus
  create/update/delete. Unlike most of Modules 7-12's audit-trail-style
  tables, credentials support real edits and hard deletes - a
  credentialing record is corrected or superseded in place, not
  versioned.

## 6. APIs

| Method | URL                                          | Purpose                                            |
|--------|------------------------------------------------|--------------------------------------------------------|
| GET    | `/api/credentialing`                            | Org-wide worklist (status/expiring-soon filters, `credentialing.view`) |
| GET    | `/api/providers/:id/credentials`                | List one provider's credentials (`credentialing.view`)  |
| POST   | `/api/providers/:id/credentials`                | Add a credential (`credentialing.manage`)               |
| PATCH  | `/api/providers/:id/credentials/:credentialId`  | Edit a credential (`credentialing.manage`)              |
| DELETE | `/api/providers/:id/credentials/:credentialId`  | Remove a credential (`credentialing.manage`)            |

## 7. Validation

`src/lib/validations/credentialing.ts` - `credentialSchema` (type enum,
optional number/authority/dates, status defaulting to `active`),
`credentialSearchSchema` (status filter defaulting to `all`, an
`expiringSoon` string-to-boolean transform for the `?expiringSoon=true`
query param).

## 8. Frontend Pages

- `src/app/(dashboard)/credentialing/page.tsx` - the only new page.
- `src/app/(dashboard)/providers/[id]/page.tsx` - updated to fetch and
  pass credentials (only when the viewer has `credentialing.view`).

## 9. Components

- `src/components/credentialing/*` - `CredentialingTable`,
  `CredentialingFilters`.
- `src/components/providers/provider-credentialing-tab.tsx` - replaces
  the Module 3 placeholder.
- `src/components/providers/provider-tabs.tsx` - the Credentialing tab
  trigger/content now only renders when credentials data was fetched
  (i.e. the viewer has `credentialing.view`).

## 10. Business Logic

- **Computed alerts layered over manual status, not replacing it**: a
  credentialing coordinator's manually-chosen `status` (e.g., marking
  something "pending_renewal" while paperwork is in flight) and the
  system's own date-driven "Expired"/"Expiring soon" badges are
  deliberately independent - the manual status captures workflow state
  the dates alone can't ("we know, we're handling it"), while the
  computed badge ensures an expiring credential is never silently missed
  just because nobody updated its status field yet.
- **Real deletes, unlike most of the RCM modules built so far**: Claims/
  Payments/Denials/AR/Eligibility all treat their core records as an
  append-only audit trail by design (financial and compliance history
  shouldn't be rewritten). Credentialing records are different - a
  duplicate entry or a typo in a license number should just be fixed or
  removed, so this module allows real updates and hard deletes.
- **Permission-gated tab visibility, not just disabled fields**: most
  earlier modules disable a form for view-only roles (e.g. Denials'
  `<fieldset disabled>`). Here, a provider profile viewer without
  `credentialing.view` never even sees the Credentialing tab trigger -
  the data is never fetched for them at all, since credentialing status
  can be more sensitive than most other per-provider information.

## 11. Testing

- `tests/services/credentialing-status.test.ts` - expiration boundary
  cases (exact day, day after, custom warning windows).
- `tests/validations/credentialing.test.ts` - type/date/status
  validation and the `expiringSoon` string-to-boolean transform.

## 12. Folder Structure

```
supabase/migrations/
  00000000000027_credentialing_schema.sql
  00000000000028_credentialing_rls.sql
src/
  app/(dashboard)/credentialing/page.tsx
  app/api/credentialing/route.ts
  app/api/providers/[id]/credentials/            2 route files, 4 handlers
  components/credentialing/                       table, filters
  components/providers/provider-credentialing-tab.tsx
  lib/services/credentialing-service.ts
  lib/services/credentialing-status.ts            pure, DB-free expiry logic
  lib/validations/credentialing.ts
tests/
  services/credentialing-status.test.ts
  validations/credentialing.test.ts
```

## 13. Future Improvements

- **No document attachments**: a real credentialing record needs the
  actual license/certificate file attached (mirroring Module 2's
  `patient_documents` Storage pattern) - this module tracks structured
  metadata only, deliberately deferring file upload to a future
  dedicated Documents module.
- **No renewal reminders/notifications**: "Expiring soon" is a badge you
  have to go looking for (the worklist or the provider tab) - there's no
  email/in-app notification when a credential crosses into its warning
  window.
- **CAQH/PECOS/NPI registry verification**: the permission catalog's own
  description ("View CAQH/PECOS/NPI/DEA/license status") implies live
  verification against those external registries; this module only
  stores whatever a human enters, with no automated lookup or
  verification against any external source.
- **No credentialing workflow/checklist**: real payer credentialing is a
  multi-step process (application, primary source verification,
  committee approval) tracked over weeks; `pending_renewal` is the only
  in-progress status offered here, not a full workflow state machine.

---

# Module 14: Documents

A general, organization-wide document library - contracts, payer
agreements, compliance policies - distinct from Module 2's
`patient_documents`, which is patient-specific and stays exactly as it
was.

## 1. UI Design

- **Documents** (`/documents`): a filterable list (by category and file
  name), an upload button with a category picker, and per-document
  download/upload-new-version/delete actions.

## 2. Database Tables

`supabase/migrations/00000000000029` and `00000000000030`:

- `documents` - file metadata (name, path, size, MIME type, category),
  optionally tagged to a `patient`/`provider`/`claim` via
  `entity_type`/`entity_id` (a `check` constraint enforces both are null
  or both are set - deliberately not a real FK, since it can point at
  three different tables depending on `entity_type`, the same reasoning
  Module 6's `coding_favorites.code` used for the same shape of problem).
  Versioning is a simple chain: uploading a new version sets the
  previous row's `is_current` to `false` and inserts a new row pointing
  back via `replaces_document_id` - the current version is always
  `is_current = true`.
- **`organization-documents` Storage bucket** - private, path convention
  `{organization_id}/{category}/{uuid}-{filename}`, mirroring Module 2's
  `patient-documents` bucket exactly (signed upload/download URLs, file
  bytes never touch the Next.js server).

RLS reuses the `documents.view`/`documents.manage` permissions already
seeded in Module 1 - the same pair Module 2's `patient_documents` storage
policies already used, confirming "documents" was always meant to be one
permission domain covering every document surface in the app, not just
patient files.

### Relationships

```
documents N---1 profiles (uploaded_by)
documents N---1 documents (replaces_document_id, self-referential version chain)
```

## 3. Models

`src/types/database.types.ts` extended with `documents` and two new union
types: `OrgDocumentCategory` (`contract | policy | payer_agreement |
compliance | provider_credential | other`) and `OrgDocumentEntityType`
(`patient | provider | claim`).

## 4. Controllers (Route Handlers)

`src/app/api/documents/**` - 4 route files, 6 handlers (list/create,
upload-url, get-download-url/delete, new-version).

## 5. Services

- `document-service.ts` - mirrors `patient-document-service.ts`'s signed
  URL pattern almost exactly (`buildDocumentStoragePath()`,
  `createSignedUploadUrl()`, `getSignedDownloadUrl()`), plus
  `createDocumentVersion()`, which is the one genuinely new piece: it
  supersedes the previous row (`is_current = false`) and inserts the new
  version carrying forward the previous row's category/entity tag.

## 6. APIs

| Method | URL                          | Purpose                                            |
|--------|--------------------------------|--------------------------------------------------------|
| GET    | `/api/documents`                | List current documents (query/category filters, `documents.view`) |
| POST   | `/api/documents`                | Record uploaded file metadata (`documents.manage`)       |
| POST   | `/api/documents/upload-url`     | Issue a signed Storage upload URL (`documents.manage`)    |
| GET    | `/api/documents/:id`             | Issue a signed download URL (`documents.view`)            |
| DELETE | `/api/documents/:id`             | Delete a document + its Storage object (`documents.manage`) |
| POST   | `/api/documents/:id/versions`   | Upload a new version, superseding this one (`documents.manage`) |

## 7. Validation

`src/lib/validations/documents.ts` - `documentMetaSchema` (category enum
defaulting to `other`, optional entity tag, positive file size),
`documentSearchSchema` (category filter defaulting to `all`).

## 8. Frontend Pages

- `src/app/(dashboard)/documents/page.tsx` - the only page.

## 9. Components

- `src/components/documents/*` - `DocumentsFilters`, `DocumentsList`
  (owns the entire upload/download/version/delete flow as one client
  component, the same shape as Module 2's `documents-tab.tsx`).

## 10. Business Logic

- **Version chain via a self-referential FK, not a separate table**:
  `replaces_document_id` pointing back into `documents` itself keeps the
  full history queryable (walk the chain backward) without a parallel
  `document_versions` table - simpler for what this module needs, at the
  cost of one extra `is_current` filter on every "give me the current
  files" query.
- **Entity tagging is optional and unenforced beyond the pairing check**:
  a document doesn't have to be tagged to anything (a general compliance
  policy isn't "about" any single patient/provider/claim); when it is
  tagged, the database only enforces that both columns are set together,
  not that the referenced row actually exists - deliberately deferred (see
  Future Improvements), matching how `coding_favorites.code` handles the
  same polymorphic-reference tradeoff.

## 11. Testing

- `tests/validations/documents.test.ts` - category defaults, file-size
  validation, entity-tag validation.

## 12. Folder Structure

```
supabase/migrations/
  00000000000029_documents_schema.sql
  00000000000030_documents_rls.sql
src/
  app/(dashboard)/documents/page.tsx
  app/api/documents/                    4 route files, 6 handlers
  components/documents/                  filters, list (upload/download/version/delete)
  lib/services/document-service.ts
  lib/validations/documents.ts
tests/
  validations/documents.test.ts
```

## 13. Future Improvements

- **No UI for entity tagging**: the schema supports tagging a document to
  a patient/provider/claim, but the upload dialog doesn't expose that
  picker yet - deliberately deferred to keep the v1 upload flow simple;
  a natural follow-up is surfacing it contextually (e.g. an "Attach
  document" action directly on a provider's or claim's own page).
- **No referential integrity on `entity_id`**: since it's polymorphic,
  nothing stops a document from pointing at a deleted patient/provider/
  claim - a real system might use a trigger to null it out on delete, the
  same class of problem `coding_favorites` already has.
- **No full-text search or OCR**: the permission catalog's own
  description ("View uploaded documents and OCR results") implies OCR
  extraction; this module only stores the file itself, with no text
  extraction or search-by-content.

---

# Module 15: Messaging

An internal team message board - named channels holding a flat,
chronological list of messages. Deliberately not a full 1:1/DM chat
product; see Business Logic for why.

## 1. UI Design

- **Messages** (`/messages`): a channel sidebar (create new channels
  inline) and a message pane for the selected channel with a compose box.
  No realtime/websockets - sending a message reloads that channel's list;
  a manual refresh button is also available.

## 2. Database Tables

`supabase/migrations/00000000000031` and `00000000000032`:

- `message_channels` - named channels per organization (`unique
  (organization_id, name)`), e.g. "General", "Billing", "Front Desk".
- `messages` - flat, chronological messages within a channel - no
  threading, no reactions, no read receipts.

RLS reuses the single `messaging.use` permission already seeded in
Module 1's catalog. Unlike every other module, there is no separate
view/manage split in the permission catalog itself - `messaging.use`
alone gates reading, posting, *and* channel creation, since the catalog
never defined a `messaging.manage` to gate channel creation more tightly.

### Relationships

```
message_channels 1---N messages N---1 profiles (author_id)
```

## 3. Models

`src/types/database.types.ts` extended with `message_channels` and
`messages` - no new union types needed (no enum-like columns).

## 4. Controllers (Route Handlers)

`src/app/api/messages/**` - 2 route files, 4 handlers (list/create
channels, list/post messages within a channel).

## 5. Services

- `messaging-service.ts` - straightforward CRUD: list channels, create a
  channel (translating a unique-name collision into a friendly error),
  list a channel's messages (capped at 200, oldest-first), post a
  message.

## 6. APIs

| Method | URL                                        | Purpose                                    |
|--------|-----------------------------------------------|-------------------------------------------------|
| GET    | `/api/messages/channels`                      | List channels (`messaging.use`)                  |
| POST   | `/api/messages/channels`                      | Create a channel (`messaging.use`)               |
| GET    | `/api/messages/channels/:channelId/messages`  | List a channel's messages (`messaging.use`)      |
| POST   | `/api/messages/channels/:channelId/messages`  | Post a message (`messaging.use`)                 |

## 7. Validation

`src/lib/validations/messaging.ts` - `channelSchema` (required name, max
80 chars), `messageSchema` (required body, max 4000 chars).

## 8. Frontend Pages

- `src/app/(dashboard)/messages/page.tsx` - the only page; fetches the
  initial channel list server-side and hands off to a client workspace
  for everything interactive.

## 9. Components

- `src/components/messaging/messages-workspace.tsx` - one client
  component owning channel selection, message loading, sending, and
  channel creation (a "New channel" dialog).

## 10. Business Logic

- **A message board, not a chat app, by deliberate scope choice**: the
  permission catalog's description ("Send/receive internal chat and
  announcements") could support either a full DM/group-conversation
  product or a simpler shared-channel model. Given this is a practice-
  management/RCM context (announcements about payer policy changes,
  system downtime, front-desk coordination) rather than a consumer chat
  product, and given effort budget, a flat shared-channel board was
  chosen - every channel is visible to everyone with `messaging.use`
  (there's no per-channel membership/privacy model).
- **No realtime**: without websockets or Supabase Realtime wired in,
  new messages from other users only appear on a manual refresh or after
  you send your own message - explicitly not simulated as "live" to
  avoid implying a capability that isn't actually there.
- **No channel deletion/archiving**: channels, once created, are
  permanent - there's no equivalent of Denials'/AR's careful "what can be
  edited vs. what's append-only" distinction here because the whole
  module is intentionally minimal.

## 11. Testing

- `tests/validations/messaging.test.ts` - channel name and message body
  length/emptiness validation.

## 12. Folder Structure

```
supabase/migrations/
  00000000000031_messaging_schema.sql
  00000000000032_messaging_rls.sql
src/
  app/(dashboard)/messages/page.tsx
  app/api/messages/                      2 route files, 4 handlers
  components/messaging/messages-workspace.tsx
  lib/services/messaging-service.ts
  lib/validations/messaging.ts
tests/
  validations/messaging.test.ts
```

## 13. Future Improvements

- **Realtime delivery**: the single biggest gap - wiring up Supabase
  Realtime (or polling) so messages appear for other users without a
  manual refresh is the natural next step for this module specifically.
- **Direct/private messages**: today everything is a shared channel; a
  real internal chat product would eventually want 1:1 or small-group
  private conversations, which is a materially different data model
  (participants table, per-conversation read state) deliberately not
  attempted here.
- **Threading, reactions, read receipts**: all absent, consistent with
  the "flat message board" scope decision.
- **`messaging.manage`**: the permission catalog has no separate
  channel-management permission, so anyone who can message can also
  create channels; a real deployment might want channel creation
  restricted to admins.

---

# Module 16: Billing & Plan

The organization's own subscription tier - extends the `organizations`
row from Module 1 (which already had `trial_ends_at`/`is_active`)
rather than introducing a new table, since an organization has exactly
one subscription.

## 1. UI Design

- **Billing & Plan** (`/billing`): a "Current plan" summary card (tier,
  billing cycle, seats included, status, trial end date if trialing),
  followed by a three-tier plan comparison grid (Starter/Professional/
  Enterprise) with a monthly/annual toggle and a "Switch to this plan"
  button per card. A banner states plainly: **"Demo mode: switching
  plans here updates your organization's tier immediately - no payment is
  processed and no card is charged."**

**Why stated this explicitly**: there is no real payment processor (e.g.
Stripe) wired into this app - building one would require real API keys/
secrets this environment doesn't have, and fabricating fake invoice
history or a checkout flow that looks like it processes payment would be
actively misleading. So this module does the honest version: a real,
working plan-tier switch with no pretense of moving real money.

## 2. Database Tables

`supabase/migrations/00000000000033` - no new table, an `alter table` on
`organizations` adding `plan_tier` (`starter`/`professional`/
`enterprise`), `billing_cycle` (`monthly`/`annual`), `seats_included`,
and `subscription_status` (`trialing`/`active`/`past_due`/`canceled`).
No RLS migration needed - `organizations` already has RLS from Module 1,
and (consistent with every other module in this app) the real
enforcement is the API route's `hasPermission()` check, not a new
row-level policy.

`subscription.view`/`subscription.manage` were already seeded in Module
1's catalog and already had real semantics baked in from day one: Owner
has both; Admin has `subscription.view` (via its "everything except
`subscription.manage`/`organization.admin`" grant) but not
`subscription.manage` - so an Admin can see the current plan but only an
Owner can actually change it, a real-world distinction (Admins run
day-to-day operations; only the practice owner controls the bill) this
module required no new grants to express.

## 3. Models

`src/types/database.types.ts`: `organizations.Row` gained
`plan_tier`/`billing_cycle`/`seats_included`/`subscription_status`, plus
three new union types (`PlanTier`, `BillingCycle`, `SubscriptionStatus`).

## 4. Controllers (Route Handlers)

`src/app/api/organization/subscription/route.ts` - 2 handlers (get,
change plan).

## 5. Services

- `subscription-service.ts` - `getOrganizationSubscription()` and
  `changeSubscriptionPlan()` (updates tier/cycle, resets
  `seats_included` to the new tier's default from the plan catalog, and
  sets `subscription_status` to `active`).

## 6. APIs

| Method | URL                              | Purpose                                          |
|--------|-------------------------------------|-------------------------------------------------------|
| GET    | `/api/organization/subscription`    | Get the current plan/status (`subscription.view`)        |
| PATCH  | `/api/organization/subscription`    | Change plan tier/billing cycle (`subscription.manage`)   |

## 7. Validation

`src/lib/validations/subscription.ts` - `changePlanSchema` (plan tier +
billing cycle enums, both required).

## 8. Frontend Pages

- `src/app/(dashboard)/billing/page.tsx` - the only page.

## 9. Components

- `src/components/billing/plan-comparison.tsx` - the interactive
  three-card grid with the billing-cycle toggle and switch-plan buttons
  (hidden/disabled entirely for viewers without `subscription.manage`,
  same "don't even render the control" pattern Module 13 used for its
  Credentialing tab).
- `src/lib/constants/subscription-plans.ts` - the static plan catalog
  (name, monthly/annual price, included seats, feature list) driving both
  the comparison grid and the server-side seat-count update.

## 10. Business Logic

- **No real payment processing, stated everywhere it matters**: the UI
  banner, this README, and the column comment on
  `organizations.subscription_status` in the migration itself all say
  the same thing, so nobody - not a future contributor, not a user
  reading the deployed app - mistakes this for a real billing system.
- **Plan catalog as a single source of truth**: `PLAN_CATALOG` in
  `subscription-plans.ts` drives both what the UI displays and what
  `seats_included` gets set to server-side on a plan change, so the two
  can never drift apart the way they would if the UI hard-coded numbers
  separately from the API.
- **Permission-gated control, not just gated visibility**: an Admin (who
  has `subscription.view` but not `subscription.manage`) sees the exact
  same comparison grid an Owner does, just without any switch-plan
  buttons rendered - consistent with how this app has handled
  view-vs-manage splits everywhere else (e.g. Denials' disabled
  `<fieldset>`), rather than hiding the whole page.

## 11. Testing

- `tests/validations/subscription.test.ts` - plan tier and billing cycle
  enum validation.

## 12. Folder Structure

```
supabase/migrations/
  00000000000033_subscription_columns.sql
src/
  app/(dashboard)/billing/page.tsx
  app/api/organization/subscription/route.ts
  components/billing/plan-comparison.tsx
  lib/constants/subscription-plans.ts
  lib/services/subscription-service.ts
  lib/validations/subscription.ts
tests/
  validations/subscription.test.ts
```

## 13. Future Improvements

- **Real payment processor integration**: a production version of this
  module would integrate Stripe (or similar) for actual card charges,
  webhooks-driven `subscription_status` updates (e.g. `past_due` on a
  failed charge), and real invoice history - none of which exists here,
  by design, given the lack of real payment credentials in this
  environment.
- **Seat enforcement**: `seats_included` is stored and shown, but nothing
  actually stops an organization from inviting more users than their
  plan allows (Module 1's `users.manage`/invite flow doesn't check this
  module's seat count) - wiring that check is a natural follow-up.
- **Downgrade guardrails**: switching to a lower tier doesn't check
  whether the organization is currently using features the new tier
  doesn't include (e.g. more seats already in use than the new tier's
  `seats_included`) - a real system would warn or block on that.

---

# Module 17: CRM

A lightweight sales pipeline for the billing company's **own** business
development - tracking prospective and existing client relationships
(practices considering or already using this organization's billing
services). Not to be confused with the patients this organization bills
on behalf of its provider clients - a completely separate concept that
happens to share the word "client."

## 1. UI Design

- **CRM** (`/crm`): a filterable lead list (by stage/search), an "Add
  lead" flow, and a lead detail page showing contact info plus an
  activity log (calls/emails/meetings/notes) with a form to log new
  activity.

## 2. Database Tables

`supabase/migrations/00000000000034` and `00000000000035`:

- `crm_leads` - one row per pipeline entry: contact/company info, `stage`
  (`lead → qualified → proposal → contract_sent → client`, or `lost`),
  estimated value, source, and an assigned owner.
- `crm_activities` - an append-only interaction log per lead (call/email/
  meeting/note), the same "activity feed" shape used elsewhere in this
  app (Denials' resolution notes, AR's collection notes).

RLS reuses the `crm.view`/`crm.manage` permissions already seeded in
Module 1's catalog. Neither is granted to Biller/Front Desk/Provider in
the original seed - only Admin/Owner (via their broad grants) can see or
manage the pipeline, which tracks: sales/business-development is a
practice-ownership concern, not a billing-staff one.

### Relationships

```
crm_leads 1---N crm_activities
crm_leads N---1 profiles (owner_id)
```

## 3. Models

`src/types/database.types.ts` extended with `crm_leads`/`crm_activities`
and three new union types: `CrmLeadStage`, `CrmLeadSource`, and
`CrmActivityType`.

## 4. Controllers (Route Handlers)

`src/app/api/crm/leads/**` - 3 route files, 6 handlers (list/create,
get/update a lead, list/add activities).

## 5. Services

- `crm-service.ts` - lead CRUD plus `listActivitiesForLead()`/
  `addActivity()`. `updateLead()` writes a `crm.lead_stage_changed` audit
  log entry specifically when the stage differs from before, separate
  from the general `crm.lead_updated`-style logging every other field
  edit gets folded into a plain `crm.lead_created`/no-op.

## 6. APIs

| Method | URL                                | Purpose                                    |
|--------|---------------------------------------|-------------------------------------------------|
| GET    | `/api/crm/leads`                      | List leads (query/stage filters, `crm.view`)     |
| POST   | `/api/crm/leads`                      | Create a lead (`crm.manage`)                     |
| GET    | `/api/crm/leads/:id`                  | Get one lead                                     |
| PATCH  | `/api/crm/leads/:id`                  | Update a lead, including stage (`crm.manage`)    |
| GET    | `/api/crm/leads/:id/activities`       | List a lead's activity log                       |
| POST   | `/api/crm/leads/:id/activities`       | Log an activity (`crm.manage`)                   |

## 7. Validation

`src/lib/validations/crm.ts` - `crmLeadSchema` (stage/source enums
defaulting to `lead`/`other`, optional email validated as an email,
non-negative estimated value), `crmActivitySchema`, `crmSearchSchema`.

## 8. Frontend Pages

- `src/app/(dashboard)/crm/{page,new/page,[id]/page,[id]/edit/page}.tsx`

## 9. Components

- `src/components/crm/*` - `LeadsTable`, `LeadsFilters`, `LeadForm`,
  `LeadActivitySection`.

## 10. Business Logic

- **A pipeline about the org's own customers, not its patients**: this
  is the one module in the app where "client" doesn't mean a patient or
  a provider - it means another practice this organization bills for (or
  hopes to). Kept completely separate from every clinical/billing table.
- **Stage changes get their own audit trail entry**: `updateLead()`
  checks whether `stage` actually changed before logging
  `crm.lead_stage_changed` with the from/to values - useful for later
  computing pipeline velocity (time spent in each stage), even though
  this module doesn't compute that itself yet (see Future Improvements).

## 11. Testing

- `tests/validations/crm.test.ts` - lead/activity/search schema
  validation, including email format and non-negative value checks.

## 12. Folder Structure

```
supabase/migrations/
  00000000000034_crm_schema.sql
  00000000000035_crm_rls.sql
src/
  app/(dashboard)/crm/              list, new, [id], [id]/edit
  app/api/crm/leads/                 3 route files, 6 handlers
  components/crm/                    table, filters, form, activity section
  lib/services/crm-service.ts
  lib/validations/crm.ts
tests/
  validations/crm.test.ts
```

## 13. Future Improvements

- **No kanban/drag-drop pipeline view**: stages are only changed via the
  edit form's dropdown; a real sales pipeline UI would let you drag a
  lead card between stage columns.
- **No pipeline analytics**: despite logging every stage change with a
  timestamp, nothing yet computes average time-in-stage, conversion
  rate, or pipeline value by stage - the raw data for it already exists
  in `crm_activities`'/audit logs, just not aggregated.
- **No contract/document attachment**: the permission catalog's own
  description mentions "contracts," but this module has no link to
  Module 14's Documents (e.g. attaching a signed services agreement to a
  lead once it reaches `contract_sent`).

---

# Module 18: Task Management

A general internal task tracker - title, assignee, priority, due date,
status, and a comment thread. Deliberately generic rather than deeply
wired into every other module's own workflow.

## 1. UI Design

- **Tasks** (`/tasks`): a filterable list (status/search), a "New task"
  flow, and a detail page with status-transition buttons and a comment
  thread.

## 2. Database Tables

`supabase/migrations/00000000000036` and `00000000000037`:

- `tasks` - title, description, `status` (`todo`/`in_progress`/`done`/
  `canceled`), `priority` (`low`/`medium`/`high`), due date, assignee.
  `completed_at` is stamped when status reaches `done` and cleared
  otherwise - the same pattern Module 10's denial resolution timestamp
  and Module 7's claim `paid_at`-style fields already established.
- `task_comments` - an append-only comment thread per task.

RLS reuses the `tasks.view`/`tasks.manage` permissions already seeded in
Module 1's catalog (and already granted to Biller) - no RBAC migration
needed.

### Relationships

```
tasks 1---N task_comments
tasks N---1 profiles (assigned_to)
```

## 3. Models

`src/types/database.types.ts` extended with `tasks`/`task_comments` and
two new union types: `TaskStatus`, `TaskPriority`.

## 4. Controllers (Route Handlers)

`src/app/api/tasks/**` - 4 route files, 7 handlers (list/create, get/
update, status transition, list/add comments).

## 5. Services

- `task-service.ts` - CRUD, `changeTaskStatus()` (stamps/clears
  `completed_at`), comment listing/posting.

## 6. APIs

| Method | URL                          | Purpose                                    |
|--------|--------------------------------|-------------------------------------------------|
| GET    | `/api/tasks`                    | List tasks (query/status/assignee filters, `tasks.view`) |
| POST   | `/api/tasks`                    | Create a task (`tasks.manage`)                   |
| GET    | `/api/tasks/:id`                | Get one task                                      |
| PATCH  | `/api/tasks/:id`                | Edit a task (`tasks.manage`)                      |
| PATCH  | `/api/tasks/:id/status`         | Transition status (`tasks.manage`)                |
| GET    | `/api/tasks/:id/comments`       | List a task's comments                            |
| POST   | `/api/tasks/:id/comments`       | Add a comment (`tasks.manage`)                    |

## 7. Validation

`src/lib/validations/tasks.ts` - `taskSchema`, `taskStatusSchema`,
`taskCommentSchema`, `taskSearchSchema`.

## 8. Frontend Pages

- `src/app/(dashboard)/tasks/{page,new/page,[id]/page,[id]/edit/page}.tsx`

## 9. Components

- `src/components/tasks/*` - `TasksTable`, `TasksFilters`, `TaskForm`,
  `TaskStatusActions`, `TaskCommentsSection`.

## 10. Business Logic

- **Status lifecycle mirrors Appointments' UI pattern**: like Module 5's
  `AppointmentDetailActions`, `TaskStatusActions` only ever shows the
  valid next actions for a task's current status (`todo` → start/cancel,
  `in_progress` → done/cancel, `done`/`canceled` → reopen) - the API
  itself would accept any status value, the guardrail is UX-only,
  consistent with that module's own documented tradeoff.
- **Deliberately not integrated with other modules yet**: a task isn't
  linkable to a specific claim, denial, or CRM lead - it's a standalone
  general-purpose tracker. See Future Improvements for the obvious next
  step this enables.

## 11. Testing

- `tests/validations/tasks.test.ts` - task/status/comment/search schema
  validation.

## 12. Folder Structure

```
supabase/migrations/
  00000000000036_tasks_schema.sql
  00000000000037_tasks_rls.sql
src/
  app/(dashboard)/tasks/            list, new, [id], [id]/edit
  app/api/tasks/                     4 route files, 7 handlers
  components/tasks/                  table, filters, form, status actions, comments
  lib/services/task-service.ts
  lib/validations/tasks.ts
tests/
  validations/tasks.test.ts
```

## 13. Future Improvements

- **No cross-module task linking**: the single biggest gap - a real RCM
  practice would want to spawn a task directly from a denial ("follow up
  by Friday"), an overdue AR claim, or an expiring credential, with a
  link back to that record. Today creating such a task means manually
  typing the context into the title/description.
- **No due-date reminders/notifications**: like Module 13's credentialing
  expirations, an overdue task is only visible if someone looks at
  `/tasks` - nothing proactively surfaces it.
- **No recurring tasks or subtasks**: each task is a flat, one-time item.
- **No bulk actions**: tasks are created/edited/status-changed one at a
  time; there's no multi-select "mark 5 tasks done" from the list view.

---

# Dashboard: Live Data Refactor

The Module 1 dashboard shipped with hardcoded placeholder KPIs/charts,
before any module existed to supply real numbers. With Claims, Payments,
Denials, AR, and Reports all live, `src/app/(dashboard)/dashboard/page.tsx`
was rewritten to compute everything from the database - no fabricated
values remain. This isn't a new numbered module (no new tables, RLS, or
permissions); it's a refactor of the existing dashboard route reusing
each module's own service layer.

## What changed

- **MTD Billed / MTD Collected**: `getReportsSummary()` (Module 12) is
  called twice - once for the current month-to-date range, once for the
  same day-count last month - and the relative % change is derived from
  the two. If last month's figure is `0` (a brand-new organization), the
  change badge is omitted rather than showing a fabricated trend.
- **Outstanding AR**: `ar-service.ts` gained `getArOverview()`, returning
  the total open balance, claim count, and average days outstanding
  across all aging buckets. There's no historical AR snapshot to diff
  against, so this KPI never shows a change badge - `KpiCard`'s
  `changePercent` prop is now optional for exactly this reason.
- **Denial Rate**: same current-vs-previous-month comparison as billing,
  using `getReportsSummary()`'s `denialRate` and `denialCategorySummary`;
  the change badge shows the percentage-point difference, not a relative
  %, and is omitted when last month billed zero claims.
- **Needs-attention banner**: `denial-service.ts` gained
  `countActiveDenials()` (denials not yet `resolved`/`written_off`). The
  banner only renders when the count is greater than zero - no more
  always-on placeholder alert.
- **Monthly Billing Volume chart**: `report-service.ts` gained
  `getMonthlyBillingTrend()`, which runs `fetchClaimsInRange()` +
  `summarizeCollections()` (both already existing Reports internals) over
  each of the last 6 calendar months in parallel.
- **Claim Status Mix chart**: `report-service.ts` gained
  `getAllTimeClaimsStatusCounts()`, a simple all-time count-by-status
  query (deliberately not date-scoped, unlike the billing trend). The
  dashboard page groups the 9 raw `ClaimStatus` values into the 5 buckets
  the donut displays (Paid / Pending / Denied / In Review / Closed).
- **`RevenueChart` and `ClaimStatusDonut`** no longer own their data - both
  now take a `data` prop instead of an internal hardcoded array.
  `ClaimStatusDonut` renders an `EmptyState` when total claims is `0`.

## What a brand-new organization sees

With zero claims/payments/denials posted, every KPI reads `$0` or `0.0%`
with no change badge (there's no prior-month baseline to compare against),
the needs-attention banner is hidden entirely, the Monthly Billing Volume
chart still renders 6 real month labels with every bar at zero height, and
the Claim Status Mix card shows an empty state ("No claims yet") instead
of a donut with nothing to plot.

## Testing

No new pure-logic function was introduced - the new service functions
either compose existing, already-tested aggregation helpers
(`summarizeCollections`, `summarizeAging`) or are simple Postgrest
queries/counts too thin to warrant a unit test on their own. Full
typecheck/lint/existing 217-test suite pass unchanged.

## Files changed

```
src/app/(dashboard)/dashboard/page.tsx   rewritten - real data, no placeholders
src/components/dashboard/kpi-card.tsx    changePercent made optional
src/components/dashboard/revenue-chart.tsx      DATA -> data prop
src/components/dashboard/claim-status-donut.tsx DATA -> data prop, empty state
src/lib/services/ar-service.ts           + getArOverview()
src/lib/services/denial-service.ts       + countActiveDenials()
src/lib/services/report-service.ts       + getMonthlyBillingTrend(), getAllTimeClaimsStatusCounts()
```

---

# Module 19: Patient Portal

An external, non-staff login for patients: view statements/balance and make
a (demo) self-pay, entirely separate from the profiles/user_roles RBAC
system staff use. This was the first of the two long-discussed-but-unbuilt
pieces (Client/Provider/Patient portals, and an AI module) - the AI module
remains unbuilt, its scope still undefined.

## 1. UI Design

A deliberately lightweight, separate shell - not the staff dashboard's
sidebar/navbar. `/portal/login` and `/portal/accept-invite` are centered
cards (no staff-oriented brand panel copy); the authenticated area
(`/portal` and `/portal/claims/[id]`) gets a minimal sticky header with the
patient's name and a sign-out button, content capped at `max-w-4xl`.

## 2. Database Tables

1. `patient_portal_invitations` - one-time hashed tokens a staff member
   generates so a patient can activate their account, mirroring the
   existing `invitations` table's pattern (`status`: pending/accepted/expired).
2. `patient_portal_accounts` - links an `auth.users` row 1:1 to an existing
   `patients` row. This is the patient-facing counterpart to `profiles` for
   staff, but carries no roles or permissions of its own - a portal account
   can only ever see the single patient it's linked to.

No changes to any existing table. Self-pay demo payments reuse the
existing `payments.payment_method = 'other'` value with a clear label in
`notes`, rather than risking an `ALTER TABLE ... DROP CONSTRAINT` on a
table this project has never altered before.

## 3. Models

`PatientPortalInvitationStatus` in `database.types.ts`; no new enum needed
for accounts (they're either linked to a patient or they don't exist).

## 4. Controllers (Route Handlers)

- `POST /api/portal/auth/login`, `/api/portal/auth/logout`,
  `/api/portal/auth/accept-invite` - patient-facing auth, entirely separate
  from `/api/auth/*` (staff).
- `POST /api/portal/claims/[id]/pay` - demo self-pay, gated by
  `getCurrentPortalUser()` (not staff `hasPermission`).
- `POST /api/patients/[id]/portal-invite` - staff-side, gated by
  `patients.manage` (already seeded in Module 1's catalog - no RBAC
  migration needed).

## 5. Services

`src/lib/services/patient-portal-service.ts`:

- `getCurrentPortalUser()` - the patient-portal counterpart to
  `getCurrentUser()`. Resolves the Supabase Auth session, then looks up
  `patient_portal_accounts` (not `profiles`) by that id. A staff member's
  session returns `null` here (no matching row) exactly as a patient's
  session returns `null` from `getCurrentUser()` (no `profiles` row) - the
  two identity systems don't cross-contaminate.
- `invitePatientToPortal()` / `acceptPatientPortalInvite()` - same
  hashed-token pattern as staff invitations. Any existing pending
  invitation for that patient is marked `expired` before a new one is
  issued, so only one valid link exists at a time.
- `getPortalOverview()` / `getPortalClaimById()` - both filter by
  `patient_id` **and** `organization_id`, so a patient can't view another
  patient's statement by guessing a claim id in the URL.
- `recordPortalPayment()` - the demo self-pay. Pays down the claim's lines
  in order (oldest line first) until the amount is exhausted, using the
  same `payment_allocations` + `recomputeClaimTotals()` pipeline Module 9's
  staff-posted payments use - so a portal payment actually reduces the
  displayed balance, not just cosmetically.

## 6. APIs

See Controllers above. All portal API routes reject staff sessions and
vice versa, since they check different tables for identity.

## 7. Validation

`src/lib/validations/patient-portal.ts`: `patientPortalLoginSchema`,
`patientPortalAcceptInviteSchema` (reuses the shared `passwordSchema`),
`patientPortalPaymentSchema` (positive amount, capped).

## 8. Frontend Pages

```
app/(patient-portal)/portal/
  login/page.tsx                    public
  accept-invite/page.tsx            public
  (authenticated)/
    layout.tsx                      redirects to /portal/login if unauthenticated
    page.tsx                        overview: total balance + statement list
    claims/[id]/page.tsx            statement detail, line items, payment history, pay action
```

The `(authenticated)` route group only wraps the two authenticated pages,
so the public login/accept-invite pages don't get the "signed in as X"
header.

## 9. Components

`src/components/portal/*` - `PortalLoginForm`, `PortalAcceptInviteForm`,
`PortalHeader`, `PortalClaimsTable`, `PortalPaymentDialog`. On the staff
side: `src/components/patients/portal-access-tab.tsx`, wired in as a new
"Portal Access" tab on the patient profile - shows none/pending/active
status and an invite button.

Unlike the staff invite flow (which only logs the accept-invite link via
`console.info`, impractical to retrieve from Vercel given how short its
log retention turned out to be this session), the portal invite endpoint
returns the link directly so the staff member can copy it from a dialog.

## 10. Business Logic

- **Two non-overlapping identity systems on one Supabase project**: staff
  auth via `profiles`/`user_roles`, patients via `patient_portal_accounts`.
  Both use the same `auth.users` table and the same session cookie
  mechanism - the distinguishing factor is purely which side table has a
  matching row for `auth.uid()`.
- **No fabricated payment processing**: the pay dialog states plainly
  "Demo mode - this simulates a payment being applied... no real card is
  charged," matching Module 16's Billing & Plan disclosure and the
  eligibility/ERA honesty notes from Modules 8-9.
- **Defense in depth via RLS even though the app never queries through
  it**: `patient_portal_accounts`/`invitations` have RLS policies scoped
  to `patients.view`/`patients.manage` for staff and `auth.uid() = id` for
  the patient's own row. Every service function still uses the admin
  client (project-wide convention), but if a raw portal session token
  ever hit Supabase's REST API directly, `current_organization_id()`
  returns null for a patient (no `profiles` row), so RLS would deny
  everything - a real security property, not just documentation.

## 11. Testing

`tests/validations/patient-portal.test.ts` - login, accept-invite
(password match), and payment amount schemas. `recordPortalPayment()`'s
line-paydown loop isn't extracted as a pure function (it's tightly
coupled to sequential DB reads/writes), matching how Module 9's
`addPaymentAllocation`/`recomputeClaimTotals` are also exercised only
through the DB-backed service, not unit-tested directly.

## 12. Folder Structure

```
supabase/migrations/
  00000000000038_patient_portal_schema.sql
  00000000000039_patient_portal_rls.sql
src/lib/validations/patient-portal.ts
src/lib/services/patient-portal-service.ts
src/app/api/portal/auth/{login,logout,accept-invite}/route.ts
src/app/api/portal/claims/[id]/pay/route.ts
src/app/api/patients/[id]/portal-invite/route.ts
src/app/(patient-portal)/portal/
  login/page.tsx
  accept-invite/page.tsx
  (authenticated)/{layout,page}.tsx
  (authenticated)/claims/[id]/page.tsx
src/components/portal/*
src/components/patients/portal-access-tab.tsx
tests/validations/patient-portal.test.ts
```

## 13. Future Improvements

- **No lockout/2FA on portal login**: `getLockoutStatus()`/
  `handleFailedLogin()` are keyed to the `profiles` table and silently
  no-op for a patient email (no matching row), so brute-force protection
  that exists for staff doesn't actually apply to patients. Login attempts
  are still logged to `login_attempts` for audit purposes.
- **No "revoke portal access" action**: once invited/activated, a
  patient's access can't be turned off from the UI (would need deleting
  the `patient_portal_accounts` row and the linked `auth.users` entry).
- **Single-patient scope only**: a guarantor/family account that manages
  multiple patients' balances isn't supported - each portal account maps
  to exactly one patient.
- **Provider/client portal, and the AI module** remain unbuilt.

---

# Transactional Email: Staff & Patient Portal Invitations

Both invite flows (Team Members and the patient Portal Access tab) previously
only ever displayed/logged the invite link - no email was ever actually sent,
which the "Invitation sent" toast dishonestly implied for staff invites.
`src/lib/email.ts` adds a thin, optional SMTP layer (via `nodemailer`) that
sends the same invite emails for real when configured, using the `SMTP_*`
env vars already scaffolded in `.env.example` since Module 1 but never wired
up until now.

## What changed

- `src/lib/email.ts`: `sendEmail()` - returns `true`/`false` rather than
  throwing when `SMTP_HOST` isn't set, so callers can gracefully fall back
  instead of pretending an email went out.
- `src/lib/email-templates.ts`: `renderInviteEmail()` - one shared minimal
  HTML layout for both invite emails (heading, body, action button, plain-
  text link fallback).
- `POST /api/users/invite` and `POST /api/patients/[id]/portal-invite` both
  now call `sendEmail()` and return `{ emailSent, inviteUrl? }` -
  `inviteUrl` is only included when the email wasn't actually sent.
- `InviteUserDialog` (staff) and `PortalAccessTab` (patient portal) both
  branch on `emailSent`: a real toast confirmation when it was emailed, or
  the existing copyable-link dialog when it wasn't. That dialog was
  extracted into a shared `src/components/shared/invite-link-dialog.tsx`
  since both flows needed the identical fallback UI.

## Configuration

Set `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` in
Vercel's environment variables to enable real sending - works with any SMTP
provider (Postmark, SendGrid, Mailgun, AWS SES, Gmail SMTP, etc.). Leaving
`SMTP_HOST` blank keeps the previous copy-the-link behavior - the feature
degrades gracefully rather than failing.

## Testing

`tests/services/email-templates.test.ts` covers the pure `renderInviteEmail()`
template function. `sendEmail()` itself isn't unit-tested (it's a thin I/O
wrapper around `nodemailer`, same rationale as `recordAuditLog()` and other
DB-calling service functions elsewhere in this project). Full typecheck/
lint/228-test suite/build pass.

---

# Patient Portal: Theme Consistency Pass

The portal's login/accept-invite pages originally had no branding at all -
just a bare centered card on a flat background - while staff login uses a
full split-screen dark-green brand panel. The authenticated portal shell's
header was similarly plain (`bg-background/80`), so the only branded
surface anywhere in the portal was a small logo mark. Brought both in line
with the staff app's visual system:

- `src/components/portal/portal-brand-panel.tsx` - the same split-screen
  layout/gradient/`Kicker` construction as `AuthBrandPanel`, with
  patient-appropriate highlight copy ("See every statement," "Pay your
  balance online," "Private & secure") instead of the staff-oriented
  billing-ops copy. `portal/login` and `portal/accept-invite` now use the
  same `grid lg:grid-cols-2` split-screen wrapper as `(auth)/layout.tsx`.
- `PortalHeader` now uses `bg-sidebar`/`text-sidebar-foreground` (the same
  dark green as the staff sidebar) instead of blending into the page
  background, so the authenticated portal reads as consistently branded
  even though it has no left sidebar of its own (there's nothing to
  navigate to - just the statement list and detail pages).

Verified visually with a headless-browser screenshot comparison against
the staff login/dashboard before and after, the same technique used to
diagnose the mobile-nav overlay bug earlier in this project. Full
typecheck/lint/228-test suite/build pass - this is a styling-only change,
no new components' logic or data flow.

---

# Patient Portal: Real Card Payments via Stripe

Replaces the demo self-pay flow (which recorded a payment immediately on
request, no real money involved) with a real Stripe integration - a patient
can now actually pay their balance with a credit or debit card.

## Why a webhook, not a direct API call

The "Pay balance" dialog does **not** record a payment as soon as the
client-side card confirmation succeeds. Client-side success/failure isn't
trustworthy on its own (the browser tab could close, the network could
drop the response, or the signal could be spoofed) - a Stripe **webhook**
(`payment_intent.succeeded`) is the authoritative source of truth that
money actually moved. `recordPortalPayment()` only ever runs from the
webhook handler now, never from the client-facing route.

## Flow

1. Patient clicks **Pay balance**, enters an amount (validated against the
   claim's current balance).
2. `POST /api/portal/claims/[id]/pay` creates a Stripe PaymentIntent
   (card only) for that amount, with `claimId`/`patientId`/`organizationId`
   in its metadata, and returns the `client_secret`.
3. The dialog renders Stripe's `PaymentElement` and calls
   `stripe.confirmPayment()` client-side - card data goes straight to
   Stripe, never through our server (PCI SAQ A scope, not the much larger
   scope of handling raw card numbers ourselves).
4. Once Stripe actually captures the charge, it calls
   `POST /api/webhooks/stripe`, which verifies the signature, then calls
   `recordPortalPayment()` - the same payment/payment_allocations/
   `recomputeClaimTotals()` pipeline the old demo flow and Module 9's
   staff-posted payments both use, so the claim's balance actually drops.
5. `payments.stripe_payment_intent_id` (new column, migration 40) makes
   this idempotent - Stripe explicitly documents that the same webhook
   event can be redelivered, so a duplicate delivery is a no-op rather
   than a duplicate payment.

## Test mode

The payment dialog shows a "Test mode" banner (with Stripe's `4242 4242
4242 4242` test card number) whenever `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
starts with `pk_test_` - purely a client-side prefix check, no separate
flag needed. Swapping to `pk_live_`/`sk_live_` keys in Vercel is the only
thing that moves this from test to real charges.

## Configuration required

- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - from the
  Stripe Dashboard.
- `STRIPE_WEBHOOK_SECRET` - from Dashboard -> Developers -> Webhooks,
  after adding an endpoint at `/api/webhooks/stripe` subscribed to
  `payment_intent.succeeded` and `payment_intent.payment_failed`.
- If any of these are unset, `getStripeClient()` returns `null` and the
  API route responds with a clear "Card payments aren't enabled yet"
  message instead of a broken form - same graceful-degradation pattern
  as the SMTP email integration.
- **Migration 40 must be run** (`payments.stripe_payment_intent_id`)
  before this works, since `recordPortalPayment()` now writes to it.

## Testing

No new pure-logic function was introduced - webhook signature
verification and payment recording are both inherently I/O-bound
(Stripe's SDK, the database), matching the existing rationale for why
`sendEmail()`/`recordAuditLog()` aren't unit-tested either. Full
typecheck/lint/228-test suite/build pass unchanged.

## Future improvements

- **No refund UI**: a refund currently has to be issued from the Stripe
  Dashboard directly; nothing in this app reverses a `payments` row or
  re-raises the claim balance yet.
- **No saved payment methods**: every payment requires re-entering card
  details; Stripe Customers + saved payment methods would remove that.
- **No partial-failure recovery UI**: if a webhook delivery fails
  repeatedly (Stripe retries for ~3 days), there's no in-app view of
  that - Stripe's own Dashboard is the only visibility into it today.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL/keys (see below)
npm run dev
```

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use the one
   already linked to this Vercel project).
2. Run the migrations in `supabase/migrations/` in order, either via the
   Supabase SQL editor (paste each file) or `supabase db push` with the
   Supabase CLI linked to your project.
3. Copy **Project Settings -> API** into `.env.local` /
   Vercel's environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only - never expose to the client)
4. Set `APP_SECRET` to a long random string (used to sign the 2FA-verified
   cookie).
5. In Supabase Auth settings, add your Vercel deployment URL (and
   `http://localhost:3000` for local dev) to the redirect allow-list, since
   `/api/auth/forgot-password` redirects to `/reset-password` after the
   emailed link is clicked.

## Deploying to Vercel

This repo deploys as a standard Next.js 15 project - no custom build
configuration is required:

1. Import the repository in Vercel (already done per the task).
2. Set the environment variables listed above in the Vercel project
   settings (Production + Preview).
3. Push to the connected branch - Vercel builds and deploys automatically.
