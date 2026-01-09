'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Mail,
  CreditCard,
  MessageSquare,
  Settings,
  Check,
  Trash2,
} from 'lucide-react';
import { getClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Notification, UserNotificationSettings } from '@/types/database';

export default function NotificationsPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<UserNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchData = useCallback(async () => {
    if (!sessionUser?.id) return;

    const supabase = getClient();

    try {
      // Fetch notifications
      const { data: notificationData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', sessionUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationData) {
        setNotifications(notificationData);
      }

      // Fetch notification settings
      const { data: settingsData } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', sessionUser.id)
        .single();

      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionUser?.id]);

  useEffect(() => {
    if (sessionUser) {
      fetchData();
    }
  }, [sessionUser, fetchData]);

  const handleMarkAsRead = async (notificationId: string) => {
    const supabase = getClient();

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as unknown as never)
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('알림 읽음 처리에 실패했습니다');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!sessionUser?.id) return;

    const supabase = getClient();

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as unknown as never)
        .eq('user_id', sessionUser.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('모든 알림을 읽음 처리했습니다');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('알림 읽음 처리에 실패했습니다');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const supabase = getClient();

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('알림이 삭제되었습니다');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('알림 삭제에 실패했습니다');
    }
  };

  const handleSettingChange = async (key: string, value: boolean) => {
    if (!sessionUser?.id) return;

    const supabase = getClient();

    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: sessionUser.id,
          [key]: value,
        } as unknown as never);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, [key]: value } : null);
      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('설정 저장에 실패했습니다');
    }
  };

  if (authLoading || isLoading) {
    return <NotificationsSkeleton />;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_email':
        return <Mail className="h-4 w-4" />;
      case 'payment_success':
      case 'payment_failed':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_email':
        return 'bg-blue-100 text-blue-600';
      case 'payment_success':
        return 'bg-green-100 text-green-600';
      case 'payment_failed':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'email') return n.type === 'new_email';
    if (activeTab === 'payment') return n.type.includes('payment');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">알림</h1>
          <p className="text-muted-foreground">
            알림을 확인하고 설정을 관리하세요.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            모두 읽음
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            전체
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            읽지 않음
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-primary">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="email">이메일</TabsTrigger>
          <TabsTrigger value="payment">결제</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>알림 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">알림이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div
                        className={`rounded-full p-2 ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          {!notification.is_read && (
                            <Badge className="bg-primary text-primary-foreground">
                              새 알림
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>알림 설정</CardTitle>
          </div>
          <CardDescription>
            각 알림 유형별로 수신 방법을 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <h4 className="font-medium">새 메일 알림</h4>
            </div>
            <div className="grid gap-4 pl-6 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-email-web">웹 알림</Label>
                <Switch
                  id="new-email-web"
                  checked={settings?.new_email_web ?? true}
                  onCheckedChange={v => handleSettingChange('new_email_web', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="new-email-email">이메일</Label>
                <Switch
                  id="new-email-email"
                  checked={settings?.new_email_email ?? false}
                  onCheckedChange={v => handleSettingChange('new_email_email', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="new-email-kakao">카카오톡</Label>
                  <Badge variant="outline" className="text-xs">
                    +$2/월
                  </Badge>
                </div>
                <Switch
                  id="new-email-kakao"
                  checked={settings?.new_email_kakao ?? false}
                  onCheckedChange={v => handleSettingChange('new_email_kakao', v)}
                  disabled={!sessionUser?.kakao_alert_enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <h4 className="font-medium">결제 알림</h4>
            </div>
            <div className="grid gap-4 pl-6 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-web">웹 알림</Label>
                <Switch
                  id="payment-web"
                  checked={settings?.payment_web ?? true}
                  onCheckedChange={v => handleSettingChange('payment_web', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-email">이메일</Label>
                <Switch
                  id="payment-email"
                  checked={settings?.payment_email ?? true}
                  onCheckedChange={v => handleSettingChange('payment_email', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-kakao">카카오톡</Label>
                <Switch
                  id="payment-kakao"
                  checked={settings?.payment_kakao ?? false}
                  onCheckedChange={v => handleSettingChange('payment_kakao', v)}
                  disabled={!sessionUser?.kakao_alert_enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* System Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <h4 className="font-medium">시스템 알림</h4>
            </div>
            <div className="grid gap-4 pl-6 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="system-web">웹 알림</Label>
                <Switch
                  id="system-web"
                  checked={settings?.system_web ?? true}
                  onCheckedChange={v => handleSettingChange('system_web', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="system-email">이메일</Label>
                <Switch
                  id="system-email"
                  checked={settings?.system_email ?? true}
                  onCheckedChange={v => handleSettingChange('system_email', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="system-kakao">카카오톡</Label>
                <Switch
                  id="system-kakao"
                  checked={settings?.system_kakao ?? false}
                  onCheckedChange={v => handleSettingChange('system_kakao', v)}
                  disabled={!sessionUser?.kakao_alert_enabled}
                />
              </div>
            </div>
          </div>

          {!sessionUser?.kakao_alert_enabled && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium">카카오 알림 활성화 필요</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                카카오톡 알림을 받으려면 직원 관리에서 카카오 알림을 활성화하세요.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <Skeleton className="h-10 w-96" />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
