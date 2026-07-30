-- =============================================================================
-- Module 14: Documents
-- Migration 30: RLS policies. Uses the documents.view/documents.manage
-- permissions already seeded in Module 1's permission catalog (the same
-- pair Module 2's patient_documents storage policies already used) - no
-- RBAC migration needed.
-- =============================================================================

alter table public.documents enable row level security;

create policy "documents_select_org"
  on public.documents for select
  using (organization_id = public.current_organization_id() and public.has_permission('documents.view'));

create policy "documents_write_org"
  on public.documents for all
  using (organization_id = public.current_organization_id() and public.has_permission('documents.manage'))
  with check (organization_id = public.current_organization_id());
