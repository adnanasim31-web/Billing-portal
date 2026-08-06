-- =============================================================================
-- Real refunds. Payments and payment_allocations are an intentionally
-- immutable audit trail (see 00000000000022_payments_rls.sql's own comment:
-- "a correction is a new payment/allocation") - so a refund is a new,
-- append-only row here, never an update to the original payment.
--
-- Scoped to a specific payment_allocation, not the whole payment, mirroring
-- claim_adjustments' line-scoped design: a payment can allocate across
-- multiple procedure lines with different paid amounts, and it's each
-- line's claim_lines.paid_amount that actually needs to be reversed.
-- =============================================================================

create table public.payment_refunds (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  payment_id            uuid not null references public.payments (id) on delete cascade,
  payment_allocation_id uuid not null references public.payment_allocations (id) on delete restrict,
  claim_id              uuid not null references public.claims (id) on delete cascade,
  claim_line_id         uuid not null references public.claim_lines (id) on delete cascade,
  amount                numeric(12, 2) not null check (amount > 0),
  reason                text not null default 'other'
                          check (reason in ('overpayment', 'coding_error', 'patient_dispute', 'insurance_recoupment', 'duplicate_payment', 'other')),
  notes                 text,
  stripe_refund_id      text unique,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now()
);

create index payment_refunds_organization_id_idx on public.payment_refunds (organization_id);
create index payment_refunds_payment_id_idx on public.payment_refunds (payment_id, created_at desc);
create index payment_refunds_payment_allocation_id_idx on public.payment_refunds (payment_allocation_id);

comment on table public.payment_refunds is
  'Append-only refund log, scoped to a specific payment_allocation. The service layer decrements the matching claim_lines.paid_amount and recomputes claim totals - this table never is that source of truth on its own. stripe_refund_id is populated only when reversing a patient-portal card payment (payments.stripe_payment_intent_id is set); null for manual/ERA payments, which have no external gateway to reverse.';
