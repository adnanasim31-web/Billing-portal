-- =============================================================================
-- Module 11: Accounts Receivable
-- Migration 26: Collections notes - an append-only follow-up log per claim,
-- distinct from Module 7's claim_status_history (status transitions) and
-- Module 10's claim_denials (denial-specific worklist) - this is general
-- "called the payer, they said X" collections activity on any claim with
-- an open balance.
-- =============================================================================

create table public.ar_notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  claim_id        uuid not null references public.claims (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index ar_notes_organization_id_idx on public.ar_notes (organization_id);
create index ar_notes_claim_id_idx on public.ar_notes (claim_id, created_at desc);

comment on table public.ar_notes is 'Append-only collections follow-up log for a claim with an open AR balance.';

alter table public.ar_notes enable row level security;

create policy "ar_notes_select_org"
  on public.ar_notes for select
  using (organization_id = public.current_organization_id() and public.has_permission('ar.view'));

create policy "ar_notes_insert_org"
  on public.ar_notes for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('ar.manage'));
