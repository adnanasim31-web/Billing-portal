-- =============================================================================
-- Real write-offs / payment adjustments. Previously the only "write-off"
-- concept was claim_denials.resolution_status = 'written_off', which never
-- touched a single dollar amount anywhere - a claim could be flagged
-- written off while its balance_amount stayed exactly where it was.
--
-- Adjustments are line-scoped, not claim-scoped: claims.total_adjustment_amount
-- (and the generated balance_amount) are always derived by summing
-- claim_lines.adjustment_amount via claim-service.ts's recomputeClaimTotals(),
-- the same mechanism payment allocations already use. This table is the
-- audit trail/reason log for each such increment - not a second source of
-- truth for the amount itself.
-- =============================================================================

create table public.claim_adjustments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  claim_id          uuid not null references public.claims (id) on delete cascade,
  claim_line_id     uuid not null references public.claim_lines (id) on delete cascade,
  amount            numeric(12, 2) not null check (amount > 0),
  category          text not null default 'other'
                      check (category in ('write_off', 'contractual', 'financial_hardship', 'courtesy', 'correction', 'other')),
  notes             text,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index claim_adjustments_organization_id_idx on public.claim_adjustments (organization_id);
create index claim_adjustments_claim_id_idx on public.claim_adjustments (claim_id, created_at desc);

comment on table public.claim_adjustments is
  'Audit trail for manual balance adjustments (write-offs, contractual, hardship, etc). The dollar amount is applied to claim_lines.adjustment_amount by the service layer, which then re-derives claims.total_adjustment_amount/balance_amount - this table never is that source of truth on its own.';
