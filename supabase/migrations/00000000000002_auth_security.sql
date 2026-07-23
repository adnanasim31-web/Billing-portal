-- =============================================================================
-- Module 1: Authentication & User Management
-- Migration 2: 2FA, OTP, session tracking, audit logs, login attempts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- two_factor_auth: TOTP secret + hashed backup codes, one row per user
-- ---------------------------------------------------------------------------
create table public.two_factor_auth (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  method         text not null default 'totp' check (method in ('totp', 'email', 'sms')),
  secret         text,                 -- base32 TOTP secret, encrypted at the app layer before insert
  backup_codes   text[] not null default '{}', -- sha256 hashes only, never plaintext
  is_enabled     boolean not null default false,
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger two_factor_auth_set_updated_at
  before update on public.two_factor_auth
  for each row execute function public.set_updated_at();

comment on table public.two_factor_auth is 'Per-user 2FA configuration. secret must be encrypted (pgsodium/app-layer) before write.';

-- ---------------------------------------------------------------------------
-- otp_codes: one-time codes for email verification, 2FA login step, phone
-- verification, and password-reset fallback. Never exposed via client RLS -
-- issued/verified exclusively through server-side routes using the service role.
-- ---------------------------------------------------------------------------
create table public.otp_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete cascade,
  email        citext not null,
  code_hash    text not null,          -- sha256(code), raw code is only ever emailed/texted
  purpose      text not null check (purpose in (
                 'email_verification', 'login_2fa', 'password_reset', 'phone_verification'
               )),
  attempts     smallint not null default 0,
  max_attempts smallint not null default 5,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index otp_codes_email_purpose_idx on public.otp_codes (email, purpose);
create index otp_codes_expires_at_idx on public.otp_codes (expires_at);

comment on table public.otp_codes is 'Short-lived one-time codes. Row is single-use: consumed_at is set on success.';

-- ---------------------------------------------------------------------------
-- user_sessions: app-level view of active sessions/devices, independent of
-- Supabase's own refresh-token store, so we can render a "Sessions" UI and
-- support user/admin initiated revocation with device + geo metadata.
-- ---------------------------------------------------------------------------
create table public.user_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  session_token_hash text not null unique, -- sha256 of the Supabase refresh token id (jti)
  ip_address         inet,
  user_agent         text,
  device_label       text,
  city               text,
  region             text,
  country            text,
  last_active_at     timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  revoked_at         timestamptz
);

create index user_sessions_user_id_idx on public.user_sessions (user_id);
create index user_sessions_last_active_at_idx on public.user_sessions (last_active_at desc);

comment on table public.user_sessions is 'Device/session registry for the Security > Sessions UI and remote sign-out.';

-- ---------------------------------------------------------------------------
-- login_attempts: brute-force / rate-limit tracking, keyed by email + IP
-- ---------------------------------------------------------------------------
create table public.login_attempts (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  ip_address  inet,
  success     boolean not null,
  reason      text, -- e.g. 'invalid_password', 'locked', 'otp_failed'
  created_at  timestamptz not null default now()
);

create index login_attempts_email_created_idx on public.login_attempts (email, created_at desc);
create index login_attempts_ip_created_idx on public.login_attempts (ip_address, created_at desc);

comment on table public.login_attempts is 'Append-only log used to compute lockouts and rate limits.';

-- ---------------------------------------------------------------------------
-- audit_logs: append-only trail of security & data-changing actions
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations (id) on delete set null,
  user_id          uuid references public.profiles (id) on delete set null,
  action           text not null,        -- e.g. 'auth.login', 'user.role_changed'
  entity_type      text,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  ip_address       inet,
  user_agent       text,
  created_at       timestamptz not null default now()
);

create index audit_logs_organization_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_metadata_gin_idx on public.audit_logs using gin (metadata);

comment on table public.audit_logs is 'Append-only security & activity audit trail. Written exclusively by server-side services.';
