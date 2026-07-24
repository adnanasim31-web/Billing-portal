-- =============================================================================
-- Module 4: Insurance (payer directory)
-- Migration 9: insurance_companies + link from patient_insurance_policies.
--
-- Scope note: patient-side insurance (policies on file) shipped in Module 2.
-- 270/271 electronic eligibility checks are their own future module. This
-- migration only adds the payer/company directory itself (name, payer ID,
-- claims address, standard benefits notes).
-- =============================================================================

create table public.insurance_companies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  payer_id_code   text,
  phone           text,
  fax             text,
  website         text,
  claims_address_line1 text,
  claims_address_line2 text,
  claims_city     text,
  claims_state    varchar(2),
  claims_postal_code varchar(10),
  benefits_notes  text,
  is_active       boolean not null default true,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint insurance_companies_org_name_unique unique (organization_id, name)
);

create index insurance_companies_organization_id_idx on public.insurance_companies (organization_id);
create index insurance_companies_is_active_idx on public.insurance_companies (organization_id, is_active);

create trigger insurance_companies_set_updated_at
  before update on public.insurance_companies
  for each row execute function public.set_updated_at();

comment on table public.insurance_companies is 'Payer/insurance company directory (name, payer ID, claims address, benefits notes).';

-- ---------------------------------------------------------------------------
-- Link patient_insurance_policies to the directory, optionally. Kept
-- nullable + additive: existing free-text payer_name/payer_id_code columns
-- from Module 2 are unchanged, so policies entered before a payer exists in
-- the directory (or for out-of-network/one-off payers) keep working.
-- ---------------------------------------------------------------------------
alter table public.patient_insurance_policies
  add column payer_company_id uuid references public.insurance_companies (id) on delete set null;

create index patient_insurance_policies_payer_company_id_idx
  on public.patient_insurance_policies (payer_company_id);
