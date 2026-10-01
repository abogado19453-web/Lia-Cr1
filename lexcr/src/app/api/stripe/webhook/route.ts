import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { acreditarPago } from '@/lib/suscripcion';

/** Webhook de Stripe: acredita el plan cuando el pago con tarjeta se completa. */
export async function POST(req: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  const firma = req.headers.get('stripe-signature');
  if (!secreto || !firma) return new Response('Sin configurar', { status: 400 });

  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(await req.text(), firma, secreto);
  } catch {
    return new Response('Firma inválida', { status: 400 });
  }

  if (evento.type === 'checkout.session.completed' || evento.type === 'checkout.session.async_payment_succeeded') {
    const s = evento.data.object as Stripe.Checkout.Session;
    if (s.payment_status === 'paid') {
      const pago = await prisma.pago.findUnique({ where: { stripeSession: s.id } });
      if (pago && pago.monto * 100 === s.amount_total && s.currency === 'crc') {
        await prisma.pago.update({ where: { id: pago.id }, data: { referencia: typeof s.payment_intent === 'string' ? s.payment_intent : s.id } });
        await acreditarPago(pago.id, 'stripe');
      }
    }
  }
  if (evento.type === 'checkout.session.expired') {
    const s = evento.data.object as Stripe.Checkout.Session;
    await prisma.pago.updateMany({ where: { stripeSession: s.id, estado: 'pendiente' }, data: { estado: 'rechazado', notas: 'Sesión de pago expirada' } });
  }
  return Response.json({ recibido: true });
}
