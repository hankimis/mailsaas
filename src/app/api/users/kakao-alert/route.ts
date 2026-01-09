import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { toggleKakaoAlert } from '@/lib/stripe/subscription';

interface KakaoAlertBody {
  userId: string;
  enabled: boolean;
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: KakaoAlertBody = await request.json();

    // Get current user's role
    const { data: currentUserData } = await serviceClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const currentUser = currentUserData as { role: string; company_id: string | null } | null;

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get target user
    const { data: targetUserData } = await serviceClient
      .from('users')
      .select('id, company_id, phone, phone_verified, kakao_alert_enabled')
      .eq('id', body.userId)
      .single();

    const targetUser = targetUserData as {
      id: string;
      company_id: string | null;
      phone: string | null;
      phone_verified: boolean;
      kakao_alert_enabled: boolean;
    } | null;

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check permissions
    const canToggle =
      currentUser.role === 'super_admin' ||
      (currentUser.role === 'company_admin' &&
        currentUser.company_id === targetUser.company_id) ||
      user.id === body.userId; // Users can toggle their own

    if (!canToggle) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if enabling and phone not verified
    if (body.enabled && !targetUser.phone_verified) {
      return NextResponse.json(
        { error: '카카오 알림을 활성화하려면 휴대폰 인증이 필요합니다' },
        { status: 400 }
      );
    }

    if (body.enabled && !targetUser.phone) {
      return NextResponse.json(
        { error: '휴대폰 번호를 먼저 등록해주세요' },
        { status: 400 }
      );
    }

    // Toggle Kakao alert (this also updates Stripe)
    const result = await toggleKakaoAlert({
      userId: body.userId,
      companyId: targetUser.company_id!,
      enabled: body.enabled,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to toggle Kakao alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enabled: body.enabled,
      message: body.enabled
        ? '카카오 알림이 활성화되었습니다'
        : '카카오 알림이 비활성화되었습니다',
    });
  } catch (error) {
    console.error('Toggle Kakao alert error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
