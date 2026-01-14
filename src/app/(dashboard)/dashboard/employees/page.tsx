'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { EmployeeTable } from '@/components/employee/employee-table';
import { AddEmployeeDialog } from '@/components/employee/add-employee-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Search, Users } from 'lucide-react';
import { getClient } from '@/lib/supabase/client';
import { formatPrice, PRICING } from '@/constants/pricing';
import { toast } from 'sonner';
import type { User, Company } from '@/types/database';

export default function EmployeesPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [employees, setEmployees] = useState<User[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!sessionUser?.company_id) return;

    const supabase = getClient();

    try {
      // Fetch company data
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, domain, use_temp_domain, temp_subdomain, status, current_seat_count, kakao_alert_user_count')
        .eq('id', sessionUser.company_id)
        .single();

      if (companyData) {
        setCompany(companyData as Company);
      }

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', sessionUser.company_id)
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;

      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('직원 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [sessionUser?.company_id]);

  useEffect(() => {
    if (sessionUser) {
      fetchEmployees();
    }
  }, [sessionUser, fetchEmployees]);

  const handleToggleKakaoAlert = async (userId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/users/kakao-alert', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success(
        enabled ? '카카오 알림이 활성화되었습니다' : '카카오 알림이 비활성화되었습니다'
      );

      // Refresh employees
      await fetchEmployees();
    } catch (error) {
      console.error('Toggle Kakao alert error:', error);
      toast.error('카카오 알림 설정에 실패했습니다');
    }
  };

  const handleEditEmployee = (_employee: User) => {
    // 직원 편집 기능은 현재 미구현 - 삭제 후 재추가로 대체
    toast.info('직원 정보 수정은 삭제 후 재추가해주세요');
  };

  const handleDeleteEmployee = async (userId: string) => {
    try {
      const response = await fetch(`/api/employees/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('직원이 삭제되었습니다');
      await fetchEmployees();
    } catch (error) {
      console.error('Delete employee error:', error);
      toast.error('직원 삭제에 실패했습니다');
    }
  };

  // Filter employees by search query
  const filteredEmployees = employees.filter((employee) => {
    const query = searchQuery.toLowerCase();
    return (
      employee.email.toLowerCase().includes(query) ||
      employee.full_name?.toLowerCase().includes(query) ||
      employee.phone?.includes(query)
    );
  });

  // Calculate stats
  const totalEmployees = employees.filter(e => e.is_active).length;
  const kakaoAlertUsers = employees.filter(e => e.kakao_alert_enabled).length;
  const monthlyCost =
    totalEmployees * PRICING.EMAIL_SEAT.AMOUNT +
    kakaoAlertUsers * PRICING.KAKAO_ALERT.AMOUNT;

  if (authLoading || isLoading) {
    return <EmployeesSkeleton />;
  }

  // Check permission
  if (sessionUser?.role === 'employee') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h3>
          <p className="mt-2 text-muted-foreground">
            직원 관리는 관리자만 접근할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const companyDomain = company?.use_temp_domain
    ? company.temp_subdomain || ''
    : company?.domain || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">직원 관리</h1>
          <p className="text-muted-foreground">
            직원을 추가하고 이메일 계정 및 카카오 알림을 관리하세요.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          직원 추가
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 직원 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}명</div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(PRICING.EMAIL_SEAT.AMOUNT)} x {totalEmployees} ={' '}
              {formatPrice(totalEmployees * PRICING.EMAIL_SEAT.AMOUNT)}/월
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              카카오 알림 사용자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kakaoAlertUsers}명</div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(PRICING.KAKAO_ALERT.AMOUNT)} x {kakaoAlertUsers} ={' '}
              {formatPrice(kakaoAlertUsers * PRICING.KAKAO_ALERT.AMOUNT)}/월
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              예상 월간 비용
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(monthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              다음 결제일에 청구됩니다
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>직원 목록</CardTitle>
              <CardDescription>
                {company?.name}의 모든 직원을 관리합니다.
              </CardDescription>
            </div>
            <Badge variant="outline">
              도메인: {companyDomain}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일, 전화번호로 검색..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <EmployeeTable
            employees={filteredEmployees}
            onToggleKakaoAlert={handleToggleKakaoAlert}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          // Refresh employees when dialog closes (in case a new invite was created)
          if (!open) {
            fetchEmployees();
          }
        }}
        companyDomain={companyDomain}
        companyId={sessionUser?.company_id || ''}
      />
    </div>
  );
}

function EmployeesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-4 h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
