import 'server-only';
import Stripe from 'stripe';

let cliente: Stripe | null = null;

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY no está configurada.');
  cliente ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return cliente;
}
