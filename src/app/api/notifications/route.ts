import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Notification } from '@/types/database';

// GET: Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: '알림을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body as {
      notificationIds?: string[];
      markAll?: boolean;
    };

    if (markAll) {
      // Mark all notifications as read
      const { error } = await serviceClient
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        } as unknown as never)
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: '모든 알림을 읽음으로 표시했습니다',
      });
    }

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const { error } = await serviceClient
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        } as unknown as never)
        .eq('user_id', user.id)
        .in('id', notificationIds);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: '선택한 알림을 읽음으로 표시했습니다',
      });
    }

    return NextResponse.json(
      { error: '알림 ID 또는 markAll이 필요합니다' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { error: '알림 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
