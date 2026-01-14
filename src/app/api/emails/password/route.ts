import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { changeEmailPassword } from '@/lib/whm/email-service';
import { encrypt } from '@/lib/crypto';

// PATCH: Change email password
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body as { newPassword: string };

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    // Change password
    const result = await changeEmailPassword(user.id, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '비밀번호 변경 실패' },
        { status: 500 }
      );
    }

    // Update encrypted password for SSO auto-login
    try {
      const serviceClient = createServiceClient();
      const encryptedPassword = encrypt(newPassword);
      await serviceClient
        .from('users')
        .update({ email_password_encrypted: encryptedPassword } as never)
        .eq('id', user.id);
    } catch {
      // Password encryption failed, but password was changed
    }

    return NextResponse.json({
      success: true,
      message: '이메일 비밀번호가 변경되었습니다.',
    });
  } catch (error) {
    console.error('Change email password error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
