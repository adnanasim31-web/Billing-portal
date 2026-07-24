-- =============================================================================
-- Module 2: Patients
-- Migration 7: RLS policies for patient tables + Storage bucket/policies for
-- patient documents.
-- =============================================================================

alter table public.patients                  enable row level security;
alter table public.patient_insurance_policies enable row level security;
alter table public.patient_documents          enable row level security;
alter table public.patient_medical_history    enable row level security;
alter table public.patient_notes              enable row level security;

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
create policy "patients_select_org"
  on public.patients for select
  using (organization_id = public.current_organization_id() and public.has_permission('patients.view'));

create policy "patients_write_org"
  on public.patients for all
  using (organization_id = public.current_organization_id() and public.has_permission('patients.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- patient_insurance_policies
-- ---------------------------------------------------------------------------
create policy "patient_insurance_select_org"
  on public.patient_insurance_policies for select
  using (organization_id = public.current_organization_id() and public.has_permission('patients.view'));

create policy "patient_insurance_write_org"
  on public.patient_insurance_policies for all
  using (organization_id = public.current_organization_id() and public.has_permission('patients.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- patient_documents
-- ---------------------------------------------------------------------------
create policy "patient_documents_select_org"
  on public.patient_documents for select
  using (organization_id = public.current_organization_id() and public.has_permission('documents.view'));

create policy "patient_documents_write_org"
  on public.patient_documents for all
  using (organization_id = public.current_organization_id() and public.has_permission('documents.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- patient_medical_history
-- ---------------------------------------------------------------------------
create policy "patient_medical_history_select_org"
  on public.patient_medical_history for select
  using (organization_id = public.current_organization_id() and public.has_permission('patients.view'));

create policy "patient_medical_history_write_org"
  on public.patient_medical_history for all
  using (organization_id = public.current_organization_id() and public.has_permission('patients.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- patient_notes
-- ---------------------------------------------------------------------------
create policy "patient_notes_select_org"
  on public.patient_notes for select
  using (organization_id = public.current_organization_id() and public.has_permission('patients.view'));

create policy "patient_notes_write_org"
  on public.patient_notes for all
  using (organization_id = public.current_organization_id() and public.has_permission('patients.manage'))
  with check (organization_id = public.current_organization_id());

-- =============================================================================
-- Storage: patient-documents bucket
-- Object path convention: "{organization_id}/{patient_id}/{uuid}-{filename}"
-- so RLS can scope access using the first path segment as the org id.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "patient_documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.has_permission('documents.view')
  );

create policy "patient_documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.has_permission('documents.manage')
  );

create policy "patient_documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.has_permission('documents.manage')
  );
