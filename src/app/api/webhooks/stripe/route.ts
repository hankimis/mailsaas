import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createServiceClient } from '@/lib/supabase/server';
import {
  notifyPaymentSuccess,
  notifyPaymentFailed,
} from '@/lib/solapi/notification-service';
import type { SubscriptionStatus } from '@/types/database';

// Stripe webhook handler
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // ============================================
      // Invoice Events
      // ============================================
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      // ============================================
      // Subscription Events
      // ============================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(supabase, subscription);
        break;
      }

      // ============================================
      // Checkout Events
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// ============================================
// Handler Functions
// ============================================

async function handleInvoicePaid(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  // Get company_id from invoice metadata or look up by subscription
  let companyId = invoice.metadata?.company_id;

  // Try to get subscription from parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!companyId && subscriptionDetails?.subscription) {
    const subscriptionId = typeof subscriptionDetails.subscription === 'string'
      ? subscriptionDetails.subscription
      : subscriptionDetails.subscription.id;
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    companyId = (company as { id: string } | null)?.id;
  }

  if (!companyId) {
    console.error('No company_id in invoice metadata');
    return;
  }

  // Save billing history
  await supabase.from('billing_history').upsert({
    company_id: companyId,
    stripe_invoice_id: invoice.id,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: 'paid',
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    description: invoice.description,
    invoice_pdf_url: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    paid_at: new Date().toISOString(),
  } as unknown as never, {
    onConflict: 'stripe_invoice_id',
  });

  // Update company status if needed
  await supabase
    .from('companies')
    .update({ subscription_status: 'active' } as unknown as never)
    .eq('id', companyId);

  // Send notification
  await notifyPaymentSuccess({
    companyId,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    invoiceUrl: invoice.hosted_invoice_url || undefined,
  });

  // Create in-app notification for admins
  const { data: adminsData } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'company_admin');

  const admins = adminsData as { id: string }[] | null;

  if (admins) {
    for (const admin of admins) {
      await (supabase.rpc as Function)('create_notification', {
        p_user_id: admin.id,
        p_company_id: companyId,
        p_type: 'payment_success',
        p_title: '결제 완료',
        p_message: `월간 구독 결제가 완료되었습니다. (${formatCurrency(invoice.amount_paid, invoice.currency)})`,
        p_action_url: '/dashboard/billing',
      });
    }
  }
}

async function handleInvoicePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  // Get company_id from invoice metadata or look up by subscription
  let companyId = invoice.metadata?.company_id;

  // Try to get subscription from parent.subscription_details
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!companyId && subscriptionDetails?.subscription) {
    const subscriptionId = typeof subscriptionDetails.subscription === 'string'
      ? subscriptionDetails.subscription
      : subscriptionDetails.subscription.id;
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    companyId = (company as { id: string } | null)?.id;
  }

  if (!companyId) {
    console.error('No company_id in invoice metadata');
    return;
  }

  // Save billing history
  await supabase.from('billing_history').upsert({
    company_id: companyId,
    stripe_invoice_id: invoice.id,
    amount_due: invoice.amount_due,
    amount_paid: 0,
    currency: invoice.currency,
    status: 'open',
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
  } as unknown as never, {
    onConflict: 'stripe_invoice_id',
  });

  // Update company status
  await supabase
    .from('companies')
    .update({ subscription_status: 'past_due' } as unknown as never)
    .eq('id', companyId);

  // Send notification
  await notifyPaymentFailed({
    companyId,
    amount: invoice.amount_due,
    currency: invoice.currency,
    reason: '결제 수단 확인 필요',
  });

  // Create in-app notification
  const { data: adminsData2 } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'company_admin');

  const admins2 = adminsData2 as { id: string }[] | null;

  if (admins2) {
    for (const admin of admins2) {
      await (supabase.rpc as Function)('create_notification', {
        p_user_id: admin.id,
        p_company_id: companyId,
        p_type: 'payment_failed',
        p_title: '결제 실패',
        p_message: '결제에 실패했습니다. 결제 수단을 확인해주세요.',
        p_action_url: '/dashboard/billing',
      });
    }
  }
}

async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const companyId = subscription.metadata?.company_id;

  if (!companyId) {
    // Try to find by subscription ID
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!company) {
      console.error('Company not found for subscription:', subscription.id);
      return;
    }
  }

  const status = mapStripeStatus(subscription.status);

  await supabase
    .from('companies')
    .update({
      subscription_status: status,
    } as unknown as never)
    .eq('stripe_subscription_id', subscription.id);

  // Update subscription items
  for (const item of subscription.items.data) {
    await supabase
      .from('subscription_items')
      .update({ quantity: item.quantity || 0 } as unknown as never)
      .eq('stripe_subscription_item_id', item.id);
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  await supabase
    .from('companies')
    .update({
      subscription_status: 'canceled',
      status: 'cancelled',
    } as unknown as never)
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionCreated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const companyId = subscription.metadata?.company_id;

  if (!companyId) {
    console.error('No company_id in subscription metadata');
    return;
  }

  // Update company with subscription info
  await supabase
    .from('companies')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: mapStripeStatus(subscription.status),
    } as unknown as never)
    .eq('id', companyId);

  // Create subscription items records
  for (const item of subscription.items.data) {
    const itemType = item.price.id === process.env.STRIPE_EMAIL_SEAT_PRICE_ID
      ? 'email_seat'
      : 'kakao_alert';

    await supabase.from('subscription_items').upsert({
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

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const companyId = session.metadata?.company_id;

  if (!companyId) {
    console.error('No company_id in session metadata');
    return;
  }

  // Update company status
  await supabase
    .from('companies')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
      status: 'active',
    } as unknown as never)
    .eq('id', companyId);
}

// ============================================
// Utility Functions
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
    paused: 'active',
  };
  return statusMap[status] || 'incomplete';
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
