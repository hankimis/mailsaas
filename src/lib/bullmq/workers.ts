import { Worker, Job } from 'bullmq';
import {
  connection,
  EmailPollingJobData,
  DNSVerificationJobData,
  EmailProvisioningJobData,
  NotificationJobData,
  KakaoDeliveryJobData,
} from './queues';
import { createServiceClient } from '@/lib/supabase/server';
import { createEmailAccount } from '@/lib/whm/email-service';
import { solapiClient } from '@/lib/solapi/client';
import { notifyNewEmail } from '@/lib/solapi/notification-service';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

// ============================================
// Email Polling Worker
// ============================================

export const emailPollingWorker = new Worker<EmailPollingJobData>(
  'email-polling',
  async (job: Job<EmailPollingJobData>) => {
    const { userId, companyId } = job.data;
    const supabase = createServiceClient();

    try {
      // Get user's polling state
      const { data: pollingStateData } = await supabase
        .from('email_polling_state')
        .select('*')
        .eq('user_id', userId)
        .eq('mailbox', 'INBOX')
        .single();

      const pollingState = pollingStateData as {
        last_uid: number;
        consecutive_errors: number;
      } | null;

      const lastUid = pollingState?.last_uid || 0;

      // In real implementation, connect to IMAP and check for new messages
      // This is a placeholder for the actual IMAP polling logic
      // const newMessages = await checkNewEmails(userId, lastUid);

      // For now, just update last poll time
      await supabase
        .from('email_polling_state')
        .upsert({
          user_id: userId,
          mailbox: 'INBOX',
          last_uid: lastUid,
          last_poll_at: new Date().toISOString(),
          consecutive_errors: 0,
        } as unknown as never, {
          onConflict: 'user_id,mailbox',
        });

      // If new messages found, send notifications
      // for (const message of newMessages) {
      //   await notifyNewEmail({
      //     userId,
      //     from: message.from,
      //     subject: message.subject,
      //   });
      // }

      return { success: true, userId, checkedAt: new Date().toISOString() };
    } catch (error) {
      // Update error state
      const { data: currentStateData } = await supabase
        .from('email_polling_state')
        .select('consecutive_errors')
        .eq('user_id', userId)
        .eq('mailbox', 'INBOX')
        .single();

      const currentState = currentStateData as { consecutive_errors: number } | null;

      await supabase
        .from('email_polling_state')
        .upsert({
          user_id: userId,
          mailbox: 'INBOX',
          consecutive_errors: (currentState?.consecutive_errors || 0) + 1,
          last_error: error instanceof Error ? error.message : 'Unknown error',
          last_error_at: new Date().toISOString(),
        } as unknown as never, {
          onConflict: 'user_id,mailbox',
        });

      throw error;
    }
  },
  {
    connection,
    concurrency: 10,
  }
);

// ============================================
// DNS Verification Worker
// ============================================

