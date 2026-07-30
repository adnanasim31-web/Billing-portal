-- =============================================================================
-- Module 13: Credentialing
-- Migration 27: Provider credentialing records (NPI, state license, DEA,
-- malpractice insurance, board certification, CAQH, W9, other), each with
-- an issue/expiration window and a manually-set status - fills in the
-- "Credentialing" tab placeholder left on the provider profile since
-- Module 3.
-- =============================================================================

create table public.provider_credentials (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  provider_id       uuid not null references public.providers (id) on delete cascade,
  credential_type   text not null
                      check (credential_type in ('npi', 'state_license', 'dea', 'malpractice_insurance', 'board_certification', 'caqh', 'w9', 'other')),
  credential_number text,
  issuing_authority text,
  issue_date        date,
  expiration_date   date,
  status            text not null default 'active'
                      check (status in ('active', 'expired', 'pending_renewal', 'revoked')),
  notes             text,
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index provider_credentials_organization_id_idx on public.provider_credentials (organization_id);
create index provider_credentials_provider_id_idx on public.provider_credentials (provider_id);
create index provider_credentials_expiration_date_idx on public.provider_credentials (organization_id, expiration_date);

create trigger provider_credentials_set_updated_at
  before update on public.provider_credentials
  for each row execute function public.set_updated_at();

comment on table public.provider_credentials is 'Provider credentialing records (license, DEA, malpractice insurance, etc.) with issue/expiration tracking.';
