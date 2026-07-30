-- =============================================================================
-- Module 8: Eligibility Verification
-- Migration 19: Eligibility check history. Each row is an immutable snapshot
-- of the on-file insurance policy at the moment the check was run (payer/
-- plan/copay/coverage window), plus the computed coverage status - see
-- eligibility-service.ts and the README for why this is a snapshot of data
-- already on file rather than a live payer/clearinghouse (X12 270/271) call.
-- =============================================================================

create table public.eligibility_checks (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations (id) on delete cascade,
  patient_id                  uuid not null references public.patients (id) on delete cascade,
  patient_insurance_policy_id uuid references public.patient_insurance_policies (id) on delete set null,
  provider_id                 uuid references public.providers (id) on delete set null,
  service_type                text not null default 'general'
                                check (service_type in ('general', 'specialist', 'behavioral_health', 'urgent_care', 'telehealth', 'other')),
  status                      text not null check (status in ('active', 'inactive', 'error')),
  payer_name                  text,
  plan_name                   text,
  policy_number               text,
  copay_amount                numeric(10, 2),
  effective_date              date,
  termination_date            date,
  notes                       text,
  checked_by                  uuid references public.profiles (id) on delete set null,
  checked_at                  timestamptz not null default now()
);

create index eligibility_checks_organization_id_idx on public.eligibility_checks (organization_id);
create index eligibility_checks_patient_id_idx on public.eligibility_checks (patient_id, checked_at desc);
create index eligibility_checks_status_idx on public.eligibility_checks (organization_id, status);

comment on table public.eligibility_checks is 'Immutable snapshot history of eligibility checks run against on-file insurance policies.';
