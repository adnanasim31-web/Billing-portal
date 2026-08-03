-- =============================================================================
-- Patient Portal: external, non-staff login for patients to view their own
-- statements/balances and make a (demo) self-pay - separate from the
-- profiles/user_roles RBAC system used by staff. A portal account is linked
-- 1:1 to an existing patients row; it carries no roles or permissions of
-- its own, so access is scoped purely by "which single patient does this
-- auth.users row belong to."
-- =============================================================================

create table public.patient_portal_invitations (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  patient_id        uuid not null references public.patients (id) on delete cascade,
  email             citext not null,
  token_hash        text not null unique,
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'expired')),
  invited_by        uuid references public.profiles (id) on delete set null,
  expires_at        timestamptz not null default (now() + interval '7 days'),
  accepted_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index patient_portal_invitations_organization_id_idx on public.patient_portal_invitations (organization_id);
create index patient_portal_invitations_patient_id_idx on public.patient_portal_invitations (patient_id);

comment on table public.patient_portal_invitations is 'One-time tokens (hashed) a staff member generates so a patient can activate their portal account.';

create table public.patient_portal_accounts (
  id                uuid primary key references auth.users (id) on delete cascade,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  patient_id        uuid not null unique references public.patients (id) on delete cascade,
  email             citext not null,
  invited_by        uuid references public.profiles (id) on delete set null,
  last_login_at     timestamptz,
  created_at        timestamptz not null default now()
);

create index patient_portal_accounts_organization_id_idx on public.patient_portal_accounts (organization_id);

comment on table public.patient_portal_accounts is 'Links an auth.users row to exactly one patients row - the patient-facing counterpart to profiles for staff.';
