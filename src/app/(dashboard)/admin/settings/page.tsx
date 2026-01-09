'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  Settings,
  Server,
  Mail,
  CreditCard,
  MessageSquare,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { getClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { AdminSetting } from '@/types/database';

interface SystemSettings {
  maintenance_mode: boolean;
  signup_enabled: boolean;
  max_seats_per_company: number;
  default_email_quota_mb: number;
  temp_domain_suffix: string;
  stripe_enabled: boolean;
  kakao_enabled: boolean;
  whm_server_url: string;
}

const defaultSettings: SystemSettings = {
  maintenance_mode: false,
  signup_enabled: true,
  max_seats_per_company: 100,
  default_email_quota_mb: 1000,
  temp_domain_suffix: 'ourmail.co',
  stripe_enabled: true,
  kakao_enabled: true,
  whm_server_url: '',
};

export default function AdminSettingsPage() {
  const { sessionUser, isLoading: authLoading, isSuperAdmin } = useAuthContext();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!sessionUser || !isSuperAdmin()) return;

      const supabase = getClient();

      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('*');

        if (data) {
          const settingsMap: Record<string, unknown> = {};
          data.forEach((item: AdminSetting) => {
            settingsMap[item.key] = item.value;
          });

          setSettings(prev => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(settingsMap).filter(([key]) => key in defaultSettings)
            ),
          } as SystemSettings));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionUser) {
      fetchSettings();
    }
  }, [sessionUser, isSuperAdmin]);

  const handleSave = async () => {
    setIsSaving(true);
    const supabase = getClient();

    try {
      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('admin_settings')
          .upsert({
            key,
            value,
          } as unknown as never, {
            onConflict: 'key',
          });
      }

      toast.success('설정이 저장되었습니다');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('설정 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return <AdminSettingsSkeleton />;
  }

  // Check permission
  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h3>
          <p className="mt-2 text-muted-foreground">
            이 페이지는 Super Admin만 접근할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">시스템 설정</h1>
          <p className="text-muted-foreground">
            메일톡 서비스의 전체 설정을 관리합니다.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          저장
        </Button>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>시스템 상태</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-base">유지보수 모드</Label>
                {settings.maintenance_mode && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    활성화됨
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                활성화하면 모든 사용자에게 유지보수 메시지가 표시됩니다.
              </p>
            </div>
            <Switch
              checked={settings.maintenance_mode}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, maintenance_mode: checked }))
              }
            />
          </div>

          {/* Signup Enabled */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-base">회원가입 허용</Label>
                {settings.signup_enabled && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    허용됨
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                새로운 회사의 회원가입을 허용합니다.
              </p>
            </div>
            <Switch
              checked={settings.signup_enabled}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, signup_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>서비스 설정</CardTitle>
          </div>
          <CardDescription>
            기본 서비스 설정값을 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max-seats">회사당 최대 좌석 수</Label>
              <Input
                id="max-seats"
                type="number"
                value={settings.max_seats_per_company}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    max_seats_per_company: parseInt(e.target.value) || 100,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-quota">기본 이메일 용량 (MB)</Label>
              <Input
                id="email-quota"
                type="number"
                value={settings.default_email_quota_mb}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    default_email_quota_mb: parseInt(e.target.value) || 1000,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temp-domain">임시 도메인 접미사</Label>
            <Input
              id="temp-domain"
              value={settings.temp_domain_suffix}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  temp_domain_suffix: e.target.value,
                }))
              }
              placeholder="ourmail.co"
            />
            <p className="text-sm text-muted-foreground">
              자체 도메인이 없는 회사에 제공되는 임시 서브도메인의 접미사입니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Server */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>이메일 서버 (WHM)</CardTitle>
          </div>
          <CardDescription>
            WHM/cPanel 서버 연동 설정입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whm-url">WHM 서버 URL</Label>
            <Input
              id="whm-url"
              value={settings.whm_server_url}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  whm_server_url: e.target.value,
                }))
              }
              placeholder="https://server.mymailtalk.com:2087"
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>참고:</strong> WHM API 토큰은 환경 변수(WHM_API_TOKEN)로 설정해야 합니다.
              보안상의 이유로 이 페이지에서는 수정할 수 없습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>결제 설정 (Stripe)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Stripe 결제 활성화</Label>
              <p className="text-sm text-muted-foreground">
                Stripe를 통한 결제를 허용합니다.
              </p>
            </div>
            <Switch
              checked={settings.stripe_enabled}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, stripe_enabled: checked }))
              }
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>참고:</strong> Stripe API 키는 환경 변수로 설정해야 합니다.
              STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET 등을 확인하세요.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Kakao Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>카카오 알림 설정 (Solapi)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">카카오 알림 서비스 활성화</Label>
              <p className="text-sm text-muted-foreground">
                Solapi를 통한 카카오톡 알림을 허용합니다.
              </p>
            </div>
            <Switch
              checked={settings.kakao_enabled}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, kakao_enabled: checked }))
              }
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>참고:</strong> Solapi API 키는 환경 변수로 설정해야 합니다.
              SOLAPI_API_KEY, SOLAPI_API_SECRET 등을 확인하세요.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>환경 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Node 환경</span>
              <Badge variant="outline">{process.env.NODE_ENV}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">버전</span>
              <Badge variant="outline">1.0.0</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
