-- =============================================================================
-- Module 17: CRM
-- Migration 34: A lightweight sales pipeline for the billing company's own
-- business development - prospective and existing client relationships
-- (practices considering or already using this organization's billing
-- services), not to be confused with the patients this organization bills
-- on behalf of its provider clients.
-- =============================================================================

create table public.crm_leads (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  contact_name      text not null,
  company_name      text,
  email             text,
  phone             text,
  stage             text not null default 'lead'
                      check (stage in ('lead', 'qualified', 'proposal', 'contract_sent', 'client', 'lost')),
  estimated_value   numeric(12, 2),
  source            text not null default 'other'
                      check (source in ('referral', 'website', 'cold_outreach', 'conference', 'other')),
  owner_id          uuid references public.profiles (id) on delete set null,
  notes             text,
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index crm_leads_organization_id_idx on public.crm_leads (organization_id);
create index crm_leads_stage_idx on public.crm_leads (organization_id, stage);
create index crm_leads_owner_id_idx on public.crm_leads (owner_id);

create trigger crm_leads_set_updated_at
  before update on public.crm_leads
  for each row execute function public.set_updated_at();

comment on table public.crm_leads is 'Sales pipeline entries: prospective/existing client relationships for this organization''s own business development.';

create table public.crm_activities (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id         uuid not null references public.crm_leads (id) on delete cascade,
  activity_type   text not null default 'note'
                    check (activity_type in ('call', 'email', 'meeting', 'note')),
  body            text not null,
  author_id       uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index crm_activities_organization_id_idx on public.crm_activities (organization_id);
create index crm_activities_lead_id_idx on public.crm_activities (lead_id, created_at desc);

comment on table public.crm_activities is 'Append-only interaction log (calls/emails/meetings/notes) for a CRM lead.';
