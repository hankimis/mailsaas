import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import jwt from 'jsonwebtoken';

interface UserData {
  email: string;
  email_account_status: string | null;
  email_password_encrypted: string | null;
  company_id: string | null;
}

// GET: Get webmail auto-login credentials
export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data including encrypted password
    const { data: userDataRaw, error: userError } = await serviceClient
      .from('users')
      .select('email, email_account_status, email_password_encrypted, company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userDataRaw) {
      return NextResponse.json({ error: '사용자 정보를 가져올 수 없습니다' }, { status: 500 });
    }

    const userData = userDataRaw as UserData;

    if (userData.email_account_status !== 'active') {
      return NextResponse.json(
        { error: '이메일 계정이 활성화되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Check if we have stored password for auto-login
    if (!userData.email_password_encrypted) {
      // No stored password - redirect to manual login
      const webmailHost = process.env.WHM_HOST || 'host51.registrar-servers.com';
      return NextResponse.json({
        success: true,
        url: `https://${webmailHost}:2096/`,
        autoLogin: false,
        message: '자동 로그인 정보가 없습니다. 직접 로그인해주세요.',
      });
    }

    // Decrypt password and create a short-lived token for auto-login page
    try {
      const password = decrypt(userData.email_password_encrypted);

      // Create a JWT token with credentials (expires in 30 seconds)
      const jwtSecret = process.env.EMAIL_ENCRYPTION_KEY || 'fallback-secret';
      const token = jwt.sign(
        {
          email: userData.email,
          password: password,
          exp: Math.floor(Date.now() / 1000) + 30, // 30 seconds
        },
        jwtSecret
      );

      // Update last webmail login timestamp
      await serviceClient
        .from('users')
        .update({ last_webmail_login: new Date().toISOString() } as never)
        .eq('id', user.id);

      // Return URL to our auto-login page with token
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.json({
        success: true,
        url: `${baseUrl}/webmail-login?token=${token}`,
        autoLogin: true,
      });
    } catch {
      // Decryption failed - redirect to manual login
      const webmailHost = process.env.WHM_HOST || 'host51.registrar-servers.com';
      return NextResponse.json({
        success: true,
        url: `https://${webmailHost}:2096/`,
        autoLogin: false,
        message: '자동 로그인을 사용할 수 없습니다.',
      });
    }
  } catch {
    const webmailHost = process.env.WHM_HOST || 'host51.registrar-servers.com';
    return NextResponse.json({
      success: true,
      url: `https://${webmailHost}:2096/`,
      autoLogin: false,
    });
  }
}