export const dnsVerificationWorker = new Worker<DNSVerificationJobData>(
  'dns-verification',
  async (job: Job<DNSVerificationJobData>) => {
    const { companyId, domain } = job.data;
    const supabase = createServiceClient();

    try {
      // Get required DNS records
      const { data: dnsRecordsData } = await supabase
        .from('dns_records')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_verified', false);

      const dnsRecords = dnsRecordsData as {
        id: string;
        record_type: string;
        host: string;
        value: string;
      }[] | null;

      if (!dnsRecords || dnsRecords.length === 0) {
        // All verified, update company status
        await supabase
          .from('companies')
          .update({
            domain_status: 'verified',
            domain_verified_at: new Date().toISOString(),
          } as unknown as never)
          .eq('id', companyId);

        return { success: true, message: 'All DNS records verified' };
      }

      let allVerified = true;

      for (const record of dnsRecords) {
        let verified = false;

        try {
          if (record.record_type === 'MX') {
            const mxRecords = await resolveMx(domain);
            verified = mxRecords.some(
              (mx) =>
                mx.exchange.toLowerCase().includes(record.value.toLowerCase())
            );
          } else if (record.record_type === 'TXT') {
            const txtRecords = await resolveTxt(
              record.host === '@' ? domain : `${record.host}.${domain}`
            );
            verified = txtRecords.flat().some((txt) =>
              txt.includes(record.value)
            );
          }
        } catch {
          // DNS lookup failed, record not found
          verified = false;
        }

        // Update record status
        await supabase
          .from('dns_records')
          .update({
            is_verified: verified,
            verified_at: verified ? new Date().toISOString() : null,
            last_check_at: new Date().toISOString(),
          } as unknown as never)
          .eq('id', record.id);

        if (!verified) {
          allVerified = false;
        }
      }

      // Update company status if all verified
      if (allVerified) {
        await supabase
          .from('companies')
          .update({
            domain_status: 'verified',
            domain_verified_at: new Date().toISOString(),
            use_temp_domain: false,
          } as unknown as never)
          .eq('id', companyId);

        // Send notification
        // await notifyDNSVerified({ companyId });
      }

      return { success: true, allVerified, checkedRecords: dnsRecords.length };
    } catch (error) {
      console.error('DNS verification error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

// ============================================
// Email Provisioning Worker
// ============================================

export const emailProvisioningWorker = new Worker<EmailProvisioningJobData>(
  'email-provisioning',
  async (job: Job<EmailProvisioningJobData>) => {
    const { userId, companyId, email, password } = job.data;

    try {
      const result = await createEmailAccount({
        userId,
        companyId,
        email,
        password,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create email account');
      }

      return { success: true, emailAccountId: result.emailAccountId };
    } catch (error) {
      console.error('Email provisioning error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

// ============================================
// Notification Worker
// ============================================

export const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { userId, companyId, type, title, message, actionUrl, channels } =
      job.data;
    const supabase = createServiceClient();

    try {
      // Create web notification
      if (channels.includes('web')) {
        await (supabase.rpc as Function)('create_notification', {
          p_user_id: userId,
          p_company_id: companyId || null,
          p_type: type,
          p_title: title,
          p_message: message,
          p_action_url: actionUrl,
        });
      }

      // Send email notification
      if (channels.includes('email')) {
        // TODO: Implement email sending
        // await sendEmail({ to: userEmail, subject: title, body: message });
      }

      // Send Kakao notification
      if (channels.includes('kakao')) {
        const { data: userData } = await supabase
          .from('users')
          .select('phone, kakao_alert_enabled, phone_verified')
          .eq('id', userId)
          .single();

        const user = userData as {
          phone: string | null;
          kakao_alert_enabled: boolean;
          phone_verified: boolean;
        } | null;

        if (user?.kakao_alert_enabled && user.phone_verified && user.phone) {
          // Queue Kakao delivery
          const phone = user.phone;
          await import('./queues').then(({ addKakaoDeliveryJob }) =>
            addKakaoDeliveryJob({
              userId,
              phone,
              templateId: getTemplateIdForType(type),
              variables: { title, message },
            })
          );
        }
      }

      return { success: true, channels };
    } catch (error) {
      console.error('Notification worker error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 20,
  }
);

// ============================================
// Kakao Delivery Worker
// ============================================

export const kakaoDeliveryWorker = new Worker<KakaoDeliveryJobData>(
  'kakao-delivery',
  async (job: Job<KakaoDeliveryJobData>) => {
    const { userId, phone, templateId, variables, notificationId } = job.data;
    const supabase = createServiceClient();

    try {
      const result = await solapiClient.sendAlimTalk({
        to: phone,
        templateId,
        variables,
      });

      // Log delivery
      await supabase.from('kakao_delivery_logs').insert({
        user_id: userId,
        notification_id: notificationId || null,
        template_id: templateId,
        phone,
        variables,
        status: result.success ? 'sent' : 'failed',
        solapi_message_id: result.messageId,
        solapi_group_id: result.groupId,
        status_message: result.error,
        sent_at: result.success ? new Date().toISOString() : null,
      } as unknown as never);

      if (!result.success) {
        throw new Error(result.error || 'Kakao send failed');
      }

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Kakao delivery error:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 10,
  }
);

// ============================================
// Helper Functions
// ============================================

function getTemplateIdForType(type: string): string {
  const templateMap: Record<string, string> = {
    new_email: 'TPL_NEW_EMAIL',
    payment_success: 'TPL_PAYMENT_SUCCESS',
    payment_failed: 'TPL_PAYMENT_FAILED',
    account_created: 'TPL_ACCOUNT_CREATED',
    dns_verified: 'TPL_DNS_VERIFIED',
  };
  return templateMap[type] || 'TPL_SYSTEM';
}

// ============================================
// Error Handlers
// ============================================

emailPollingWorker.on('failed', (job, err) => {
  console.error(`Email polling job ${job?.id} failed:`, err.message);
});

dnsVerificationWorker.on('failed', (job, err) => {
  console.error(`DNS verification job ${job?.id} failed:`, err.message);
});

emailProvisioningWorker.on('failed', (job, err) => {
  console.error(`Email provisioning job ${job?.id} failed:`, err.message);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err.message);
});

kakaoDeliveryWorker.on('failed', (job, err) => {
  console.error(`Kakao delivery job ${job?.id} failed:`, err.message);
});

// ============================================
// Graceful Shutdown
// ============================================

export async function closeWorkers() {
  await emailPollingWorker.close();
  await dnsVerificationWorker.close();
  await emailProvisioningWorker.close();
  await notificationWorker.close();
  await kakaoDeliveryWorker.close();
}
