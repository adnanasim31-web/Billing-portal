# MedBill RCM Suite

Enterprise medical billing & revenue cycle management (RCM) SaaS platform.
Built module by module - this is **Module 1: Authentication & User Management**.

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
  The dashboard page itself ships with **sample data** - live KPIs arrive
  with the Claims/Reports modules; it exists here to establish the visual
  system and prove out the sidebar/navbar/card/chart primitives.
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
