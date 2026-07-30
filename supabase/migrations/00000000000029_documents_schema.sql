-- =============================================================================
-- Module 14: Documents
-- Migration 29: A general, organization-wide document library - contracts,
-- policies, payer agreements, compliance files - distinct from Module 2's
-- patient_documents (which is patient-specific). Optionally taggable to a
-- patient/provider/claim, with a simple version chain via
-- replaces_document_id/is_current.
-- =============================================================================

create table public.documents (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  file_name            text not null,
  file_path            text not null unique,
  file_size            bigint not null,
  mime_type            text not null,
  category             text not null default 'other'
                         check (category in ('contract', 'policy', 'payer_agreement', 'compliance', 'provider_credential', 'other')),
  entity_type          text check (entity_type in ('patient', 'provider', 'claim')),
  entity_id            uuid,
  version              integer not null default 1,
  replaces_document_id uuid references public.documents (id) on delete set null,
  is_current           boolean not null default true,
  notes                text,
  uploaded_by          uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  constraint documents_entity_pair_check check ((entity_type is null) = (entity_id is null))
);

create index documents_organization_id_idx on public.documents (organization_id);
create index documents_category_idx on public.documents (organization_id, category);
create index documents_entity_idx on public.documents (entity_type, entity_id) where (entity_type is not null);
create index documents_current_idx on public.documents (organization_id, is_current) where (is_current = true);

comment on table public.documents is 'General organization document library, optionally tagged to a patient/provider/claim, with a simple replaces_document_id version chain.';

-- ---------------------------------------------------------------------------
-- Storage: organization-documents bucket
-- Object path convention: "{organization_id}/{category}/{uuid}-{filename}"
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-documents',
  'organization-documents',
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

create policy "organization_documents_storage_select"
  on storage.objects for select
  using (
    bucket_id = 'organization-documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.has_permission('documents.view')
  );

create policy "organization_documents_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'organization-documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.has_permission('documents.manage')
  );

create policy "organization_documents_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'organization-documents'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.has_permission('documents.manage')
  );
