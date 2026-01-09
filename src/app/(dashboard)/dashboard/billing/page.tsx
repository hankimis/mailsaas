'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Download,
  ExternalLink,
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatPrice, PRICING, calculateMonthlyCost } from '@/constants/pricing';
import type { Company, BillingHistory } from '@/types/database';

export default function BillingPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [company, setCompany] = useState<Company | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionUser?.company_id) return;

      const supabase = getClient();

      try {
        // Fetch company data
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', sessionUser.company_id)
          .single();

        if (companyData) {
          setCompany(companyData);
        }

        // Fetch billing history
        const { data: billingData } = await supabase
          .from('billing_history')
          .select('*')
          .eq('company_id', sessionUser.company_id)
          .order('created_at', { ascending: false })
          .limit(12);

        if (billingData) {
          setBillingHistory(billingData);
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

  const handleManageSubscription = () => {
    // TODO: Implement Stripe Customer Portal
    toast.info('결제 관리 페이지로 이동합니다');
  };

  if (authLoading || isLoading) {
    return <BillingSkeleton />;
  }

  // Check permission
  if (sessionUser?.role === 'employee') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h3>
          <p className="mt-2 text-muted-foreground">
            결제 관리는 관리자만 접근할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const monthlyCost = calculateMonthlyCost(
    company?.current_seat_count || 0,
    company?.kakao_alert_user_count || 0
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            활성
          </Badge>
        );
      case 'trialing':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Clock className="mr-1 h-3 w-3" />
            체험 중
          </Badge>
        );
      case 'past_due':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="mr-1 h-3 w-3" />
            결제 지연
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="secondary">
            해지됨
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700">결제완료</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">대기 중</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">결제실패</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">구독 관리</h1>
        <p className="text-muted-foreground">
          구독 상태와 결제 내역을 확인하세요.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>현재 요금제</CardTitle>
              <CardDescription>메일톡 비즈니스 이메일 서비스</CardDescription>
            </div>
            {getStatusBadge(company?.subscription_status || 'active')}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Summary */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">이메일 좌석</p>
                  <p className="text-lg font-semibold">
                    {company?.current_seat_count || 0}명
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(PRICING.EMAIL_SEAT.AMOUNT)}/좌석/월
                  </p>
                  <p className="font-semibold">
                    {formatPrice((company?.current_seat_count || 0) * PRICING.EMAIL_SEAT.AMOUNT)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">카카오 알림</p>
                  <p className="text-lg font-semibold">
                    {company?.kakao_alert_user_count || 0}명
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}/사용자/월
                  </p>
                  <p className="font-semibold">
                    {formatPrice((company?.kakao_alert_user_count || 0) * PRICING.KAKAO_ALERT.AMOUNT)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border bg-primary/5 p-6">
              <div>
                <p className="text-sm text-muted-foreground">예상 월간 비용</p>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(monthlyCost)}
                </p>
                <p className="text-sm text-muted-foreground">/ 월</p>
              </div>
              <Separator className="my-4" />
              <Button onClick={handleManageSubscription}>
                <ExternalLink className="mr-2 h-4 w-4" />
                결제 수단 관리
              </Button>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium">요금 안내</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• 이메일 좌석: {formatPrice(PRICING.EMAIL_SEAT.AMOUNT)}/월 (1GB 저장공간 포함)</li>
              <li>• 카카오 알림: {formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}/월 (선택 사항)</li>
              <li>• 매월 1일에 자동 결제됩니다.</li>
              <li>• 언제든지 좌석을 추가하거나 줄일 수 있습니다.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>결제 내역</CardTitle>
          <CardDescription>최근 12개월간의 결제 내역입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">결제 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>결제일</TableHead>
                    <TableHead>기간</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">영수증</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map(billing => (
                    <TableRow key={billing.id}>
                      <TableCell>
                        {billing.paid_at
                          ? new Date(billing.paid_at).toLocaleDateString('ko-KR')
                          : new Date(billing.created_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        {billing.period_start && billing.period_end
                          ? `${new Date(billing.period_start).toLocaleDateString('ko-KR')} - ${new Date(billing.period_end).toLocaleDateString('ko-KR')}`
                          : '-'}
                      </TableCell>
                      <TableCell>{billing.description || '월간 구독'}</TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(billing.amount_paid)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(billing.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {billing.invoice_pdf_url ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a
                              href={billing.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancellation */}
      <Card>
        <CardHeader>
          <CardTitle>구독 해지</CardTitle>
          <CardDescription>
            구독을 해지하면 다음 결제일부터 서비스가 중단됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10">
            구독 해지 요청
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-1 h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-52 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
