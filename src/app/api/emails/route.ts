import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createEmailAccountSimple } from '@/lib/whm/email-service';
import { encrypt } from '@/lib/crypto';

interface UserData {
  company_id: string | null;
  email: string;
  email_account_status: string | null;
}

// POST: Create/Provision email account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body as { password: string };

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    // Get user data with service client (bypasses RLS)
    const { data: userDataRaw, error: userError } = await serviceClient
      .from('users')
      .select('company_id, email, email_account_status')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      return NextResponse.json({ error: '사용자 정보를 가져올 수 없습니다' }, { status: 500 });
    }

    const userData = userDataRaw as UserData | null;

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (userData.email_account_status === 'active') {
      return NextResponse.json(
        { error: '이미 이메일 계정이 활성화되어 있습니다' },
        { status: 400 }
      );
    }

    // Create email account via WHM
    const emailResult = await createEmailAccountSimple({
      userId: user.id,
      companyId: userData.company_id,
      email: userData.email,
      password,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || '이메일 계정 생성 실패' },
        { status: 500 }
      );
    }

    // Save encrypted password for SSO auto-login
    try {
      const encryptedPassword = encrypt(password);
      await serviceClient
        .from('users')
        .update({ email_password_encrypted: encryptedPassword } as never)
        .eq('id', user.id);
    } catch {
      // Password encryption failed, but email account was created
      // User can still login manually
    }

    return NextResponse.json({
      success: true,
      message: '이메일 계정이 생성되었습니다.',
    });
  } catch (error) {
    console.error('Create email account error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
