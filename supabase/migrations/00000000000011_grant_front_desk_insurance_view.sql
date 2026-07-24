-- =============================================================================
-- Modules 3 & 4: Providers, Insurance
-- Migration 11: Front Desk staff register patients and should be able to
-- browse the payer directory while doing so (Module 2's insurance-tab now
-- offers a "pick from directory" option). Grant insurance.view to:
--   1. The global 'front-desk' role template (organization_id is null),
--      so every NEW organization's cloned Front Desk role includes it.
--   2. Any already-cloned 'front-desk' roles in EXISTING organizations,
--      since role cloning only happens once at organization creation.
-- =============================================================================

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'front-desk'
  and p.slug = 'insurance.view'
on conflict do nothing;
