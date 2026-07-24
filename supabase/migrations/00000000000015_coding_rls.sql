-- =============================================================================
-- Module 6: Medical Coding
-- Migration 15: RLS policies. The three reference libraries are readable by
-- any authenticated user holding coding.view (already seeded in Module 1);
-- writes are managed by the service role only (seed/future admin tooling),
-- so no write policy is defined for them. Favorites are strictly per-user.
-- =============================================================================

alter table public.icd10_codes      enable row level security;
alter table public.procedure_codes  enable row level security;
alter table public.modifiers        enable row level security;
alter table public.coding_favorites enable row level security;

create policy "icd10_codes_select_authenticated"
  on public.icd10_codes for select
  using (auth.role() = 'authenticated' and public.has_permission('coding.view'));

create policy "procedure_codes_select_authenticated"
  on public.procedure_codes for select
  using (auth.role() = 'authenticated' and public.has_permission('coding.view'));

create policy "modifiers_select_authenticated"
  on public.modifiers for select
  using (auth.role() = 'authenticated' and public.has_permission('coding.view'));

create policy "coding_favorites_select_own"
  on public.coding_favorites for select
  using (user_id = auth.uid());

create policy "coding_favorites_write_own"
  on public.coding_favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and organization_id = public.current_organization_id());
