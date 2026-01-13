import { whmClient } from './client';
import { createServiceClient } from '@/lib/supabase/server';
import type { EmailAccountStatus } from '@/types/database';

// ============================================
// Email Account Service
// ============================================

interface CreateEmailParams {
  userId: string;
  companyId: string;
  email: string;
  password: string;
}

interface EmailAccountResult {
  success: boolean;
  error?: string;
  emailAccountId?: string;
}

/**
 * Generate secure random password
 */
function generateSecurePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * Generate username from company slug
 */
function generateCpanelUsername(slug: string): string {
  // cPanel username max 8 chars for legacy, 16 for newer
  const clean = slug.replace(/[^a-z0-9]/g, '');
  return clean.substring(0, 8) + Math.random().toString(36).substring(2, 6);
}

/**
 * Create email account for a user
 */
export async function createEmailAccount({
  userId,
  companyId,
  email,
  password,
}: CreateEmailParams): Promise<EmailAccountResult> {
  const supabase = createServiceClient();

  try {
    // Get company info
    const { data: companyData } = await supabase
      .from('companies')
      .select('domain, cpanel_username, cpanel_account_id')
      .eq('id', companyId)
      .single();

    const company = companyData as {
      domain: string | null;
      cpanel_username: string | null;
      cpanel_account_id: string | null;
    } | null;

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    if (!company.domain || !company.cpanel_username) {
      return { success: false, error: 'Company domain not configured' };
    }

    // Create email account in cPanel
    const result = await whmClient.createEmailAccount({
      cpanelUser: company.cpanel_username,
      email,
      password,
      quota: 1000, // 1GB
      domain: company.domain,
    });

    if (result.errors && result.errors.length > 0) {
      return { success: false, error: result.errors[0] };
    }

    // Update user with email account info
    const emailAccountId = `${email}`;

    await supabase
      .from('users')
      .update({
        email_account_id: emailAccountId,
        email_account_status: 'active' as EmailAccountStatus,
        email_quota_mb: 1000,
      } as unknown as never)
      .eq('id', userId);

    return { success: true, emailAccountId };
  } catch (error) {
    console.error('Create email account error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Setup company cPanel account
 */
export async function setupCompanyCpanelAccount(
  companyId: string
): Promise<{
  success: boolean;
  error?: string;
  cpanelUsername?: string;
}> {
  const supabase = createServiceClient();

  try {
    // Get company info
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    const company = companyData as {
      slug: string;
      domain: string | null;
      cpanel_account_id: string | null;
      cpanel_username: string | null;
      use_temp_domain: boolean;
      temp_subdomain: string | null;
      contact_email: string;
    } | null;

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    if (company.cpanel_account_id) {
      return {
        success: true,
        cpanelUsername: company.cpanel_username || undefined,
      };
    }

    // Determine domain to use
    const domain = company.use_temp_domain && company.temp_subdomain
      ? company.temp_subdomain
      : company.domain;

    if (!domain) {
      return { success: false, error: 'No domain configured' };
    }

    // Generate cPanel credentials
    const cpanelUsername = generateCpanelUsername(company.slug);
    const cpanelPassword = generateSecurePassword();

    // Create cPanel account
    const result = await whmClient.createAccount({
      domain,
      username: cpanelUsername,
      password: cpanelPassword,
      plan: 'default',
      contactEmail: company.contact_email,
    });

    if (result.metadata.result !== 1) {
      return { success: false, error: result.metadata.reason };
    }

    // Update company with cPanel info
    await supabase
      .from('companies')
      .update({
        cpanel_account_id: cpanelUsername,
        cpanel_username: cpanelUsername,
        cpanel_package: 'default',
        status: 'active',
      } as unknown as never)
      .eq('id', companyId);

    return { success: true, cpanelUsername };
  } catch (error) {
    console.error('Setup cPanel account error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Suspend email account
 */
export async function suspendEmailAccount(userId: string): Promise<EmailAccountResult> {
  const supabase = createServiceClient();

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('email_account_id, company_id')
      .eq('id', userId)
      .single();

    const user = userData as {
      email_account_id: string | null;
      company_id: string | null;
    } | null;

    if (!user?.email_account_id) {
      return { success: false, error: 'No email account found' };
    }

    // Update status in database
    await supabase
      .from('users')
      .update({ email_account_status: 'suspended' as EmailAccountStatus } as unknown as never)
      .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Suspend email account error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete email account
 */
export async function deleteEmailAccount(userId: string): Promise<EmailAccountResult> {
  const supabase = createServiceClient();

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('email, email_account_id, company_id')
      .eq('id', userId)
      .single();

    const user = userData as {
      email: string;
      email_account_id: string | null;
      company_id: string | null;
    } | null;

    if (!user?.email_account_id || !user.company_id) {
      return { success: false, error: 'No email account found' };
    }

    const { data: companyData } = await supabase
      .from('companies')
      .select('domain, cpanel_username')
      .eq('id', user.company_id)
      .single();

    const company = companyData as {
      domain: string | null;
      cpanel_username: string | null;
    } | null;

    if (!company?.cpanel_username || !company.domain) {
      return { success: false, error: 'Company not configured' };
    }

    // Delete from cPanel
    await whmClient.deleteEmailAccount({
      cpanelUser: company.cpanel_username,
      email: user.email,
      domain: company.domain,
    });

    // Update user
    await supabase
      .from('users')
      .update({
        email_account_id: null,
        email_account_status: 'deleted' as EmailAccountStatus,
      } as unknown as never)
      .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Delete email account error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Change email password
 */
export async function changeEmailPassword(
  userId: string,
  newPassword: string
): Promise<EmailAccountResult> {
  const supabase = createServiceClient();

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('id', userId)
      .single();

    const user = userData as {
      email: string;
      company_id: string | null;
    } | null;

    if (!user?.company_id) {
      return { success: false, error: 'User not found' };
    }

    const { data: companyData } = await supabase
      .from('companies')
      .select('domain, cpanel_username')
      .eq('id', user.company_id)
      .single();

    const company = companyData as {
      domain: string | null;
      cpanel_username: string | null;
    } | null;

    if (!company?.cpanel_username || !company.domain) {
      return { success: false, error: 'Company not configured' };
    }

    // Change password in cPanel
    await whmClient.changeEmailPassword({
      cpanelUser: company.cpanel_username,
      email: user.email,
      password: newPassword,
      domain: company.domain,
    });

    return { success: true };
  } catch (error) {
    console.error('Change email password error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get email quota usage
 */
export async function getEmailQuotaUsage(userId: string): Promise<{
  used: number;
  quota: number;
  percentage: number;
} | null> {
  const supabase = createServiceClient();

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('id', userId)
      .single();

    const user = userData as {
      email: string;
      company_id: string | null;
    } | null;

    if (!user?.company_id) {
      return null;
    }

    const { data: companyData } = await supabase
      .from('companies')
      .select('domain, cpanel_username')
      .eq('id', user.company_id)
      .single();

    const company = companyData as {
      domain: string | null;
      cpanel_username: string | null;
    } | null;

    if (!company?.cpanel_username || !company.domain) {
      return null;
    }

    const result = await whmClient.getEmailQuota({
      cpanelUser: company.cpanel_username,
      email: user.email,
      domain: company.domain,
    });

    if (result.data) {
      const used = result.data.diskused || 0;
      const quota = result.data.diskquota || 1000;
      return {
        used,
        quota,
        percentage: Math.round((used / quota) * 100),
      };
    }

    return null;
  } catch (error) {
    console.error('Get email quota error:', error);
    return null;
  }
}

/**
 * Create email account - Simple version
 * Uses the main WHM account for all email accounts (임시 도메인 지원)
 */
export async function createEmailAccountSimple({
  userId,
  companyId,
  email,
  password,
}: CreateEmailParams): Promise<EmailAccountResult> {
  const supabase = createServiceClient();

  try {
    // Get company info
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('domain, use_temp_domain, temp_subdomain, cpanel_username')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Company fetch error:', companyError);
      return { success: false, error: 'Company not found' };
    }

    const company = companyData as {
      domain: string | null;
      use_temp_domain: boolean;
      temp_subdomain: string | null;
      cpanel_username: string | null;
    } | null;

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Determine which domain to use
    const domain = company.use_temp_domain && company.temp_subdomain
      ? company.temp_subdomain
      : company.domain;

    if (!domain) {
      return { success: false, error: 'No domain configured for company' };
    }

    // Use the main WHM account username from env
    const cpanelUser = process.env.WHM_USERNAME || 'mymakurv';

    console.log(`Creating email account: ${email} on domain ${domain} with cPanel user ${cpanelUser}`);

    // Create email account in cPanel
    const result = await whmClient.createEmailAccount({
      cpanelUser,
      email,
      password,
      quota: 1000, // 1GB
      domain,
    });

    console.log('WHM createEmailAccount result:', JSON.stringify(result, null, 2));

    // WHM cpanel API response format: { result: { status, errors, data, ... } }
    const apiResult = result.result || result;

    // Check for errors in the response
    if (apiResult.errors && apiResult.errors.length > 0) {
      return { success: false, error: apiResult.errors.join(', ') };
    }

    // Check status (0 = failure, 1 = success)
    if (apiResult.status === 0) {
      const errorMsg = apiResult.errors?.[0] || apiResult.statusmsg || 'Email creation failed';
      return { success: false, error: errorMsg };
    }

    // Update user with email account info
    const emailAccountId = email;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_account_id: emailAccountId,
        email_account_status: 'active' as EmailAccountStatus,
        email_quota_mb: 1000,
      } as unknown as never)
      .eq('id', userId);

    if (updateError) {
      console.error('User update error:', updateError);
      // Email was created but DB update failed - still consider it success
    }

    return { success: true, emailAccountId };
  } catch (error) {
    console.error('Create email account simple error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate DNS records for email
 */
export function generateEmailDNSRecords(domain: string, mailServer: string) {
  return [
    {
      type: 'MX',
      host: '@',
      value: mailServer,
      priority: 10,
      ttl: 3600,
    },
    {
      type: 'TXT',
      host: '@',
      value: `v=spf1 include:${mailServer} ~all`,
      ttl: 3600,
    },
    {
      type: 'TXT',
      host: '_dmarc',
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
      ttl: 3600,
    },
  ];
}
