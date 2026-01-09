import Stripe from 'stripe';
import { stripe, STRIPE_PRICES } from './client';
import { createServiceClient } from '@/lib/supabase/server';
import type { SubscriptionStatus } from '@/types/database';

// ============================================
// Customer Management
// ============================================

export async function createStripeCustomer(
  companyId: string,
  email: string,
  name: string
): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      company_id: companyId,
    },
  });

  // Update company with Stripe customer ID
  const supabase = createServiceClient();
  await supabase
    .from('companies')
    .update({ stripe_customer_id: customer.id } as unknown as never)
    .eq('id', companyId);

  return customer.id;
}

export async function getOrCreateStripeCustomer(
  companyId: string,
  email: string,
  name: string
): Promise<string> {
  const supabase = createServiceClient();

  const { data: companyData } = await supabase
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', companyId)
    .single();

  const company = companyData as { stripe_customer_id: string | null } | null;

  if (company?.stripe_customer_id) {
    return company.stripe_customer_id;
  }

  return createStripeCustomer(companyId, email, name);
}

// ============================================
// Subscription Management
// ============================================

interface CreateSubscriptionParams {
  companyId: string;
  customerId: string;
  seatCount: number;
  kakaoAlertCount?: number;
  trialDays?: number;
}

export async function createSubscription({
  companyId,
  customerId,
  seatCount,
  kakaoAlertCount = 0,
  trialDays = 14,
}: CreateSubscriptionParams) {
  const items: Stripe.SubscriptionCreateParams.Item[] = [
    {
      price: STRIPE_PRICES.EMAIL_SEAT,
      quantity: seatCount,
    },
  ];

  // Add Kakao alert item if needed
  if (kakaoAlertCount > 0) {
    items.push({
      price: STRIPE_PRICES.KAKAO_ALERT,
      quantity: kakaoAlertCount,
    });
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items,
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      company_id: companyId,
    },
  });

  // Save subscription info to database
  await saveSubscriptionToDatabase(companyId, subscription);

  return subscription;
}

async function saveSubscriptionToDatabase(
  companyId: string,
  subscription: Stripe.Subscription
) {
  const supabase = createServiceClient();

  // Update company
  await supabase
    .from('companies')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: mapStripeStatus(subscription.status),
    } as unknown as never)
    .eq('id', companyId);

  // Save subscription items
  for (const item of subscription.items.data) {
    const itemType = item.price.id === STRIPE_PRICES.EMAIL_SEAT
      ? 'email_seat'
      : 'kakao_alert';

    await supabase
      .from('subscription_items')
      .upsert({
        company_id: companyId,
        stripe_subscription_item_id: item.id,
        stripe_price_id: item.price.id,
        item_type: itemType,
        quantity: item.quantity || 0,
      } as unknown as never, {
        onConflict: 'stripe_subscription_item_id',
      });
  }
}

// ============================================
// Seat & Add-on Management
// ============================================

interface UpdateQuantityParams {
  companyId: string;
  itemType: 'email_seat' | 'kakao_alert';
  quantity: number;
  prorate?: boolean;
}

export async function updateSubscriptionQuantity({
  companyId,
  itemType,
  quantity,
  prorate = true,
}: UpdateQuantityParams) {
  const supabase = createServiceClient();

  // Get subscription item
  const { data: subItemData } = await supabase
    .from('subscription_items')
    .select('stripe_subscription_item_id')
    .eq('company_id', companyId)
    .eq('item_type', itemType)
    .single();

  const subItem = subItemData as { stripe_subscription_item_id: string } | null;

  if (!subItem) {
    throw new Error(`Subscription item not found for ${itemType}`);
  }

  // Update in Stripe
  const updatedItem = await stripe.subscriptionItems.update(
    subItem.stripe_subscription_item_id,
    {
      quantity,
      proration_behavior: prorate ? 'create_prorations' : 'none',
    }
  );

  // Update in database
  await supabase
    .from('subscription_items')
    .update({ quantity } as unknown as never)
    .eq('stripe_subscription_item_id', subItem.stripe_subscription_item_id);

  return updatedItem;
}

