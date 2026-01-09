import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import dns from 'dns';
import { promisify } from 'util';
import type { Company, DnsRecord } from '@/types/database';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

interface UserData {
  company_id: string | null;
  role: string;
}

// POST: Trigger DNS verification
export async function POST() {
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

    // Only admins can verify
    if (!['super_admin', 'company_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company and DNS records
    const { data: companyData } = await serviceClient
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single();

    const company = companyData as Company | null;

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!company.domain) {
      return NextResponse.json(
        { error: '도메인이 설정되어 있지 않습니다' },
        { status: 400 }
      );
    }

    if (company.use_temp_domain) {
      return NextResponse.json(
        { error: '임시 도메인은 검증이 필요하지 않습니다' },
        { status: 400 }
      );
    }

    const { data: dnsRecordsData } = await serviceClient
      .from('dns_records')
      .select('*')
      .eq('company_id', userData.company_id);

    const dnsRecords = (dnsRecordsData || []) as DnsRecord[];

    // Verify each DNS record
    const verificationResults: {
      record_type: string;
      host: string;
      verified: boolean;
      found_value?: string;
      error?: string;
    }[] = [];

    for (const record of dnsRecords) {
      const result = await verifyDnsRecord(company.domain, record);
      verificationResults.push(result);

      // Update record verification status
      await serviceClient
        .from('dns_records')
        .update({
          is_verified: result.verified,
          last_checked_at: new Date().toISOString(),
        } as unknown as never)
        .eq('id', record.id);
    }

    // Check if all required records are verified
    const allVerified = verificationResults.every(r => r.verified);

    // Update company domain status
    if (allVerified) {
      await serviceClient
        .from('companies')
        .update({
          domain_status: 'verified',
          domain_verified_at: new Date().toISOString(),
        } as unknown as never)
        .eq('id', userData.company_id);
    }

    // Fetch updated records
    const { data: updatedRecords } = await serviceClient
      .from('dns_records')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('record_type');

    return NextResponse.json({
      success: true,
      allVerified,
      results: verificationResults,
      dnsRecords: updatedRecords,
      message: allVerified
        ? '모든 DNS 레코드가 확인되었습니다!'
        : '일부 DNS 레코드가 아직 확인되지 않았습니다. DNS 전파에 최대 48시간이 소요될 수 있습니다.',
    });
  } catch (error) {
    console.error('DNS verification error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

async function verifyDnsRecord(
  domain: string,
  record: DnsRecord
): Promise<{
  record_type: string;
  host: string;
  verified: boolean;
  found_value?: string;
  error?: string;
}> {
  const hostname = record.host === '@' ? domain : `${record.host}.${domain}`;

  try {
    switch (record.record_type) {
      case 'MX': {
        const mxRecords = await resolveMx(hostname);
        const found = mxRecords.some(mx =>
          mx.exchange.toLowerCase().includes(record.value.toLowerCase()) ||
          record.value.toLowerCase().includes(mx.exchange.toLowerCase())
        );
        return {
          record_type: record.record_type,
          host: record.host,
          verified: found,
          found_value: mxRecords.map(mx => `${mx.priority} ${mx.exchange}`).join(', '),
        };
      }

      case 'TXT': {
        const txtRecords = await resolveTxt(hostname);
        const flatRecords = txtRecords.map(r => r.join(''));
        const found = flatRecords.some(txt =>
          txt.toLowerCase().includes(record.value.toLowerCase().substring(0, 20)) // Check partial match for SPF/DMARC
        );
        return {
          record_type: record.record_type,
          host: record.host,
          verified: found,
          found_value: flatRecords.join('; '),
        };
      }

      case 'CNAME': {
        const cnameRecords = await resolveCname(hostname);
        const found = cnameRecords.some(cname =>
          cname.toLowerCase().includes(record.value.toLowerCase()) ||
          record.value.toLowerCase().includes(cname.toLowerCase())
        );
        return {
          record_type: record.record_type,
          host: record.host,
          verified: found,
          found_value: cnameRecords.join(', '),
        };
      }

      default:
        return {
          record_type: record.record_type,
          host: record.host,
          verified: false,
          error: 'Unsupported record type',
        };
    }
  } catch (error) {
    const dnsError = error as { code?: string };
    return {
      record_type: record.record_type,
      host: record.host,
      verified: false,
      error: dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND'
        ? '레코드를 찾을 수 없습니다'
        : '확인 중 오류 발생',
    };
  }
}
