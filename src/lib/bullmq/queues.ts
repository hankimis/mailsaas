import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Cast to ConnectionOptions to fix type incompatibility between ioredis versions
const connection = redisConnection as unknown as ConnectionOptions;

// ============================================
// Queue Definitions
// ============================================

// Email Polling Queue
export const emailPollingQueue = new Queue('email-polling', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// DNS Verification Queue
export const dnsVerificationQueue = new Queue('dns-verification', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    removeOnComplete: 50,
    removeOnFail: 500,
  },
});

// Email Account Provisioning Queue
export const emailProvisioningQueue = new Queue('email-provisioning', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Notification Queue
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

// Kakao Delivery Queue
export const kakaoDeliveryQueue = new Queue('kakao-delivery', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

// ============================================
// Job Types
// ============================================

export interface EmailPollingJobData {
  userId: string;
  companyId: string;
}

export interface DNSVerificationJobData {
  companyId: string;
  domain: string;
}

export interface EmailProvisioningJobData {
  userId: string;
  companyId: string;
  email: string;
  password: string;
}

export interface NotificationJobData {
  userId: string;
  companyId?: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  channels: ('web' | 'email' | 'kakao')[];
}

export interface KakaoDeliveryJobData {
  userId: string;
  phone: string;
  templateId: string;
  variables: Record<string, string>;
  notificationId?: string;
}

// ============================================
// Queue Functions
// ============================================

export async function addEmailPollingJob(data: EmailPollingJobData) {
  return emailPollingQueue.add('poll', data, {
    repeat: {
      every: parseInt(process.env.EMAIL_POLLING_INTERVAL_MS || '60000'),
    },
    jobId: `email-poll-${data.userId}`,
  });
}

export async function removeEmailPollingJob(userId: string) {
  const job = await emailPollingQueue.getJob(`email-poll-${userId}`);
  if (job) {
    await job.remove();
  }
}

export async function addDNSVerificationJob(data: DNSVerificationJobData) {
  return dnsVerificationQueue.add('verify', data, {
    repeat: {
      every: parseInt(process.env.DNS_CHECK_INTERVAL_MS || '300000'), // 5 minutes
    },
    jobId: `dns-verify-${data.companyId}`,
  });
}

export async function removeDNSVerificationJob(companyId: string) {
  const job = await dnsVerificationQueue.getJob(`dns-verify-${companyId}`);
  if (job) {
    await job.remove();
  }
}

export async function addEmailProvisioningJob(data: EmailProvisioningJobData) {
  return emailProvisioningQueue.add('provision', data);
}

export async function addNotificationJob(data: NotificationJobData) {
  return notificationQueue.add('send', data);
}

export async function addKakaoDeliveryJob(data: KakaoDeliveryJobData) {
  return kakaoDeliveryQueue.add('deliver', data);
}

// ============================================
// Graceful Shutdown
// ============================================

export async function closeQueues() {
  await emailPollingQueue.close();
  await dnsVerificationQueue.close();
  await emailProvisioningQueue.close();
  await notificationQueue.close();
  await kakaoDeliveryQueue.close();
  await redisConnection.quit();
}

// Export connection for workers
export { connection };
