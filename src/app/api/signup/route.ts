import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createStripeCustomer, createSubscription } from '@/lib/stripe/subscription';
import { addDNSVerificationJob, addEmailProvisioningJob } from '@/lib/bullmq/queues';
import { generateEmailDNSRecords } from '@/lib/whm/email-service';
import type { DomainManagementType } from '@/types/database';

interface SignupRequestBody {
  user_id: string;
  company_name: string;
  company_slug: string;
  domain: string | null;
  domain_management_type: DomainManagementType;
  admin_email: string;
  admin_name: string;
  admin_phone?: string;
  agency_name?: string;
  agency_email?: string;
  agency_phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequestBody = await request.json();
    const supabase = createServiceClient();

    // Validate required fields
    if (!body.user_id || !body.company_name || !body.company_slug || !body.domain_management_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if company slug is unique
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', body.company_slug)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: '이미 사용 중인 회사 ID입니다' },
        { status: 400 }
      );
    }

    // Determine domain settings
    const useTempDomain = body.domain_management_type === 'no_domain';
    const tempSubdomain = useTempDomain
      ? `${body.company_slug}.${process.env.TEMP_DOMAIN_SUFFIX || 'ourmail.co'}`
      : null;
    const domainStatus = body.domain_management_type === 'self_managed'
      ? 'pending'
      : body.domain_management_type === 'agency_managed'
      ? 'dns_pending'
      : 'verified'; // no_domain uses temp domain which is pre-verified

    // Create company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: body.company_name,
        slug: body.company_slug,
        domain: body.domain || null,
        domain_management_type: body.domain_management_type,
        domain_status: domainStatus,
        temp_subdomain: tempSubdomain,
        use_temp_domain: useTempDomain,
        contact_email: body.admin_email,
        contact_phone: body.admin_phone || null,
        status: 'pending_setup',
        current_seat_count: 1,
      } as unknown as never)
      .select()
      .single();

    const company = companyData as { id: string } | null;

    if (companyError || !company) {
      console.error('Company creation error:', companyError);
      return NextResponse.json(
        { error: '회사 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // Create user record
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: body.user_id,
        email: body.admin_email,
        full_name: body.admin_name,
        phone: body.admin_phone || null,
        role: 'company_admin',
        company_id: company.id,
        is_active: true,
      } as unknown as never);

    if (userError) {
      console.error('User creation error:', userError);
      // Rollback company creation
      await supabase.from('companies').delete().eq('id', company.id);
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // Create notification settings for user
    await supabase.from('user_notification_settings').insert({
      user_id: body.user_id,
    } as unknown as never);

    // Create Stripe customer
    let stripeCustomerId: string | null = null;
    try {
      stripeCustomerId = await createStripeCustomer(
        company.id,
        body.admin_email,
        body.company_name
      );
    } catch (stripeError) {
      console.error('Stripe customer creation error:', stripeError);
      // Continue without Stripe - can be set up later
    }

    // Create DNS records if domain provided
    if (body.domain) {
      const mailServer = process.env.WHM_HOST || 'mail.ourmail.co';
      const dnsRecords = generateEmailDNSRecords(body.domain, mailServer);

      for (const record of dnsRecords) {
        await supabase.from('dns_records').insert({
          company_id: company.id,
          record_type: record.type,
          host: record.host,
          value: record.value,
          priority: record.priority || null,
          ttl: record.ttl,
        } as unknown as never);
      }

      // Start DNS verification job
      if (body.domain_management_type !== 'no_domain') {
        try {
          await addDNSVerificationJob({
            companyId: company.id,
            domain: body.domain,
          });
        } catch (jobError) {
          console.error('DNS verification job error:', jobError);
          // Continue - DNS verification can be triggered later
        }
      }
    }

    // Create DNS request for agency-managed domains
    if (body.domain_management_type === 'agency_managed') {
      await supabase.from('dns_requests').insert({
        company_id: company.id,
        agency_name: body.agency_name || null,
        agency_email: body.agency_email || null,
        agency_phone: body.agency_phone || null,
        status: 'pending',
      } as unknown as never);
    }

    return NextResponse.json({
      success: true,
      company_id: company.id,
      stripe_customer_id: stripeCustomerId,
      message: '회사가 생성되었습니다',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
