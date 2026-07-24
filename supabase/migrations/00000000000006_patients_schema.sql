-- =============================================================================
-- Module 2: Patients
-- Migration 6: Patient core, insurance policies, documents, medical history,
-- and notes. All tables are organization-scoped and RLS-protected using the
-- same current_organization_id()/has_permission() helpers from Module 1.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- patients: core demographic + registration record
-- ---------------------------------------------------------------------------
create table public.patients (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  mrn                   text not null,
  first_name            text not null,
  last_name             text not null,
  middle_name           text,
  preferred_name        text,
  date_of_birth         date not null,
  sex                   text check (sex in ('male', 'female', 'other', 'unspecified')) default 'unspecified',
  ssn_last4             varchar(4),
  email                 citext,
  phone_mobile          text,
  phone_home            text,
  address_line1         text,
  address_line2         text,
  city                  text,
  state                 varchar(2),
  postal_code           varchar(10),
  country               varchar(2) not null default 'US',
  preferred_language    text not null default 'en',
  guarantor_patient_id  uuid references public.patients (id) on delete set null,
  status                text not null default 'active'
                          check (status in ('active', 'inactive', 'deceased')),
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint patients_org_mrn_unique unique (organization_id, mrn)
);

create index patients_organization_id_idx on public.patients (organization_id);
create index patients_name_idx on public.patients (organization_id, last_name, first_name);
create index patients_dob_idx on public.patients (organization_id, date_of_birth);
create index patients_status_idx on public.patients (organization_id, status);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

comment on table public.patients is 'Patient demographic + registration record, scoped to one organization.';

-- ---------------------------------------------------------------------------
-- patient_insurance_policies: payer coverage on file (primary/secondary/etc.)
-- payer_name/payer_id_code are free text for now - will become a foreign key
-- into an `insurance_companies` table once the Insurance module ships.
-- ---------------------------------------------------------------------------
create table public.patient_insurance_policies (
  id                      uuid primary key default gen_random_uuid(),
  patient_id              uuid not null references public.patients (id) on delete cascade,
  organization_id         uuid not null references public.organizations (id) on delete cascade,
  rank                    text not null check (rank in ('primary', 'secondary', 'tertiary')),
  payer_name              text not null,
  payer_id_code           text,
  plan_name               text,
  policy_number           text not null,
  group_number            text,
  subscriber_name         text not null,
  subscriber_dob          date,
  subscriber_relationship text not null default 'self'
                            check (subscriber_relationship in ('self', 'spouse', 'child', 'other')),
  effective_date          date,
  termination_date        date,
  copay_amount            numeric(10, 2),
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index patient_insurance_patient_id_idx on public.patient_insurance_policies (patient_id);
create index patient_insurance_organization_id_idx on public.patient_insurance_policies (organization_id);
-- Only one active policy per rank per patient; any number of inactive
-- (historical/terminated) policies are allowed for the same rank.
create unique index patient_insurance_one_active_rank_idx
  on public.patient_insurance_policies (patient_id, rank)
  where (is_active = true);

create trigger patient_insurance_set_updated_at
  before update on public.patient_insurance_policies
  for each row execute function public.set_updated_at();

comment on table public.patient_insurance_policies is 'Patient insurance coverage on file, ranked primary/secondary/tertiary.';

-- ---------------------------------------------------------------------------
-- patient_documents: metadata for files stored in the `patient-documents`
-- Supabase Storage bucket (created below). file_path is the storage object
-- path, formatted as "{organization_id}/{patient_id}/{uuid}-{filename}".
-- ---------------------------------------------------------------------------
create table public.patient_documents (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.patients (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  file_name      text not null,
  file_path      text not null unique,
  file_size      bigint not null,
  mime_type      text not null,
  category       text not null default 'other'
                   check (category in ('insurance_card', 'identification', 'consent_form', 'medical_record', 'referral', 'other')),
  uploaded_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index patient_documents_patient_id_idx on public.patient_documents (patient_id);
create index patient_documents_organization_id_idx on public.patient_documents (organization_id);

comment on table public.patient_documents is 'Metadata for files in the patient-documents Storage bucket.';

-- ---------------------------------------------------------------------------
-- patient_medical_history: conditions, allergies, medications, surgeries,
-- immunizations - a simple unified timeline rather than separate tables,
-- since Module 2 does not yet need clinical-grade structured coding.
-- ---------------------------------------------------------------------------
create table public.patient_medical_history (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entry_type    text not null check (entry_type in ('condition', 'allergy', 'medication', 'surgery', 'immunization')),
  description   text not null,
  onset_date    date,
  status        text not null default 'active' check (status in ('active', 'resolved', 'chronic')),
  recorded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index patient_medical_history_patient_id_idx on public.patient_medical_history (patient_id);
create index patient_medical_history_organization_id_idx on public.patient_medical_history (organization_id);

create trigger patient_medical_history_set_updated_at
  before update on public.patient_medical_history
  for each row execute function public.set_updated_at();

comment on table public.patient_medical_history is 'Unified condition/allergy/medication/surgery/immunization timeline.';

-- ---------------------------------------------------------------------------
-- patient_notes: free-text notes, e.g. billing/collections/front-desk notes.
-- ---------------------------------------------------------------------------
create table public.patient_notes (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_id     uuid references public.profiles (id) on delete set null,
  note_type     text not null default 'general' check (note_type in ('general', 'billing', 'clinical', 'collections')),
  body          text not null,
  is_pinned     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index patient_notes_patient_id_idx on public.patient_notes (patient_id, created_at desc);
create index patient_notes_organization_id_idx on public.patient_notes (organization_id);

create trigger patient_notes_set_updated_at
  before update on public.patient_notes
  for each row execute function public.set_updated_at();

comment on table public.patient_notes is 'Free-text notes attached to a patient (billing, collections, clinical, general).';
