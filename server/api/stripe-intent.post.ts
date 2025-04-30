import Stripe from 'stripe';
import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  // Vérifie que la clé existe
  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: 'Clé Stripe secrète manquante côté serveur.' };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });
  const body = await readBody(event);

  try {
    // Création d'un PaymentIntent (modifie selon tes besoins)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount, // montant en centimes
      currency: body.currency || 'eur',
      // Optionnel : description, metadata, etc.
      // receipt_email: body.email,
      automatic_payment_methods: { enabled: true },
    });
    return { clientSecret: paymentIntent.client_secret };
  } catch (e) {
    return { error: (e as any).message || 'Erreur lors de la création du PaymentIntent.' };
  }
});
