-- =============================================================================
-- Module 18: Task Management
-- Migration 37: RLS policies. Uses the tasks.view/tasks.manage permissions
-- already seeded in Module 1's permission catalog - no RBAC migration
-- needed.
-- =============================================================================

alter table public.tasks enable row level security;

create policy "tasks_select_org"
  on public.tasks for select
  using (organization_id = public.current_organization_id() and public.has_permission('tasks.view'));

create policy "tasks_write_org"
  on public.tasks for all
  using (organization_id = public.current_organization_id() and public.has_permission('tasks.manage'))
  with check (organization_id = public.current_organization_id());

alter table public.task_comments enable row level security;

create policy "task_comments_select_org"
  on public.task_comments for select
  using (organization_id = public.current_organization_id() and public.has_permission('tasks.view'));

create policy "task_comments_insert_org"
  on public.task_comments for insert
  with check (organization_id = public.current_organization_id() and public.has_permission('tasks.manage'));
