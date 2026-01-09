import { solapiClient } from './client';
import {
  KAKAO_TEMPLATES,
  buildNewEmailVariables,
  buildPaymentSuccessVariables,
  buildPaymentFailedVariables,
  buildAccountCreatedVariables,
  buildDNSVerifiedVariables,
} from './templates';
import { createServiceClient } from '@/lib/supabase/server';
import type { KakaoDeliveryStatus } from '@/types/database';

// ============================================
// Kakao Notification Service
// ============================================

interface NotifyNewEmailParams {
  userId: string;
  from: string;
  subject: string;
}

interface NotifyPaymentParams {
  companyId: string;
  amount: number;
  currency: string;
  invoiceUrl?: string;
  reason?: string;
}

interface NotifyAccountCreatedParams {
  userId: string;
  email: string;
  userName: string;
}

interface NotifyDNSVerifiedParams {
  companyId: string;
}

// Helper type for user with kakao fields
interface UserWithKakao {
  id: string;
  phone: string | null;
  kakao_alert_enabled: boolean;
  phone_verified: boolean;
}

/**
 * Send new email notification via KakaoTalk
 */
export async function notifyNewEmail(params: NotifyNewEmailParams) {
  const supabase = createServiceClient();

  // Get user info
  const { data: userData } = await supabase
    .from('users')
    .select('phone, kakao_alert_enabled, phone_verified')
    .eq('id', params.userId)
    .single();

  const user = userData as Pick<UserWithKakao, 'phone' | 'kakao_alert_enabled' | 'phone_verified'> | null;

  if (!user?.kakao_alert_enabled || !user.phone_verified || !user.phone) {
    return { success: false, reason: 'Kakao alert not enabled or phone not verified' };
  }

  const webmailUrl = `${process.env.NEXT_PUBLIC_APP_URL}/webmail`;

  const variables = buildNewEmailVariables({
    from: params.from,
    subject: params.subject,
    webmailUrl,
  });

  const result = await solapiClient.sendAlimTalk({
    to: user.phone,
    templateId: KAKAO_TEMPLATES.NEW_EMAIL,
    variables,
  });

  // Log delivery
  await supabase.from('kakao_delivery_logs').insert({
    user_id: params.userId,
    template_id: KAKAO_TEMPLATES.NEW_EMAIL,
    phone: user.phone,
    variables,
    status: result.success ? 'sent' : 'failed',
    solapi_message_id: result.messageId,
    solapi_group_id: result.groupId,
    status_message: result.error,
    sent_at: result.success ? new Date().toISOString() : null,
  } as unknown as never);

  return result;
}

/**
 * Send payment success notification to company admins
 */
