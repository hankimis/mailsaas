'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  ExternalLink,
  HardDrive,
  Copy,
  Check,
  Loader2,
  Key,
  Plus,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Company, User } from '@/types/database';

export default function EmailsPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Dialog states
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    // Direct webmail login page
    window.open('https://host51.registrar-servers.com:2096/', '_blank');
  };

  // Validate password strength for cPanel (requires 80+ strength rating)
  const validatePassword = (pwd: string): { valid: boolean; message?: string } => {
    if (pwd.length < 12) {
      return { valid: false, message: '비밀번호는 12자 이상이어야 합니다' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: '대문자를 포함해야 합니다' };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: '소문자를 포함해야 합니다' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: '숫자를 포함해야 합니다' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      return { valid: false, message: '특수문자를 포함해야 합니다 (!@#$%^&* 등)' };
    }
    return { valid: true };
  };

  const handleSetupEmail = async () => {
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      toast.error(validation.message || '비밀번호가 너무 약합니다');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이메일 계정 생성 실패');
      }

      toast.success('이메일 계정이 생성되었습니다!');
      setShowSetupDialog(false);
      setPassword('');
      setConfirmPassword('');

      // Refresh user data
      if (sessionUser?.id) {
        const supabase = getClient();
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        if (userData) setUser(userData);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      toast.error(validation.message || '비밀번호가 너무 약합니다');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/emails/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 변경 실패');
      }

      toast.success('비밀번호가 변경되었습니다!');
      setShowPasswordDialog(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
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

  const isEmailActive = user?.email_account_status === 'active';

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
                isEmailActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }
            >
              {isEmailActive ? '활성' : '설정 필요'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Required Alert */}
          {!isEmailActive && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="font-medium text-yellow-800">이메일 계정 설정이 필요합니다</h4>
              <p className="mt-1 text-sm text-yellow-700">
                웹메일을 사용하려면 먼저 이메일 비밀번호를 설정해야 합니다.
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => setShowSetupDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                이메일 계정 설정하기
              </Button>
            </div>
          )}

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
          {isEmailActive && (
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
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleOpenWebmail} disabled={!isEmailActive}>
              <ExternalLink className="mr-2 h-4 w-4" />
              웹메일 열기
            </Button>
            {isEmailActive && (
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                <Key className="mr-2 h-4 w-4" />
                비밀번호 변경
              </Button>
            )}
          </div>

          {/* Login Guide */}
          {isEmailActive && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">웹메일 로그인 안내</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p>위의 이메일 주소 옆 복사 버튼을 눌러 이메일을 복사한 후, 웹메일에서 로그인하세요.</p>
                <p className="mt-1">&quot;Open my inbox when I log in&quot; 체크 시 다음부터 바로 받은편지함이 열립니다.</p>
              </AlertDescription>
            </Alert>
          )}
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
                  <span className="font-mono">host51.registrar-servers.com</span>
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
                  <span className="font-mono">host51.registrar-servers.com</span>
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

      {/* Setup Email Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이메일 계정 설정</DialogTitle>
            <DialogDescription>
              웹메일 로그인에 사용할 비밀번호를 설정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="setup-password">비밀번호</Label>
              <Input
                id="setup-password"
                type="password"
                placeholder="12자 이상, 대소문자+숫자+특수문자"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-confirm">비밀번호 확인</Label>
              <Input
                id="setup-confirm"
                type="password"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              취소
            </Button>
            <Button onClick={handleSetupEmail} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              설정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이메일 비밀번호 변경</DialogTitle>
            <DialogDescription>
              새로운 웹메일 비밀번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="12자 이상, 대소문자+숫자+특수문자"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              취소
            </Button>
            <Button onClick={handleChangePassword} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              변경하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
