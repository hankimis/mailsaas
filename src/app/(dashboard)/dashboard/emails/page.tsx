'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Mail,
  ExternalLink,
  HardDrive,
  RefreshCw,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { getClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Company, User } from '@/types/database';

export default function EmailsPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionUser?.id) return;

      const supabase = getClient();

      try {
        // Fetch user data
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (userData) {
          setUser(userData);
        }

        // Fetch company data
        if (sessionUser.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', sessionUser.company_id)
            .single();

          if (companyData) {
            setCompany(companyData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('데이터를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionUser) {
      fetchData();
    }
  }, [sessionUser]);

  const handleCopyEmail = async () => {
    if (!user?.email) return;

    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      toast.success('이메일 주소가 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const handleOpenWebmail = () => {
    const webmailUrl = 'https://webmail.mymailtalk.com';
    window.open(webmailUrl, '_blank');
  };

  if (authLoading || isLoading) {
    return <EmailsSkeleton />;
  }

  const quotaUsedPercent = user?.email_quota_mb
    ? Math.round((user.email_used_mb / user.email_quota_mb) * 100)
    : 0;

  const domain = company?.use_temp_domain
    ? company.temp_subdomain
    : company?.domain;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">이메일 계정</h1>
        <p className="text-muted-foreground">
          내 비즈니스 이메일을 관리하세요.
        </p>
      </div>

      {/* Email Account Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{user?.email || sessionUser?.email}</CardTitle>
                <CardDescription>비즈니스 이메일 계정</CardDescription>
              </div>
            </div>
            <Badge
              className={
                user?.email_account_status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }
            >
              {user?.email_account_status === 'active' ? '활성' : '설정 중'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">이메일 주소</p>
              <div className="flex items-center gap-2">
                <p className="font-medium">{user?.email || sessionUser?.email}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyEmail}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">도메인</p>
              <p className="font-medium">{domain || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">마지막 접속</p>
              <p className="font-medium">
                {user?.last_webmail_login
                  ? new Date(user.last_webmail_login).toLocaleString('ko-KR')
                  : '접속 기록 없음'}
              </p>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">저장공간 사용량</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {user?.email_used_mb || 0} MB / {user?.email_quota_mb || 1000} MB
              </span>
            </div>
            <Progress value={quotaUsedPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {quotaUsedPercent}% 사용 중
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleOpenWebmail}>
              <ExternalLink className="mr-2 h-4 w-4" />
              웹메일 열기
            </Button>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              이메일 설정
            </Button>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              비밀번호 변경
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Server Settings */}
      <Card>
        <CardHeader>
          <CardTitle>이메일 서버 설정</CardTitle>
          <CardDescription>
            외부 이메일 클라이언트(Outlook, Apple Mail 등)에서 사용하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Incoming Server */}
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">수신 서버 (IMAP)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">서버</span>
                  <span className="font-mono">mail.mymailtalk.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">포트</span>
                  <span className="font-mono">993 (SSL)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">보안</span>
                  <span>SSL/TLS</span>
                </div>
              </div>
            </div>

            {/* Outgoing Server */}
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">발신 서버 (SMTP)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">서버</span>
                  <span className="font-mono">mail.mymailtalk.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">포트</span>
                  <span className="font-mono">465 (SSL)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">보안</span>
                  <span>SSL/TLS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>참고:</strong> 이메일 클라이언트 설정 시 이메일 주소 전체를
              사용자 이름으로 사용하세요. 비밀번호는 웹메일 비밀번호와 동일합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