export async function notifyPaymentSuccess(params: NotifyPaymentParams) {
  const supabase = createServiceClient();

  // Get company and admins
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', params.companyId)
    .single();

  const company = companyData as { name: string } | null;

  if (!company) return { success: false, reason: 'Company not found' };

  // Get company admins with Kakao enabled
  const { data: adminsData } = await supabase
    .from('users')
    .select('id, phone, kakao_alert_enabled, phone_verified')
    .eq('company_id', params.companyId)
    .eq('role', 'company_admin')
    .eq('kakao_alert_enabled', true)
    .eq('phone_verified', true);

  const admins = adminsData as UserWithKakao[] | null;

  if (!admins || admins.length === 0) {
    return { success: false, reason: 'No admins with Kakao enabled' };
  }

  const variables = buildPaymentSuccessVariables({
    companyName: company.name,
    amount: formatCurrency(params.amount, params.currency),
    period: '1개월',
    invoiceUrl: params.invoiceUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  const results = await Promise.all(
    admins.map(async (admin) => {
      if (!admin.phone) return { success: false };

      const result = await solapiClient.sendAlimTalk({
        to: admin.phone,
        templateId: KAKAO_TEMPLATES.PAYMENT_SUCCESS,
        variables,
      });

      await supabase.from('kakao_delivery_logs').insert({
        user_id: admin.id,
        template_id: KAKAO_TEMPLATES.PAYMENT_SUCCESS,
        phone: admin.phone,
        variables,
        status: (result.success ? 'sent' : 'failed') as KakaoDeliveryStatus,
        solapi_message_id: result.messageId,
        sent_at: result.success ? new Date().toISOString() : null,
      } as unknown as never);

      return result;
    })
  );

  return {
    success: results.some((r) => r.success),
    results,
  };
}

/**
 * Send payment failed notification to company admins
 */
export async function notifyPaymentFailed(params: NotifyPaymentParams) {
  const supabase = createServiceClient();

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', params.companyId)
    .single();

  const company = companyData as { name: string } | null;

  if (!company) return { success: false, reason: 'Company not found' };

  const { data: adminsData } = await supabase
    .from('users')
    .select('id, phone, kakao_alert_enabled, phone_verified')
    .eq('company_id', params.companyId)
    .eq('role', 'company_admin')
    .eq('kakao_alert_enabled', true)
    .eq('phone_verified', true);

  const admins = adminsData as UserWithKakao[] | null;

  if (!admins || admins.length === 0) {
    return { success: false, reason: 'No admins with Kakao enabled' };
  }

  const variables = buildPaymentFailedVariables({
    companyName: company.name,
    amount: formatCurrency(params.amount, params.currency),
    reason: params.reason || '결제 정보 확인 필요',
    retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing/retry`,
  });

  const results = await Promise.all(
    admins.map(async (admin) => {
      if (!admin.phone) return { success: false };

      const result = await solapiClient.sendAlimTalk({
        to: admin.phone,
        templateId: KAKAO_TEMPLATES.PAYMENT_FAILED,
        variables,
      });

      await supabase.from('kakao_delivery_logs').insert({
        user_id: admin.id,
        template_id: KAKAO_TEMPLATES.PAYMENT_FAILED,
        phone: admin.phone,
        variables,
        status: (result.success ? 'sent' : 'failed') as KakaoDeliveryStatus,
        solapi_message_id: result.messageId,
        sent_at: result.success ? new Date().toISOString() : null,
      } as unknown as never);

      return result;
    })
  );

  return {
    success: results.some((r) => r.success),
    results,
  };
}

/**
 * Send account created notification
 */
export async function notifyAccountCreated(params: NotifyAccountCreatedParams) {
  const supabase = createServiceClient();

  const { data: userData } = await supabase
    .from('users')
    .select('phone, kakao_alert_enabled, phone_verified')
    .eq('id', params.userId)
    .single();

  const user = userData as Pick<UserWithKakao, 'phone' | 'kakao_alert_enabled' | 'phone_verified'> | null;

  if (!user?.phone) {
    return { success: false, reason: 'No phone number' };
  }

  const variables = buildAccountCreatedVariables({
    userName: params.userName,
    email: params.email,
    webmailUrl: `${process.env.NEXT_PUBLIC_APP_URL}/webmail`,
  });

  // Send even if Kakao not enabled (initial welcome)
  const result = await solapiClient.sendAlimTalk({
    to: user.phone,
    templateId: KAKAO_TEMPLATES.ACCOUNT_CREATED,
    variables,
  });

  await supabase.from('kakao_delivery_logs').insert({
    user_id: params.userId,
    template_id: KAKAO_TEMPLATES.ACCOUNT_CREATED,
    phone: user.phone,
    variables,
    status: (result.success ? 'sent' : 'failed') as KakaoDeliveryStatus,
    solapi_message_id: result.messageId,
    sent_at: result.success ? new Date().toISOString() : null,
  } as unknown as never);

  return result;
}

/**
 * Send DNS verified notification
 */
export async function notifyDNSVerified(params: NotifyDNSVerifiedParams) {
  const supabase = createServiceClient();

  const { data: companyData } = await supabase
    .from('companies')
    .select('name, domain')
    .eq('id', params.companyId)
    .single();

  const company = companyData as { name: string; domain: string | null } | null;

  if (!company) return { success: false, reason: 'Company not found' };

  const { data: adminsData } = await supabase
    .from('users')
    .select('id, phone, phone_verified')
    .eq('company_id', params.companyId)
    .eq('role', 'company_admin')
    .eq('phone_verified', true);

  const admins = adminsData as { id: string; phone: string | null; phone_verified: boolean }[] | null;

  if (!admins || admins.length === 0) {
    return { success: false, reason: 'No admins with verified phone' };
  }

  const variables = buildDNSVerifiedVariables({
    companyName: company.name,
    domain: company.domain || '',
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  const results = await Promise.all(
    admins.map(async (admin) => {
      if (!admin.phone) return { success: false };

      const result = await solapiClient.sendAlimTalk({
        to: admin.phone,
        templateId: KAKAO_TEMPLATES.DNS_VERIFIED,
        variables,
      });

      await supabase.from('kakao_delivery_logs').insert({
        user_id: admin.id,
        template_id: KAKAO_TEMPLATES.DNS_VERIFIED,
        phone: admin.phone,
        variables,
        status: (result.success ? 'sent' : 'failed') as KakaoDeliveryStatus,
        solapi_message_id: result.messageId,
        sent_at: result.success ? new Date().toISOString() : null,
      } as unknown as never);

      return result;
    })
  );

  return {
    success: results.some((r) => r.success),
    results,
  };
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
