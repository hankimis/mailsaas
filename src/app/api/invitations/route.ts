import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { solapiClient } from '@/lib/solapi/client';
import { KAKAO_TEMPLATES, buildEmployeeInviteVariables } from '@/lib/solapi/templates';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import crypto from 'crypto';
import type { User, Company, EmployeeInvitation } from '@/types/database';

interface CreateInvitationBody {
  email: string;
  full_name: string;
  phone: string;
  role: 'employee' | 'company_admin';
  company_id: string;
  kakao_alert_enabled: boolean;
}

// POST: Create invitation and send KakaoTalk
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = rateLimit(`invitation:${clientIP}`, RATE_LIMITS.invitation);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's role
    const { data: currentUserData } = await serviceClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const currentUser = currentUserData as Pick<User, 'role' | 'company_id'> | null;

    if (!currentUser || !['super_admin', 'company_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateInvitationBody = await request.json();

    // Validate company access
    if (currentUser.role !== 'super_admin' && currentUser.company_id !== body.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get company info
    const { data: companyData } = await serviceClient
      .from('companies')
      .select('*')
      .eq('id', body.company_id)
      .single();

    const company = companyData as Company | null;

    if (!company) {
      return NextResponse.json({ error: '회사를 찾을 수 없습니다' }, { status: 404 });
    }

    // Construct full email
    const domain = company.use_temp_domain ? company.temp_subdomain : company.domain;
    const fullEmail = body.email.includes('@') ? body.email : `${body.email}@${domain}`;

    // Check if email already exists in users
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', fullEmail)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await serviceClient
      .from('employee_invitations')
      .select('id, status')
      .eq('email', fullEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: '이미 초대가 발송된 이메일입니다' },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const { data: invitation, error: inviteError } = await serviceClient
      .from('employee_invitations')
      .insert({
        token,
        email: fullEmail,
        full_name: body.full_name,
        phone: body.phone.replace(/-/g, ''),
        role: body.role,
        company_id: body.company_id,
        invited_by: user.id,
        kakao_alert_enabled: body.kakao_alert_enabled,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      } as unknown as never)
      .select()
      .single();

    if (inviteError || !invitation) {
      console.error('Invitation creation error:', inviteError);
      return NextResponse.json(
        { error: '초대 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    const typedInvitation = invitation as EmployeeInvitation;

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mymailtalk.com';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send KakaoTalk invitation
    const kakaoResult = await solapiClient.sendAlimTalk({
      to: body.phone,
      templateId: KAKAO_TEMPLATES.EMPLOYEE_INVITE,
      variables: buildEmployeeInviteVariables({
        employeeName: body.full_name,
        companyName: company.name,
        email: fullEmail,
        inviteUrl,
        expireDate: expiresAt.toLocaleDateString('ko-KR'),
      }),
    });

    // Update invitation with kakao status
    await serviceClient
      .from('employee_invitations')
      .update({
        kakao_sent_at: new Date().toISOString(),
        kakao_delivery_status: kakaoResult.success ? 'sent' : 'failed',
      } as unknown as never)
      .eq('id', typedInvitation.id);

    return NextResponse.json({
      success: true,
      invitation: {
        id: typedInvitation.id,
        email: fullEmail,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      },
      kakao: {
        success: kakaoResult.success,
        error: kakaoResult.error,
      },
      message: kakaoResult.success
        ? '초대 링크가 카카오톡으로 발송되었습니다'
        : '초대가 생성되었지만 카카오톡 발송에 실패했습니다. 링크를 직접 공유해주세요.',
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// GET: List invitations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUserData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const currentUser = currentUserData as Pick<User, 'role' | 'company_id'> | null;

    if (!currentUser || !['super_admin', 'company_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id') || currentUser.company_id;

    let query = supabase
      .from('employee_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (currentUser.role !== 'super_admin') {
      query = query.eq('company_id', currentUser.company_id!);
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: invitations, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('List invitations error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
