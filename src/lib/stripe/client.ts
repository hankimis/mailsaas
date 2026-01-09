import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Price IDs from environment
export const STRIPE_PRICES = {
  EMAIL_SEAT: process.env.STRIPE_EMAIL_SEAT_PRICE_ID!,
  KAKAO_ALERT: process.env.STRIPE_KAKAO_ALERT_PRICE_ID!,
} as const;
