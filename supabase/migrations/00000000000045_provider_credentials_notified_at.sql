-- =============================================================================
-- Supports the expiring-credentials reminder email cron job: tracks the last
-- time a credential's owning provider was emailed about its expiration_date
-- so the daily sweep doesn't re-notify every run throughout the warning
-- window. updateCredential() resets this to null whenever expiration_date
-- actually changes, so a renewal re-arms the reminder for the new date.
-- =============================================================================

alter table public.provider_credentials
  add column expiration_notified_at timestamptz;
