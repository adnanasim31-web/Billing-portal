-- =============================================================================
-- Module 9: Payment Posting
-- Migration 21: Payments received against a claim (ERA/EOB/manual), and the
-- per-procedure-line allocations that apply that money (and any contractual
-- adjustment) to claim_lines.paid_amount/adjustment_amount - the columns
-- Module 7 scaffolded specifically for this module to fill in.
-- =============================================================================

create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  claim_id          uuid not null references public.claims (id) on delete restrict,
  payer_name        text not null,
  payment_method    text not null default 'era'
                      check (payment_method in ('era', 'check', 'credit_card', 'cash', 'eft', 'other')),
  payment_date      date not null,
  reference_number  text,
  total_amount      numeric(12, 2) not null check (total_amount > 0),
  notes             text,
  posted_by         uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index payments_organization_id_idx on public.payments (organization_id);
create index payments_claim_id_idx on public.payments (claim_id);
create index payments_payment_date_idx on public.payments (organization_id, payment_date desc);

comment on table public.payments is 'A payment (ERA/EOB/manual) received against a claim - total_amount is the cash/credit received; how it applies to specific lines lives in payment_allocations.';

create table public.payment_allocations (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments (id) on delete cascade,
  claim_line_id     uuid not null references public.claim_lines (id) on delete restrict,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  paid_amount       numeric(12, 2) not null default 0,
  adjustment_amount numeric(12, 2) not null default 0,
  adjustment_reason text,
  created_at        timestamptz not null default now(),
  constraint payment_allocations_payment_line_unique unique (payment_id, claim_line_id)
);

create index payment_allocations_payment_id_idx on public.payment_allocations (payment_id);
create index payment_allocations_claim_line_id_idx on public.payment_allocations (claim_line_id);
create index payment_allocations_organization_id_idx on public.payment_allocations (organization_id);

comment on table public.payment_allocations is 'How a payment applies to a specific claim line - paid amount plus any contractual/other adjustment.';
