-- =============================================================================
-- Module 1: Authentication & User Management
-- Migration 4: Row Level Security policies
-- =============================================================================

alter table public.organizations   enable row level security;
alter table public.profiles        enable row level security;
alter table public.roles           enable row level security;
alter table public.permissions     enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles      enable row level security;
alter table public.invitations     enable row level security;
alter table public.two_factor_auth enable row level security;
alter table public.otp_codes       enable row level security;
alter table public.user_sessions   enable row level security;
alter table public.login_attempts  enable row level security;
alter table public.audit_logs      enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy "organizations_select_own"
  on public.organizations for select
  using (id = public.current_organization_id() or public.is_super_admin());

create policy "organizations_update_admin"
  on public.organizations for update
  using (id = public.current_organization_id() and public.is_org_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_self_or_org"
  on public.profiles for select
  using (
    id = auth.uid()
    or organization_id = public.current_organization_id()
    or public.is_super_admin()
  );

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on public.profiles for update
  using (organization_id = public.current_organization_id() and public.is_org_admin())
  with check (organization_id = public.current_organization_id());

-- Inserts happen exclusively via the handle_new_user() trigger (security definer)
-- or the service role for invite-acceptance flows; no direct client insert policy.

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
create policy "roles_select_org_or_template"
  on public.roles for select
  using (
    organization_id is null
    or organization_id = public.current_organization_id()
    or public.is_super_admin()
  );

create policy "roles_write_admin"
  on public.roles for all
  using (organization_id = public.current_organization_id() and public.has_permission('roles.manage') and not is_system)
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- permissions (read-only catalog, visible to any authenticated user)
-- ---------------------------------------------------------------------------
create policy "permissions_select_authenticated"
  on public.permissions for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------
create policy "role_permissions_select_org"
  on public.role_permissions for select
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.organization_id is null or r.organization_id = public.current_organization_id())
    )
  );

create policy "role_permissions_write_admin"
  on public.role_permissions for all
  using (
    public.has_permission('roles.manage')
    and exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and r.organization_id = public.current_organization_id()
        and not r.is_system
    )
  );

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------
create policy "user_roles_select_org"
  on public.user_roles for select
  using (organization_id = public.current_organization_id() or public.is_super_admin());

create policy "user_roles_write_admin"
  on public.user_roles for all
  using (organization_id = public.current_organization_id() and public.has_permission('users.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- invitations (admins only; the invited party is looked up server-side with
-- the service role using the raw token, since they are not yet authenticated)
-- ---------------------------------------------------------------------------
create policy "invitations_select_admin"
  on public.invitations for select
  using (organization_id = public.current_organization_id() and public.has_permission('users.manage'));

create policy "invitations_write_admin"
  on public.invitations for all
  using (organization_id = public.current_organization_id() and public.has_permission('users.manage'))
  with check (organization_id = public.current_organization_id());

-- ---------------------------------------------------------------------------
-- two_factor_auth: strictly self-access. No org-admin override (security).
-- ---------------------------------------------------------------------------
create policy "two_factor_auth_self_only"
  on public.two_factor_auth for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- otp_codes: no client access at all; issued & verified via service role
-- from server-side route handlers only.
-- ---------------------------------------------------------------------------
create policy "otp_codes_no_client_access"
  on public.otp_codes for all
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- user_sessions
-- ---------------------------------------------------------------------------
create policy "user_sessions_select_self_or_admin"
  on public.user_sessions for select
  using (
    user_id = auth.uid()
    or (public.has_permission('users.manage')
        and exists (select 1 from public.profiles p where p.id = user_sessions.user_id
                     and p.organization_id = public.current_organization_id()))
  );

create policy "user_sessions_update_self_or_admin"
  on public.user_sessions for update
  using (
    user_id = auth.uid()
    or (public.has_permission('users.manage')
        and exists (select 1 from public.profiles p where p.id = user_sessions.user_id
                     and p.organization_id = public.current_organization_id()))
  );

-- ---------------------------------------------------------------------------
-- login_attempts: no direct client access; written/read by server-side
-- services only (service role) for rate-limiting decisions.
-- ---------------------------------------------------------------------------
create policy "login_attempts_no_client_access"
  on public.login_attempts for all
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- audit_logs: readable by org admins with an explicit permission; writes are
-- performed exclusively by server-side services using the service role.
-- ---------------------------------------------------------------------------
create policy "audit_logs_select_admin"
  on public.audit_logs for select
  using (
    (organization_id = public.current_organization_id() and public.has_permission('audit_logs.view'))
    or public.is_super_admin()
  );
