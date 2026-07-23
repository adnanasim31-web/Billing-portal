-- =============================================================================
-- Module 1: Authentication & User Management
-- Migration 3: Helper functions, RBAC checks, and the auth.users -> profiles
-- provisioning trigger.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- current_organization_id(): the calling user's organization, for RLS.
-- security definer + stable so it can be inlined cheaply into policies.
-- ---------------------------------------------------------------------------
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- is_super_admin(): platform-level admin (MedBill staff), bypasses org scoping
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- has_permission(slug): does the current user hold a role granting this
-- permission within their own organization?
-- ---------------------------------------------------------------------------
create or replace function public.has_permission(permission_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.organization_id = public.current_organization_id()
      and p.slug = permission_slug
  ) or public.is_super_admin();
$$;

-- ---------------------------------------------------------------------------
-- is_org_admin(): shorthand for the common "manage users/roles" check
-- ---------------------------------------------------------------------------
create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('organization.admin');
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user(): provisions a public.profiles row whenever Supabase Auth
-- creates a new auth.users row (email/password sign-up, invite acceptance).
-- Reads organization_id / first_name / last_name / job_title from the
-- raw_user_meta_data payload passed at signUp() time.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, organization_id, job_title, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'organization_id', '')::uuid,
    new.raw_user_meta_data ->> 'job_title',
    'invited'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clone_system_roles_for_org(): seeds an organization with the standard
-- role set (cloned from the global templates where organization_id is null)
-- the first time an organization is created.
-- ---------------------------------------------------------------------------
create or replace function public.clone_system_roles_for_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template record;
  new_role_id uuid;
begin
  for template in select * from public.roles where organization_id is null loop
    insert into public.roles (organization_id, name, slug, description, is_system)
    values (new.id, template.name, template.slug, template.description, true)
    returning id into new_role_id;

    insert into public.role_permissions (role_id, permission_id)
    select new_role_id, rp.permission_id
    from public.role_permissions rp
    where rp.role_id = template.id;
  end loop;
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.clone_system_roles_for_org();
