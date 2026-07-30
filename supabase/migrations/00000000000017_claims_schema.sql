-- =============================================================================
-- Module 7: Claims
-- Migration 17: Claim shell, diagnosis lines, procedure lines, and a status
-- history audit trail. Diagnoses/procedure codes are validated against the
-- Module 6 reference libraries (icd10_codes/procedure_codes/modifiers) via
-- foreign keys, so a claim can never reference a code that doesn't exist.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- claims: the claim shell. Created as a 'draft' via a simple form, then
-- diagnoses/procedure lines are attached incrementally on the detail page
-- (same "create shell, then attach" pattern as Patients/Providers).
-- ---------------------------------------------------------------------------
create table public.claims (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations (id) on delete cascade,
  claim_number              text not null,
  patient_id                uuid not null references public.patients (id) on delete cascade,
  provider_id               uuid not null references public.providers (id) on delete restrict,
  payer_company_id          uuid references public.insurance_companies (id) on delete set null,
  patient_insurance_policy_id uuid references public.patient_insurance_policies (id) on delete set null,
  status                    text not null default 'draft'
                              check (status in ('draft', 'ready', 'submitted', 'accepted', 'rejected', 'denied', 'paid', 'appealed', 'closed')),
  service_date_from         date not null,
  service_date_to           date not null,
  place_of_service          text,
  total_charge_amount       numeric(12, 2) not null default 0,
  total_paid_amount         numeric(12, 2) not null default 0,
  total_adjustment_amount   numeric(12, 2) not null default 0,
  submitted_at              timestamptz,
  accepted_at               timestamptz,
  rejected_at               timestamptz,
  rejection_reason          text,
  appealed_at               timestamptz,
  appeal_notes              text,
  notes                     text,
  created_by                uuid references public.profiles (id) on delete set null,
  updated_by                uuid references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint claims_org_claim_number_unique unique (organization_id, claim_number),
  constraint claims_service_date_order check (service_date_to >= service_date_from)
);

create index claims_organization_id_idx on public.claims (organization_id);
create index claims_patient_id_idx on public.claims (patient_id);
create index claims_provider_id_idx on public.claims (provider_id);
create index claims_status_idx on public.claims (organization_id, status);
create index claims_service_date_idx on public.claims (organization_id, service_date_from);

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

comment on table public.claims is 'Claim shell: patient/provider/payer, service window, status, and running totals.';

-- ---------------------------------------------------------------------------
-- claim_diagnoses: up to 12 ICD-10 pointers per claim, in CMS-1500 order.
-- ---------------------------------------------------------------------------
create table public.claim_diagnoses (
  id              uuid primary key default gen_random_uuid(),
  claim_id        uuid not null references public.claims (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sequence        smallint not null check (sequence between 1 and 12),
  icd10_code      text not null references public.icd10_codes (code) on delete restrict,
  created_at      timestamptz not null default now(),
  constraint claim_diagnoses_claim_sequence_unique unique (claim_id, sequence)
);

create index claim_diagnoses_claim_id_idx on public.claim_diagnoses (claim_id);
create index claim_diagnoses_organization_id_idx on public.claim_diagnoses (organization_id);

comment on table public.claim_diagnoses is 'ICD-10 diagnosis pointers attached to a claim, numbered 1-12 in CMS-1500 order.';

-- ---------------------------------------------------------------------------
-- claim_lines: procedure/service lines. diagnosis_pointers references the
-- claim_diagnoses.sequence values this line's charge is linked to.
-- ---------------------------------------------------------------------------
create table public.claim_lines (
  id                  uuid primary key default gen_random_uuid(),
  claim_id            uuid not null references public.claims (id) on delete cascade,
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  line_number         smallint not null check (line_number between 1 and 50),
  procedure_code      text not null references public.procedure_codes (code) on delete restrict,
  modifier_1          text references public.modifiers (code) on delete set null,
  modifier_2          text references public.modifiers (code) on delete set null,
  diagnosis_pointers  smallint[] not null default '{}',
  units               integer not null default 1 check (units > 0),
  charge_amount       numeric(12, 2) not null default 0,
  paid_amount         numeric(12, 2) not null default 0,
  adjustment_amount   numeric(12, 2) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint claim_lines_claim_line_number_unique unique (claim_id, line_number)
);

create index claim_lines_claim_id_idx on public.claim_lines (claim_id);
create index claim_lines_organization_id_idx on public.claim_lines (organization_id);

create trigger claim_lines_set_updated_at
  before update on public.claim_lines
  for each row execute function public.set_updated_at();

comment on table public.claim_lines is 'Procedure/service lines on a claim, with charge/paid/adjustment amounts.';

-- ---------------------------------------------------------------------------
-- claim_status_history: append-only audit trail of every status transition.
-- ---------------------------------------------------------------------------
create table public.claim_status_history (
  id              uuid primary key default gen_random_uuid(),
  claim_id        uuid not null references public.claims (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  from_status     text,
  to_status       text not null,
  note            text,
  changed_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index claim_status_history_claim_id_idx on public.claim_status_history (claim_id, created_at desc);
create index claim_status_history_organization_id_idx on public.claim_status_history (organization_id);

comment on table public.claim_status_history is 'Append-only audit trail of claim status transitions.';
