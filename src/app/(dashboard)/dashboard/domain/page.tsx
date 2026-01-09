'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '@/components/auth/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  Loader2,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Company, DnsRecord, DomainManagementType } from '@/types/database';

const domainSchema = z.object({
  domain: z.string().optional(),
  domain_management_type: z.enum(['self_managed', 'agency_managed', 'no_domain']),
}).refine((data) => {
  if (data.domain_management_type !== 'no_domain' && !data.domain) {
    return false;
  }
  return true;
}, {
  message: '도메인을 입력해주세요',
  path: ['domain'],
});

type DomainInput = z.infer<typeof domainSchema>;

export default function DomainPage() {
  const { sessionUser, isLoading: authLoading } = useAuthContext();
  const [company, setCompany] = useState<Company | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDomainDialog, setShowDomainDialog] = useState(false);
  const [verificationResults, setVerificationResults] = useState<{
    record_type: string;
    host: string;
    verified: boolean;
    found_value?: string;
    error?: string;
  }[]>([]);

  const form = useForm<DomainInput>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      domain: '',
      domain_management_type: 'no_domain',
    },
  });

  const domainType = form.watch('domain_management_type');

  const fetchData = useCallback(async () => {
    if (!sessionUser?.company_id) return;

    try {
      const response = await fetch('/api/domain');
      const data = await response.json();

      if (response.ok) {
        setCompany(data.company);
        setDnsRecords(data.dnsRecords || []);

        // Set form defaults
        form.reset({
          domain: data.company?.domain || '',
          domain_management_type: data.company?.domain_management_type || 'no_domain',
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [sessionUser?.company_id, form]);

  useEffect(() => {
    if (sessionUser) {
      fetchData();
    }
  }, [sessionUser, fetchData]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const handleVerifyDns = async () => {
    setIsVerifying(true);
    setVerificationResults([]);

    try {
      const response = await fetch('/api/domain/verify', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'DNS 확인에 실패했습니다');
        return;
      }

      setVerificationResults(data.results || []);
      setDnsRecords(data.dnsRecords || []);

      if (data.allVerified) {
        toast.success('모든 DNS 레코드가 확인되었습니다!');
        // Refresh company data
        await fetchData();
      } else {
        toast.warning(data.message);
      }
    } catch {
      toast.error('DNS 확인에 실패했습니다');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveDomain = async (data: DomainInput) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/domain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || '도메인 설정에 실패했습니다');
        return;
      }

      toast.success('도메인 설정이 업데이트되었습니다');
      setCompany(result.company);
      setDnsRecords(result.dnsRecords || []);
      setShowDomainDialog(false);
    } catch {
      toast.error('도메인 설정에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return <DomainSkeleton />;
  }

  // Check permission
  if (sessionUser?.role === 'employee') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h3>
          <p className="mt-2 text-muted-foreground">
            도메인 설정은 관리자만 접근할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="mr-1 h-3 w-3" />
            인증됨
          </Badge>
        );
      case 'dns_pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="mr-1 h-3 w-3" />
            DNS 설정 대기
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="mr-1 h-3 w-3" />
            설정 필요
          </Badge>
        );
    }
  };

  const displayRecords = dnsRecords.map(r => ({
    id: r.id,
    type: r.record_type,
    host: r.host,
    value: r.value,
    priority: r.priority,
    verified: r.is_verified,
  }));

  const currentDomain = company?.use_temp_domain
    ? company.temp_subdomain
    : company?.domain;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">도메인 설정</h1>
        <p className="text-muted-foreground">
          비즈니스 이메일을 위한 도메인을 설정하고 관리하세요.
        </p>
      </div>

      {/* Domain Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>
                  {currentDomain || '도메인 미설정'}
                </CardTitle>
                <CardDescription>
                  {company?.use_temp_domain
                    ? '임시 서브도메인'
                    : company?.domain
                    ? '커스텀 도메인'
                    : '도메인을 설정해주세요'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {company?.domain && getStatusBadge(company?.domain_status || 'pending')}
              <Button variant="outline" onClick={() => setShowDomainDialog(true)}>
                <Settings className="mr-2 h-4 w-4" />
                도메인 설정
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">도메인 유형</p>
              <p className="font-medium">
                {company?.domain_management_type === 'self_managed'
                  ? '직접 관리'
                  : company?.domain_management_type === 'agency_managed'
                  ? '대행 관리'
                  : '임시 도메인'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">인증 일시</p>
              <p className="font-medium">
                {company?.domain_verified_at
                  ? new Date(company.domain_verified_at).toLocaleString('ko-KR')
                  : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">이메일 주소 형식</p>
              <p className="font-medium text-primary">
                username@{currentDomain || 'example.com'}
              </p>
            </div>
          </div>

          {company?.domain && company?.domain_status !== 'verified' && !company?.use_temp_domain && (
            <div className="flex gap-3">
              <Button onClick={handleVerifyDns} disabled={isVerifying}>
                {isVerifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                DNS 확인하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Records */}
      {!company?.use_temp_domain && company?.domain && displayRecords.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>DNS 레코드 설정</CardTitle>
                <CardDescription>
                  도메인 등록기관(가비아, 후이즈 등)에서 아래 DNS 레코드를 추가해주세요.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleVerifyDns} disabled={isVerifying}>
                {isVerifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">유형</TableHead>
                    <TableHead className="w-[120px]">호스트</TableHead>
                    <TableHead>값</TableHead>
                    <TableHead className="w-[80px]">우선순위</TableHead>
                    <TableHead className="w-[80px]">상태</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant="outline">{record.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.host}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate font-mono text-sm">
                        {record.value}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.priority || '-'}
                      </TableCell>
                      <TableCell>
                        {record.verified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(record.value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Verification Results */}
            {verificationResults.length > 0 && (
              <div className="mt-4 rounded-lg border p-4">
                <h4 className="font-medium mb-2">검증 결과</h4>
                <div className="space-y-2">
                  {verificationResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {result.verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-mono">{result.record_type} ({result.host})</span>
                      <span className="text-muted-foreground">
                        {result.verified ? '확인됨' : result.error || '미확인'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium">설정 안내</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>1. 도메인 등록기관 관리 페이지에 로그인합니다.</li>
                <li>2. DNS 관리 또는 네임서버 설정 메뉴로 이동합니다.</li>
                <li>3. 위의 레코드들을 하나씩 추가합니다.</li>
                <li>4. 저장 후 DNS 확인하기 버튼을 클릭합니다.</li>
                <li>5. DNS 전파에는 최대 48시간이 소요될 수 있습니다.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Domain Notice */}
      {company?.use_temp_domain && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">임시 도메인 사용 중</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  현재 임시 도메인({company.temp_subdomain})을 사용하고 있습니다.
                  자체 도메인을 설정하면 더 전문적인 이메일 주소를 사용할 수 있습니다.
                </p>
                <Button className="mt-3" onClick={() => setShowDomainDialog(true)}>
                  자체 도메인 설정하기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>도움말</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/support" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                DNS 설정 가이드 보기
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/support" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                도메인 구매 방법
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domain Settings Dialog */}
      <Dialog open={showDomainDialog} onOpenChange={setShowDomainDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>도메인 설정</DialogTitle>
            <DialogDescription>
              비즈니스 이메일에 사용할 도메인을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveDomain)} className="space-y-6">
              <FormField
                control={form.control}
                name="domain_management_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>도메인 유형</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="도메인 유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="self_managed">
                          자체 도메인 (직접 관리)
                        </SelectItem>
                        <SelectItem value="agency_managed">
                          자체 도메인 (대행 관리)
                        </SelectItem>
                        <SelectItem value="no_domain">
                          임시 도메인 사용
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'self_managed' &&
                        'DNS 설정을 직접 관리합니다.'}
                      {field.value === 'agency_managed' &&
                        '도메인 관리 업체에 DNS 설정을 요청합니다.'}
                      {field.value === 'no_domain' &&
                        `${company?.slug || 'company'}.ourmail.co 형태의 임시 도메인을 사용합니다.`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {domainType !== 'no_domain' && (
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>도메인</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        비즈니스 이메일에 사용할 도메인을 입력하세요.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {domainType !== 'no_domain' && (
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                  <p className="font-medium">참고사항</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• 도메인 변경 시 DNS 레코드를 다시 설정해야 합니다.</li>
                    <li>• DNS 전파에는 최대 48시간이 소요될 수 있습니다.</li>
                    <li>• 기존 이메일 주소가 변경될 수 있습니다.</li>
                  </ul>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDomainDialog(false)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DomainSkeleton() {
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
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
