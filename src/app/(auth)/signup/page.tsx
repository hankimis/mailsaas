'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getClient } from '@/lib/supabase/client';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DomainChoiceCard } from '@/components/onboarding/domain-choice-card';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, PRICING } from '@/constants/pricing';
import type { DomainManagementType } from '@/types/database';

type Step = 'domain' | 'company' | 'admin' | 'summary';

const steps: { id: Step; title: string }[] = [
  { id: 'domain', title: '도메인 선택' },
  { id: 'company', title: '회사 정보' },
  { id: 'admin', title: '관리자 계정' },
  { id: 'summary', title: '확인' },
];

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('domain');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      company_name: '',
      company_slug: '',
      domain_management_type: undefined as unknown as DomainManagementType,
      domain: '',
      agency_name: '',
      agency_email: '',
      agency_phone: '',
      admin_email: '',
      admin_name: '',
      admin_phone: '',
      password: '',
      password_confirm: '',
    },
  });

  const domainType = form.watch('domain_management_type');
  const companyName = form.watch('company_name');
  const companySlug = form.watch('company_slug');
  const domain = form.watch('domain');

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof SignupInput)[] = [];

    switch (currentStep) {
      case 'domain':
        fieldsToValidate = ['domain_management_type'];
        if (domainType !== 'no_domain') {
          fieldsToValidate.push('domain');
        }
        break;
      case 'company':
        fieldsToValidate = ['company_name', 'company_slug'];
        break;
      case 'admin':
        fieldsToValidate = ['admin_email', 'admin_name', 'password', 'password_confirm'];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      goToNextStep();
    }
  };

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);
    const supabase = getClient();

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.admin_email,
        password: data.password,
        options: {
          data: {
            full_name: data.admin_name,
            phone: data.admin_phone,
          },
        },
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        toast.error('회원가입 실패', {
          description: authError.message,
        });
        return;
      }

      if (!authData.user) {
        toast.error('사용자 생성에 실패했습니다');
        return;
      }

      // 2. Create company and user via API
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authData.user.id,
          company_name: data.company_name,
          company_slug: data.company_slug,
          domain: data.domain || null,
          domain_management_type: data.domain_management_type,
          admin_email: data.admin_email,
          admin_name: data.admin_name,
          admin_phone: data.admin_phone,
          agency_name: data.agency_name,
          agency_email: data.agency_email,
          agency_phone: data.agency_phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error('회사 생성 실패', {
          description: error.message,
        });
        return;
      }

      toast.success('회원가입 완료!', {
        description: '결제 페이지로 이동합니다.',
      });

      // Redirect to payment or dashboard
      router.push('/signup/payment');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Logo size="lg" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold">비즈니스 이메일 시작하기</h1>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-1 items-center"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      index < currentStepIndex
                        ? 'border-primary bg-primary text-primary-foreground'
                        : index === currentStepIndex
                        ? 'border-primary text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-4 h-[2px] flex-1 ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Step 1: Domain */}
              {currentStep === 'domain' && (
                <>
                  <CardHeader>
                    <CardTitle>도메인 설정</CardTitle>
                    <CardDescription>
                      비즈니스 이메일에 사용할 도메인을 설정합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-6">
                    <FormField
                      control={form.control}
                      name="domain_management_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <DomainChoiceCard
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {domainType && domainType !== 'no_domain' && (
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
                              (예: company.com)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {domainType === 'agency_managed' && (
                      <div className="space-y-4 rounded-lg border p-4">
                        <p className="text-sm font-medium">
                          관리 업체 정보 (선택)
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="agency_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>업체명</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABC 호스팅" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="agency_email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>이메일</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="support@agency.com"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </>
              )}

              {/* Step 2: Company */}
              {currentStep === 'company' && (
                <>
                  <CardHeader>
                    <CardTitle>회사 정보</CardTitle>
                    <CardDescription>
                      서비스에서 사용할 회사 정보를 입력해주세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-6">
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>회사명</FormLabel>
                          <FormControl>
                            <Input placeholder="주식회사 회사이름" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>회사 고유 ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="my-company"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            {domainType === 'no_domain'
                              ? `임시 이메일: user@${companySlug || 'company'}.ourmail.co`
                              : '영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </>
              )}

              {/* Step 3: Admin */}
              {currentStep === 'admin' && (
                <>
                  <CardHeader>
                    <CardTitle>관리자 계정</CardTitle>
                    <CardDescription>
                      회사 관리자 계정을 생성합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-6">
                    <FormField
                      control={form.control}
                      name="admin_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input placeholder="홍길동" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="admin@company.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            로그인 및 알림 수신에 사용됩니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="admin_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>휴대폰 번호 (선택)</FormLabel>
                          <FormControl>
                            <Input placeholder="010-1234-5678" {...field} />
                          </FormControl>
                          <FormDescription>
                            카카오톡 알림 수신에 사용됩니다.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password_confirm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호 확인</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {/* Step 4: Summary */}
              {currentStep === 'summary' && (
                <>
                  <CardHeader>
                    <CardTitle>가입 정보 확인</CardTitle>
                    <CardDescription>
                      입력한 정보를 확인해주세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-6">
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">회사명</p>
                          <p className="font-medium">{companyName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">도메인</p>
                          <p className="font-medium">
                            {domainType === 'no_domain'
                              ? `${companySlug}.ourmail.co (임시)`
                              : domain}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">관리자</p>
                          <p className="font-medium">{form.watch('admin_name')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">이메일</p>
                          <p className="font-medium">{form.watch('admin_email')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-primary/10 p-4">
                      <h4 className="font-semibold">요금 안내</h4>
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>이메일 좌석</span>
                          <span>{formatPrice(PRICING.EMAIL_SEAT.AMOUNT)} / 사용자 / 월</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>카카오 알림 (선택)</span>
                          <span>+{formatPrice(PRICING.KAKAO_ALERT.AMOUNT)} / 사용자 / 월</span>
                        </div>
                        <div className="border-t pt-2">
                          <p className="font-medium text-primary">
                            14일 무료 체험 후 결제가 시작됩니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between border-t p-6">
                {currentStep !== 'domain' ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPrevStep}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    이전
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="ghost">
                      이미 계정이 있으신가요?
                    </Button>
                  </Link>
                )}

                {currentStep !== 'summary' ? (
                  <Button type="button" onClick={handleNext}>
                    다음
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    가입 완료
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
