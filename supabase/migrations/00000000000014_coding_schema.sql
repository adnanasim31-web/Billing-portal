-- =============================================================================
-- Module 6: Medical Coding
-- Migration 14: ICD-10, CPT/HCPCS, and modifier reference libraries, plus
-- per-user favorites. The code libraries are shared master data - not
-- organization-scoped - since ICD-10/CPT/HCPCS are the same across every
-- practice; only Favorites is per-user.
-- =============================================================================

create table public.icd10_codes (
  code        text primary key,
  description text not null,
  category    text not null,
  is_billable boolean not null default true,
  created_at  timestamptz not null default now()
);

create index icd10_codes_category_idx on public.icd10_codes (category);

comment on table public.icd10_codes is 'ICD-10-CM diagnosis code reference library (shared master data, not org-scoped).';

create table public.procedure_codes (
  code        text primary key,
  code_set    text not null check (code_set in ('CPT', 'HCPCS')),
  description text not null,
  category    text not null,
  created_at  timestamptz not null default now()
);

create index procedure_codes_code_set_idx on public.procedure_codes (code_set);
create index procedure_codes_category_idx on public.procedure_codes (category);

comment on table public.procedure_codes is 'CPT/HCPCS procedure code reference library (shared master data, not org-scoped).';

create table public.modifiers (
  code        text primary key,
  description text not null,
  created_at  timestamptz not null default now()
);

comment on table public.modifiers is 'CPT/HCPCS modifier reference library (shared master data, not org-scoped).';

create table public.coding_favorites (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code_type       text not null check (code_type in ('icd10', 'cpt', 'hcpcs', 'modifier')),
  code            text not null,
  created_at      timestamptz not null default now(),
  constraint coding_favorites_unique unique (user_id, code_type, code)
);

create index coding_favorites_user_id_idx on public.coding_favorites (user_id);
create index coding_favorites_organization_id_idx on public.coding_favorites (organization_id);

comment on table public.coding_favorites is 'Per-user quick-access favorites into the ICD-10/CPT/HCPCS/modifier libraries.';