// Add Kakao alert to existing subscription
export async function addKakaoAlertToSubscription(
  companyId: string,
  subscriptionId: string,
  quantity: number
) {
  const supabase = createServiceClient();

  // Check if already exists
  const { data: existingItemData } = await supabase
    .from('subscription_items')
    .select('id')
    .eq('company_id', companyId)
    .eq('item_type', 'kakao_alert')
    .single();

  const existingItem = existingItemData as { id: string } | null;

  if (existingItem) {
    // Update existing
    return updateSubscriptionQuantity({
      companyId,
      itemType: 'kakao_alert',
      quantity,
    });
  }

  // Add new item to subscription
  const newItem = await stripe.subscriptionItems.create({
    subscription: subscriptionId,
    price: STRIPE_PRICES.KAKAO_ALERT,
    quantity,
    proration_behavior: 'create_prorations',
  });

  // Save to database
  await supabase
    .from('subscription_items')
    .insert({
      company_id: companyId,
      stripe_subscription_item_id: newItem.id,
      stripe_price_id: STRIPE_PRICES.KAKAO_ALERT,
      item_type: 'kakao_alert',
      quantity,
    } as unknown as never);

  return newItem;
}

// ============================================
// Kakao Alert Toggle
// ============================================

interface ToggleKakaoAlertParams {
  userId: string;
  companyId: string;
  enabled: boolean;
}

export async function toggleKakaoAlert({
  userId,
  companyId,
  enabled,
}: ToggleKakaoAlertParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  try {
    // Get company subscription info
    const { data: companyData } = await supabase
      .from('companies')
      .select('stripe_subscription_id, kakao_alert_user_count')
      .eq('id', companyId)
      .single();

    const company = companyData as {
      stripe_subscription_id: string | null;
      kakao_alert_user_count: number;
    } | null;

    if (!company?.stripe_subscription_id) {
      return { success: false, error: 'No active subscription' };
    }

    const newCount = enabled
      ? (company.kakao_alert_user_count || 0) + 1
      : Math.max(0, (company.kakao_alert_user_count || 0) - 1);

    if (enabled && newCount === 1) {
      // First Kakao user - add item to subscription
      await addKakaoAlertToSubscription(
        companyId,
        company.stripe_subscription_id,
        newCount
      );
    } else if (!enabled && newCount === 0) {
      // Remove Kakao item from subscription
      const { data: subItemData } = await supabase
        .from('subscription_items')
        .select('stripe_subscription_item_id')
        .eq('company_id', companyId)
        .eq('item_type', 'kakao_alert')
        .single();

      const subItem = subItemData as { stripe_subscription_item_id: string } | null;

      if (subItem) {
        await stripe.subscriptionItems.del(subItem.stripe_subscription_item_id, {
          proration_behavior: 'create_prorations',
        });

        await supabase
          .from('subscription_items')
          .delete()
          .eq('stripe_subscription_item_id', subItem.stripe_subscription_item_id);
      }
    } else {
      // Update quantity
      await updateSubscriptionQuantity({
        companyId,
        itemType: 'kakao_alert',
        quantity: newCount,
      });
    }

    // Update user
    await supabase
      .from('users')
      .update({
        kakao_alert_enabled: enabled,
        kakao_alert_consent: enabled ? true : undefined,
        kakao_alert_consent_at: enabled ? new Date().toISOString() : undefined,
      } as unknown as never)
      .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Toggle Kakao alert error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// Checkout Session
// ============================================

export async function createCheckoutSession(
  companyId: string,
  customerId: string,
  seatCount: number
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: STRIPE_PRICES.EMAIL_SEAT,
        quantity: seatCount,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        company_id: companyId,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?setup=complete`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?step=payment&canceled=true`,
    metadata: {
      company_id: companyId,
    },
  });

  return session;
}

// ============================================
// Billing Portal
// ============================================

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// ============================================
// Utilities
// ============================================

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete',
    paused: 'active', // Treat paused as active for our purposes
  };
  return statusMap[status] || 'incomplete';
}

export async function getSubscriptionDetails(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice'],
  });

  return subscription;
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
) {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
