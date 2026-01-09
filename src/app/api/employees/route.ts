import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { updateSubscriptionQuantity } from '@/lib/stripe/subscription';
import { addEmailProvisioningJob } from '@/lib/bullmq/queues';
import { v4 as uuidv4 } from 'uuid';
import type { User, Company } from '@/types/database';

interface CreateEmployeeBody {
  email: string;
  full_name: string;
  phone?: string;
  role: 'employee' | 'company_admin';
  company_id: string;
  kakao_alert_enabled?: boolean;
}

export async function POST(request: NextRequest) {
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

    const body: CreateEmployeeBody = await request.json();

    // Validate company access
    if (currentUser.role !== 'super_admin' && currentUser.company_id !== body.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if email already exists
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', body.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다' },
        { status: 400 }
      );
    }

    // Get company info
    const { data: companyData } = await serviceClient
      .from('companies')
      .select('*')
      .eq('id', body.company_id)
      .single();

    const company = companyData as Company | null;

    if (!company) {
      return NextResponse.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Create auth user with random password (user will reset)
    const tempPassword = uuidv4();
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
      },
    });

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    // Create user record
    const { data: newUser, error: userError } = await serviceClient
      .from('users')
      .insert({
        id: authData.user.id,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone || null,
        role: body.role,
        company_id: body.company_id,
        kakao_alert_enabled: body.kakao_alert_enabled || false,
        is_active: true,
      } as unknown as never)
      .select()
      .single();

    if (userError || !newUser) {
      console.error('User record creation error:', userError);
      // Rollback auth user
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: '사용자 레코드 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    const typedNewUser = newUser as User;

    // Create notification settings
    await serviceClient.from('user_notification_settings').insert({
      user_id: typedNewUser.id,
    } as unknown as never);

    // Update Stripe subscription quantity
    const newSeatCount = company.current_seat_count + 1;
    await updateSubscriptionQuantity({
      companyId: body.company_id,
      itemType: 'email_seat',
      quantity: newSeatCount,
    });

    // If Kakao alert enabled, update that too
    if (body.kakao_alert_enabled) {
      const newKakaoCount = company.kakao_alert_user_count + 1;
      await updateSubscriptionQuantity({
        companyId: body.company_id,
        itemType: 'kakao_alert',
        quantity: newKakaoCount,
      });
    }

    // Queue email account provisioning
    const domain = company.use_temp_domain
      ? company.temp_subdomain
      : company.domain;

    if (domain) {
      await addEmailProvisioningJob({
        userId: typedNewUser.id,
        companyId: body.company_id,
        email: body.email,
        password: tempPassword, // Will be changed on first login
      });
    }

    // Send password reset email
    await serviceClient.auth.admin.generateLink({
      type: 'recovery',
      email: body.email,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: typedNewUser.id,
        email: typedNewUser.email,
        full_name: typedNewUser.full_name,
        role: typedNewUser.role,
      },
      message: '직원이 추가되었습니다. 초대 이메일이 발송됩니다.',
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// GET: List employees
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

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query based on role
    let query = supabase.from('users').select('*');

    if (currentUser.role === 'super_admin') {
      // Super admin can see all users
      const { searchParams } = new URL(request.url);
      const companyId = searchParams.get('company_id');
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
    } else if (currentUser.role === 'company_admin') {
      // Company admin can only see their company's users
      if (currentUser.company_id) {
        query = query.eq('company_id', currentUser.company_id);
      }
    } else {
      // Regular employees can't list users
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: employees, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('List employees error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
