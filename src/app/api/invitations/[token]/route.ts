import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { updateSubscriptionQuantity } from '@/lib/stripe/subscription';
import { addEmailProvisioningJob } from '@/lib/bullmq/queues';
import type { EmployeeInvitation, Company } from '@/types/database';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET: Get invitation by token (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const serviceClient = createServiceClient();

    const { data: invitationData, error } = await serviceClient
      .from('employee_invitations')
      .select('*, company:companies(*)')
      .eq('token', token)
      .single();

    if (error || !invitationData) {
      return NextResponse.json(
        { error: '유효하지 않은 초대입니다' },
        { status: 404 }
      );
    }

    const invitation = invitationData as EmployeeInvitation & { company: Company };

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await serviceClient
        .from('employee_invitations')
        .update({ status: 'expired' } as unknown as never)
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: '초대가 만료되었습니다. 관리자에게 새 초대를 요청하세요.' },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: '이미 등록이 완료된 초대입니다' },
        { status: 409 }
      );
    }

    // Check if cancelled
    if (invitation.status === 'cancelled') {
      return NextResponse.json(
        { error: '취소된 초대입니다' },
        { status: 410 }
      );
    }

    // Return invitation info (without sensitive data)
    return NextResponse.json({
      invitation: {
        email: invitation.email,
        full_name: invitation.full_name,
        company_name: invitation.company.name,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: Accept invitation and create account
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const serviceClient = createServiceClient();

    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    // Get invitation with company
    const { data: invitationData, error: inviteError } = await serviceClient
      .from('employee_invitations')
      .select('*, company:companies(*)')
      .eq('token', token)
      .single();

    if (inviteError || !invitationData) {
      return NextResponse.json(
        { error: '유효하지 않은 초대입니다' },
        { status: 404 }
      );
    }

    const invitation = invitationData as EmployeeInvitation & { company: Company };

    // Validate invitation
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '초대가 만료되었습니다' },
        { status: 410 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 초대입니다' },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      phone: invitation.phone,
      phone_confirm: true, // Phone already verified via KakaoTalk
      user_metadata: {
        full_name: invitation.full_name,
      },
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: '계정 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // Create user record
    const { data: newUser, error: userError } = await serviceClient
      .from('users')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        full_name: invitation.full_name,
        phone: invitation.phone,
        phone_verified: true, // Verified via KakaoTalk
        phone_verified_at: new Date().toISOString(),
        role: invitation.role,
        company_id: invitation.company_id,
        kakao_alert_enabled: invitation.kakao_alert_enabled,
        kakao_alert_consent: invitation.kakao_alert_enabled,
        kakao_alert_consent_at: invitation.kakao_alert_enabled ? new Date().toISOString() : null,
        is_active: true,
      } as unknown as never)
      .select()
      .single();

    if (userError || !newUser) {
      console.error('User record creation error:', userError);
      // Rollback auth user
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: '사용자 정보 저장에 실패했습니다' },
        { status: 500 }
      );
    }

    // Create notification settings
    await serviceClient.from('user_notification_settings').insert({
      user_id: authData.user.id,
    } as unknown as never);

    // Update invitation status
    await serviceClient
      .from('employee_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', invitation.id);

    // Update company seat count
    const newSeatCount = invitation.company.current_seat_count + 1;
    await serviceClient
      .from('companies')
      .update({
        current_seat_count: newSeatCount,
      } as unknown as never)
      .eq('id', invitation.company_id);

    // Update Stripe subscription
    await updateSubscriptionQuantity({
      companyId: invitation.company_id,
      itemType: 'email_seat',
      quantity: newSeatCount,
    });

    // If Kakao alert enabled, update that count too
    if (invitation.kakao_alert_enabled) {
      const newKakaoCount = invitation.company.kakao_alert_user_count + 1;
      await serviceClient
        .from('companies')
        .update({
          kakao_alert_user_count: newKakaoCount,
        } as unknown as never)
        .eq('id', invitation.company_id);

      await updateSubscriptionQuantity({
        companyId: invitation.company_id,
        itemType: 'kakao_alert',
        quantity: newKakaoCount,
      });
    }

    // Queue email account provisioning
    const domain = invitation.company.use_temp_domain
      ? invitation.company.temp_subdomain
      : invitation.company.domain;

    if (domain) {
      await addEmailProvisioningJob({
        userId: authData.user.id,
        companyId: invitation.company_id,
        email: invitation.email,
        password, // Use the password they just set
      });
    }

    return NextResponse.json({
      success: true,
      message: '계정이 성공적으로 생성되었습니다. 이제 로그인할 수 있습니다.',
      user: {
        email: invitation.email,
        full_name: invitation.full_name,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel invitation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const serviceClient = createServiceClient();

    // Update status to cancelled
    const { error } = await serviceClient
      .from('employee_invitations')
      .update({ status: 'cancelled' } as unknown as never)
      .eq('token', token);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: '초대가 취소되었습니다',
    });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
