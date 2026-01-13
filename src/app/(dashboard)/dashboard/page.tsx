'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Mail,
  MessageSquare,
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { getClient } from '@/lib/supabase/client';
import { formatPrice, PRICING, calculateMonthlyCost } from '@/constants/pricing';
import type { Company, Notification } from '@/types/database';

interface DashboardStats {
  totalEmployees: number;
  activeEmails: number;
  kakaoAlertUsers: number;
  monthlyCost: number;
}

export default function DashboardPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!sessionUser?.company_id) {
        setIsLoading(false);
        return;
      }

      const supabase = getClient();

      try {
        // Fetch company data
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', sessionUser.company_id)
          .single();

        if (companyData) {
          const typedCompany = companyData as Company;
          setCompany(typedCompany);

          // Calculate stats
          const totalEmployees = typedCompany.current_seat_count;
          const kakaoAlertUsers = typedCompany.kakao_alert_user_count;
          const monthlyCost = calculateMonthlyCost(totalEmployees, kakaoAlertUsers);

          setStats({
            totalEmployees,
            activeEmails: totalEmployees,
            kakaoAlertUsers,
            monthlyCost,
          });
        }

        // Fetch recent notifications
        const { data: notificationData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', sessionUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notificationData) {
          setNotifications(notificationData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // authLoading이 끝난 후에만 데이터 fetch
    if (!authLoading) {
      if (sessionUser) {
        fetchDashboardData();
      } else {
        setIsLoading(false);
      }
    }
  }, [sessionUser, authLoading]);

  // 인증 로딩 중이거나, 인증되었는데 데이터 로딩 중일 때만 스켈레톤 표시
  if (authLoading || (sessionUser && isLoading)) {
    return <DashboardSkeleton />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_setup':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'pending_setup':
        return '설정 중';
      case 'suspended':
        return '일시정지';
      case 'cancelled':
        return '해지됨';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">
          안녕하세요, {sessionUser?.full_name || '사용자'}님
        </h1>
        <p className="text-muted-foreground">
          {company?.name}의 비즈니스 이메일을 관리하세요.
        </p>
      </div>

      {/* Company Status Alert */}
      {company?.status !== 'active' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-4 py-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">설정이 필요합니다</h3>
              <p className="text-sm text-yellow-700">
                {company?.domain_status === 'dns_pending'
                  ? 'DNS 설정을 완료해주세요. 설정이 완료되면 서비스를 정상적으로 이용할 수 있습니다.'
                  : '서비스 설정을 완료해주세요.'}
              </p>
            </div>
            <Link href="/dashboard/domain">
              <Button>
                설정하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="총 직원 수"
          value={stats?.totalEmployees || 0}
          icon={Users}
          description="활성 이메일 계정"
        />
        <StatsCard
          title="활성 이메일"
          value={stats?.activeEmails || 0}
          icon={Mail}
          description="생성된 이메일 계정"
        />
        <StatsCard
          title="카카오 알림"
          value={stats?.kakaoAlertUsers || 0}
          icon={MessageSquare}
          description="알림 활성화 사용자"
        />
        <StatsCard
          title="월간 비용"
          value={formatPrice(stats?.monthlyCost || 0)}
          icon={CreditCard}
          description="예상 청구 금액"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 작업</CardTitle>
            <CardDescription>자주 사용하는 기능에 빠르게 접근하세요.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {sessionUser?.role !== 'employee' && (
              <Link href="/dashboard/employees">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    직원 추가하기
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/dashboard/emails">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  웹메일 열기
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/notifications">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  알림 설정
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {sessionUser?.role !== 'employee' && (
              <Link href="/dashboard/billing">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    결제 관리
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 알림</CardTitle>
              <CardDescription>최근 발생한 알림을 확인하세요.</CardDescription>
            </div>
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm">
                모두 보기
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                새로운 알림이 없습니다.
              </p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={`mt-0.5 rounded-full p-1 ${
                        notification.is_read
                          ? 'bg-muted'
                          : 'bg-primary/10'
                      }`}
                    >
                      {notification.type === 'new_email' ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : notification.type.includes('payment') ? (
                        <CreditCard className="h-4 w-4 text-primary" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Badge className="bg-primary text-primary-foreground">
                        새 알림
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle>계정 개요</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">회사</p>
              <p className="text-lg font-semibold">{company?.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">도메인</p>
              <p className="text-lg font-semibold">
                {company?.use_temp_domain
                  ? company?.temp_subdomain
                  : company?.domain || '-'}
              </p>
              {company?.domain_status === 'dns_pending' && (
                <Badge variant="outline" className="text-yellow-600">
                  DNS 설정 대기중
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">구독 상태</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(company?.status || 'pending_setup')}
                <span className="text-lg font-semibold">
                  {getStatusText(company?.status || 'pending_setup')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h3 className="font-semibold">현재 요금제</h3>
              <p className="text-sm text-muted-foreground">
                이메일 좌석 {formatPrice(PRICING.EMAIL_SEAT.AMOUNT)}/월 +
                카카오 알림 {formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}/월 (선택)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {formatPrice(stats?.monthlyCost || 0)}
                <span className="text-sm font-normal text-muted-foreground">/월</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {stats?.totalEmployees || 0}명 기준
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
