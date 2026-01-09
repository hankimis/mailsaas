import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateEmailDNSRecords } from '@/lib/whm/email-service';
import type { Company, DomainManagementType } from '@/types/database';

interface UserData {
  company_id: string | null;
  role: string;
}

// GET: Get domain info for current company
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userDataRaw } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    const userData = userDataRaw as UserData | null;

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single();

    const { data: dnsRecords } = await supabase
      .from('dns_records')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('record_type');

    return NextResponse.json({
      company,
      dnsRecords: dnsRecords || [],
    });
  } catch (error) {
    console.error('Get domain error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: Update domain settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userDataRaw } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    const userData = userDataRaw as UserData | null;

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Only admins can change domain
    if (!['super_admin', 'company_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { domain, domain_management_type } = body as {
      domain?: string;
      domain_management_type?: DomainManagementType;
    };

    // Validate domain format
    if (domain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain)) {
        return NextResponse.json(
          { error: '올바른 도메인 형식이 아닙니다 (예: example.com)' },
          { status: 400 }
        );
      }

      // Check if domain is already in use
      const { data: existingDomain } = await serviceClient
        .from('companies')
        .select('id')
        .eq('domain', domain)
        .neq('id', userData.company_id)
        .single();

      if (existingDomain) {
        return NextResponse.json(
          { error: '이미 사용 중인 도메인입니다' },
          { status: 400 }
        );
      }
    }

    // Get current company data
    const { data: companyData } = await serviceClient
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single();

    const company = companyData as Company | null;

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Determine update values
    const useTempDomain = domain_management_type === 'no_domain';
    const updateData: Record<string, unknown> = {};

    if (domain !== undefined) {
      updateData.domain = domain || null;
    }

    if (domain_management_type !== undefined) {
      updateData.domain_management_type = domain_management_type;
      updateData.use_temp_domain = useTempDomain;

      if (useTempDomain) {
        // Generate temp subdomain if not exists
        if (!company.temp_subdomain) {
          updateData.temp_subdomain = `${company.slug}.${process.env.TEMP_DOMAIN_SUFFIX || 'ourmail.co'}`;
        }
        updateData.domain_status = 'verified'; // Temp domain is pre-verified
      } else {
        updateData.domain_status = 'dns_pending';
      }
    }

    // If domain changed and not temp domain, reset verification
    if (domain && domain !== company.domain && !useTempDomain) {
      updateData.domain_status = 'dns_pending';
      updateData.domain_verified_at = null;
    }

    // Update company
    const { error: updateError } = await serviceClient
      .from('companies')
      .update(updateData as never)
      .eq('id', userData.company_id);

    if (updateError) {
      throw updateError;
    }

    // Generate DNS records for new domain
    if (domain && domain !== company.domain) {
      // Delete old DNS records
      await serviceClient
        .from('dns_records')
        .delete()
        .eq('company_id', userData.company_id);

      // Create new DNS records
      const mailServer = process.env.WHM_HOST || 'mail.mymailtalk.com';
      const dnsRecords = generateEmailDNSRecords(domain, mailServer);

      for (const record of dnsRecords) {
        await serviceClient.from('dns_records').insert({
          company_id: userData.company_id,
          record_type: record.type,
          host: record.host,
          value: record.value,
          priority: record.priority || null,
          ttl: record.ttl,
          is_verified: false,
        } as unknown as never);
      }
    }

    // Fetch updated data
    const { data: updatedCompany } = await serviceClient
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single();

    const { data: updatedDnsRecords } = await serviceClient
      .from('dns_records')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('record_type');

    return NextResponse.json({
      success: true,
      message: '도메인 설정이 업데이트되었습니다',
      company: updatedCompany,
      dnsRecords: updatedDnsRecords || [],
    });
  } catch (error) {
    console.error('Update domain error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
