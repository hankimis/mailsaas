import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { updateSubscriptionQuantity } from '@/lib/stripe/subscription';
import { deleteEmailAccount } from '@/lib/whm/email-service';
import type { User, Company } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single employee
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Get target employee
    const { data: employeeData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !employeeData) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = employeeData as User;

    // Check access
    const canAccess =
      currentUser.role === 'super_admin' ||
      currentUser.company_id === employee.company_id;

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: Update employee
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUserData } = await serviceClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const currentUser = currentUserData as Pick<User, 'role' | 'company_id'> | null;

    if (!currentUser || !['super_admin', 'company_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get target employee
    const { data: employeeData } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    const employee = employeeData as User | null;

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check company access
    if (currentUser.role !== 'super_admin' && currentUser.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Only allow updating certain fields
    const allowedFields = ['full_name', 'phone', 'role', 'is_active'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Update user
    const { error: updateError } = await serviceClient
      .from('users')
      .update(updateData as never)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: '직원 정보가 업데이트되었습니다',
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE: Delete employee
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUserData } = await serviceClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const currentUser = currentUserData as Pick<User, 'role' | 'company_id'> | null;

    if (!currentUser || !['super_admin', 'company_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can't delete yourself
    if (user.id === id) {
      return NextResponse.json(
        { error: '자신의 계정은 삭제할 수 없습니다' },
        { status: 400 }
      );
    }

    // Get target employee
    const { data: employeeData } = await serviceClient
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', id)
      .single();

    const employee = employeeData as (User & { company: Company | null }) | null;

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check company access
    if (currentUser.role !== 'super_admin' && currentUser.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can't delete super_admin
    if (employee.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Super Admin 계정은 삭제할 수 없습니다' },
        { status: 400 }
      );
    }

    // Delete email account if exists
    if (employee.email_account_id) {
      await deleteEmailAccount(id);
    }

    // Get company for updating counts
    const { data: companyData } = await serviceClient
      .from('companies')
      .select('current_seat_count, kakao_alert_user_count')
      .eq('id', employee.company_id!)
      .single();

    const company = companyData as Pick<Company, 'current_seat_count' | 'kakao_alert_user_count'> | null;

    // Delete notification settings
    await serviceClient
      .from('user_notification_settings')
      .delete()
      .eq('user_id', id);

    // Delete notifications
    await serviceClient
      .from('notifications')
      .delete()
      .eq('user_id', id);

    // Delete user record
    await serviceClient
      .from('users')
      .delete()
      .eq('id', id);

    // Delete auth user
    await serviceClient.auth.admin.deleteUser(id);

    // Update Stripe subscription quantities
    if (employee.company_id && company) {
      const newSeatCount = Math.max(0, company.current_seat_count - 1);
      await updateSubscriptionQuantity({
        companyId: employee.company_id,
        itemType: 'email_seat',
        quantity: newSeatCount,
      });

      if (employee.kakao_alert_enabled) {
        const newKakaoCount = Math.max(0, company.kakao_alert_user_count - 1);
        await updateSubscriptionQuantity({
          companyId: employee.company_id,
          itemType: 'kakao_alert',
          quantity: newKakaoCount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '직원이 삭제되었습니다',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
