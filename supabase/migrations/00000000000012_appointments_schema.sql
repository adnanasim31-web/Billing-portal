-- =============================================================================
-- Module 5: Appointments
-- Migration 12: Scheduling. Uses a GiST exclusion constraint (not just app
-- validation) to make provider double-booking impossible at the database
-- level - the same guarantee a real practice management system needs.
-- =============================================================================

create extension if not exists "btree_gist";

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  provider_id      uuid not null references public.providers (id) on delete restrict,
  appointment_type text not null default 'follow_up'
                     check (appointment_type in ('new_patient', 'follow_up', 'procedure', 'telehealth', 'other')),
  scheduled_start  timestamptz not null,
  scheduled_end    timestamptz not null,
  status           text not null default 'scheduled'
                     check (status in ('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
  reason           text,
  location         text,
  checked_in_at    timestamptz,
  checked_out_at   timestamptz,
  cancelled_at     timestamptz,
  cancellation_reason text,
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint appointments_time_order check (scheduled_end > scheduled_start),
  -- A provider cannot be double-booked for overlapping time ranges, unless
  -- one of the conflicting appointments has been cancelled or marked a
  -- no-show (those no longer occupy the provider's calendar).
  exclude using gist (
    provider_id with =,
    tstzrange(scheduled_start, scheduled_end) with &&
  ) where (status not in ('cancelled', 'no_show'))
);

create index appointments_organization_id_idx on public.appointments (organization_id);
create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_provider_id_idx on public.appointments (provider_id);
create index appointments_scheduled_start_idx on public.appointments (organization_id, scheduled_start);
create index appointments_status_idx on public.appointments (organization_id, status);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

comment on table public.appointments is 'Scheduled patient visits. Overlapping active appointments for the same provider are rejected at the database level via a GiST exclusion constraint.';
