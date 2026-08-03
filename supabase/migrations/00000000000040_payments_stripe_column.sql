-- =============================================================================
-- Patient Portal: real card payments via Stripe. Adds a nullable, unique
-- column to the existing payments table so the Stripe webhook handler can
-- tell whether it has already recorded a given PaymentIntent - Stripe
-- explicitly documents that webhook events can be delivered more than once,
-- so this is the idempotency guard.
-- =============================================================================

alter table public.payments
  add column stripe_payment_intent_id text unique;

comment on column public.payments.stripe_payment_intent_id is 'Stripe PaymentIntent id for patient-portal card payments - null for staff-posted (ERA/check/manual) payments. Used to make webhook processing idempotent.';
