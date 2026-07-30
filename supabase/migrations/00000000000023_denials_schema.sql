-- =============================================================================
-- Module 10: Denial Management
-- Migration 23: A worklist row per denied/rejected claim event, separate
-- from claim_status_history (Module 7's append-only transition log) so
-- billers have a dedicated place to categorize root cause, assign
-- follow-up, and track resolution - without editing claim history itself.
-- =============================================================================

create table public.claim_denials (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  claim_id          uuid not null references public.claims (id) on delete cascade,
  claim_status      text not null check (claim_status in ('denied', 'rejected')),
  category          text not null default 'other'
                      check (category in ('eligibility', 'authorization', 'coding_error', 'timely_filing', 'duplicate_claim', 'medical_necessity', 'documentation', 'other')),
  reason_detail     text,
  resolution_status text not null default 'open'
                      check (resolution_status in ('open', 'in_progress', 'appealed', 'resolved', 'written_off')),
  assigned_to       uuid references public.profiles (id) on delete set null,
  follow_up_date    date,
  resolution_notes  text,
  resolved_at       timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index claim_denials_organization_id_idx on public.claim_denials (organization_id);
create index claim_denials_claim_id_idx on public.claim_denials (claim_id);
create index claim_denials_resolution_status_idx on public.claim_denials (organization_id, resolution_status);
create index claim_denials_follow_up_date_idx on public.claim_denials (organization_id, follow_up_date);

create trigger claim_denials_set_updated_at
  before update on public.claim_denials
  for each row execute function public.set_updated_at();

comment on table public.claim_denials is 'Denial worklist entry: root-cause category, assignment, follow-up, and resolution tracking for a denied/rejected claim.';
