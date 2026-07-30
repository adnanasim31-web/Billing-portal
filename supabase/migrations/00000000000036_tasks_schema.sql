-- =============================================================================
-- Module 18: Task Management
-- Migration 36: A general internal task tracker - assign work with a due
-- date and priority, track status, and discuss via comments. Deliberately
-- generic/standalone rather than tightly wired into every other module's
-- own workflow (see README for the integration points left as future work).
-- =============================================================================

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null,
  description     text,
  status          text not null default 'todo'
                    check (status in ('todo', 'in_progress', 'done', 'canceled')),
  priority        text not null default 'medium'
                    check (priority in ('low', 'medium', 'high')),
  due_date        date,
  assigned_to     uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index tasks_organization_id_idx on public.tasks (organization_id);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_status_idx on public.tasks (organization_id, status);
create index tasks_due_date_idx on public.tasks (organization_id, due_date);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

comment on table public.tasks is 'General internal task tracker: title, assignee, priority, status, due date.';

create table public.task_comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id         uuid not null references public.tasks (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index task_comments_organization_id_idx on public.task_comments (organization_id);
create index task_comments_task_id_idx on public.task_comments (task_id, created_at);

comment on table public.task_comments is 'Append-only comment thread on a task.';
