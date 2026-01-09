'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { getClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { User as UserType } from '@/types/database';

const profileSchema = z.object({
  full_name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

type ProfileInput = z.infer<typeof profileSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { sessionUser, isLoading: authLoading, refreshUser } = useAuthContext();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
    },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionUser?.id) return;

      const supabase = getClient();

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (userData) {
          const typedUserData = userData as UserType;
          setUser(typedUserData);
          profileForm.reset({
            full_name: typedUserData.full_name || '',
            phone: typedUserData.phone || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('사용자 정보를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionUser) {
      fetchData();
    }
  }, [sessionUser, profileForm]);

  const handleProfileSubmit = async (data: ProfileInput) => {
    if (!sessionUser?.id) return;

    setIsSaving(true);
    const supabase = getClient();

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
        } as unknown as never)
        .eq('id', sessionUser.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, ...data } : null);
      await refreshUser();
      toast.success('프로필이 업데이트되었습니다');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('프로필 업데이트에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordInput) => {
    setIsChangingPassword(true);
    const supabase = getClient();

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      passwordForm.reset();
      toast.success('비밀번호가 변경되었습니다');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('비밀번호 변경에 실패했습니다');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-primary text-primary-foreground">
            Super Admin
          </Badge>
        );
      case 'company_admin':
        return <Badge variant="secondary">관리자</Badge>;
      default:
        return <Badge variant="outline">직원</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">
          계정 설정 및 프로필을 관리하세요.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>프로필</CardTitle>
          </div>
          <CardDescription>
            기본 프로필 정보를 관리하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(user?.full_name || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{user?.full_name || '사용자'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-2">
                {getRoleBadge(user?.role || 'employee')}
              </div>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>휴대폰 번호</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input {...field} placeholder="010-1234-5678" />
                        {user?.phone_verified && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            인증됨
                          </Badge>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      카카오 알림을 받으려면 휴대폰 인증이 필요합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
                {!user?.phone_verified && user?.phone && (
                  <Button type="button" variant="outline">
                    <Phone className="mr-2 h-4 w-4" />
                    휴대폰 인증
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Email Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>이메일</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">이메일 주소</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">이메일 상태</p>
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
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>보안</CardTitle>
          </div>
          <CardDescription>
            계정 보안 설정을 관리하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Change */}
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4" />
              비밀번호 변경
            </h4>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현재 비밀번호</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        최소 8자 이상, 영문/숫자/특수문자 조합 권장
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  비밀번호 변경
                </Button>
              </form>
            </Form>
          </div>

          <Separator />

          {/* Account Actions */}
          <div>
            <h4 className="font-medium mb-4">계정 관리</h4>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                마지막 로그인: {user?.last_login_at
                  ? new Date(user.last_login_at).toLocaleString('ko-KR')
                  : '-'}
              </p>
              <p className="text-sm text-muted-foreground">
                계정 생성일: {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('ko-KR')
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">위험 구역</CardTitle>
          <CardDescription>
            이 작업은 되돌릴 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                계정 삭제 요청
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 계정을 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. 모든 데이터가 영구적으로 삭제됩니다.
                  이메일 계정과 관련된 모든 메일도 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
                  삭제 요청
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-1 h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
