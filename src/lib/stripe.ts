import "server-only";
import Stripe from "stripe";

let client: Stripe | null | undefined;

/** Returns null - rather than throwing - when STRIPE_SECRET_KEY isn't configured. */
export function getStripeClient(): Stripe | null {
  if (client === undefined) {
    client = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  }
  return client;
}
