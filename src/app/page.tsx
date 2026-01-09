import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Mail,
  Shield,
  MessageSquare,
  Globe,
  Users,
  CreditCard,
  Check,
  ArrowRight,
  Phone,
  HelpCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import { formatPrice, PRICING } from '@/constants/pricing';

const navLinks = [
  { href: '/about', label: '회사소개' },
  { href: '/services', label: '서비스안내' },
  { href: '/pricing', label: '요금안내' },
  { href: '/support', label: '고객지원센터' },
];

const features = [
  {
    icon: Mail,
    title: '비즈니스 이메일',
    description: '회사 도메인으로 전문적인 이메일 주소를 사용하세요.',
  },
  {
    icon: Shield,
    title: '안전한 보안',
    description: 'SPF, DKIM, DMARC 설정으로 스팸과 피싱을 차단합니다.',
  },
  {
    icon: MessageSquare,
    title: '카카오 알림',
    description: '새 메일이 도착하면 카카오톡으로 즉시 알림을 받으세요.',
  },
  {
    icon: Globe,
    title: '웹메일 제공',
    description: '언제 어디서나 웹 브라우저로 이메일을 확인하세요.',
  },
  {
    icon: Users,
    title: '팀 관리',
    description: '직원 계정을 쉽게 추가하고 관리할 수 있습니다.',
  },
  {
    icon: CreditCard,
    title: '유연한 과금',
    description: '사용하는 만큼만 지불하는 좌석 기반 요금제입니다.',
  },
];

const pricingFeatures = [
  '비즈니스 이메일 계정',
  '1GB 이메일 저장 공간',
  '웹메일 접근',
  'SMTP/IMAP 지원',
  'SPF/DKIM/DMARC 설정',
  '팀 관리 대시보드',
];

const kakaoFeatures = [
  '실시간 새 메일 알림',
  '카카오톡으로 즉시 확인',
  '발신자/제목 미리보기',
  '웹메일 바로가기 링크',
];

const companyValues = [
  {
    icon: Sparkles,
    title: '간편한 설정',
    description: '복잡한 기술 설정 없이 5분 만에 비즈니스 이메일을 시작하세요.',
  },
  {
    icon: Shield,
    title: '안정적인 서비스',
    description: '99.9% 가동률을 보장하는 안정적인 메일 서버를 운영합니다.',
  },
  {
    icon: Users,
    title: '고객 중심',
    description: '중소기업에 최적화된 합리적인 가격과 맞춤형 지원을 제공합니다.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link href="/signup">
              <Button>서비스 바로가기</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
              간편한 비즈니스 이메일
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              회사 도메인으로
              <br />
              <span className="text-primary">전문적인 이메일</span>을
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              복잡한 설정 없이 바로 시작하세요.
              <br />
              도메인만 있으면 5분 만에 비즈니스 이메일을 사용할 수 있습니다.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg">
                  서비스 바로가기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button size="lg" variant="outline" className="text-lg">
                  요금제 보기
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              합리적인 가격 · 언제든 취소 가능
            </p>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -top-40 right-0 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 left-0 -z-10 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* About Section - 회사소개 */}
      <section id="about" className="py-20 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              <Building2 className="mr-2 h-4 w-4" />
              회사소개
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              중소기업을 위한 비즈니스 이메일 솔루션
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              메일톡은 중소기업과 스타트업이 전문적인 비즈니스 이메일을
              쉽고 저렴하게 사용할 수 있도록 돕습니다.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {companyValues.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="border-2 text-center">
                  <CardHeader>
                    <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{value.title}</CardTitle>
                    <CardDescription>{value.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section - 서비스안내 */}
      <section id="services" className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              <Mail className="mr-2 h-4 w-4" />
              서비스안내
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              비즈니스에 필요한 모든 기능
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              복잡한 설정 없이 바로 사용할 수 있는 완벽한 이메일 솔루션
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-2 transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section - 요금안내 */}
      <section id="pricing" className="bg-muted/30 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              <CreditCard className="mr-2 h-4 w-4" />
              요금안내
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              심플한 요금제
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              사용하는 만큼만 지불하세요. 숨겨진 비용이 없습니다.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
            {/* Email Seat */}
            <Card className="relative border-2">
              <CardHeader>
                <CardTitle>이메일 좌석</CardTitle>
                <CardDescription>기본 비즈니스 이메일</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{formatPrice(PRICING.EMAIL_SEAT.AMOUNT)}</span>
                  <span className="text-muted-foreground"> / 사용자 / 월</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {pricingFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 block">
                  <Button className="w-full">시작하기</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Kakao Alert Add-on */}
            <Card className="relative border-2 border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">추천</Badge>
              </div>
              <CardHeader>
                <CardTitle>카카오 알림 (옵션)</CardTitle>
                <CardDescription>실시간 카카오톡 새 메일 알림</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">+{formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}</span>
                  <span className="text-muted-foreground"> / 사용자 / 월</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {kakaoFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-lg bg-primary/10 p-4 text-center text-sm">
                  <p className="font-medium text-primary">사용자별 선택 가능</p>
                  <p className="mt-1 text-muted-foreground">
                    필요한 사용자만 활성화하세요
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="mt-8 text-center text-muted-foreground">
            10명 이상 사용 시 볼륨 할인이 적용됩니다.{' '}
            <Link href="#support" className="text-primary hover:underline">
              문의하기
            </Link>
          </p>
        </div>
      </section>

      {/* Support Section - 고객지원센터 */}
      <section id="support" className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              <HelpCircle className="mr-2 h-4 w-4" />
              고객지원센터
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">
              언제든 도움을 드립니다
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              궁금한 점이 있으시면 언제든지 문의해주세요.
              <br />
              전문 상담원이 신속하게 답변 드립니다.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 lg:mx-auto lg:max-w-4xl">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>전화 상담</CardTitle>
                <CardDescription>
                  평일 09:00 - 18:00
                  <br />
                  <span className="text-lg font-semibold text-foreground">02-1234-5678</span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>이메일 문의</CardTitle>
                <CardDescription>
                  24시간 접수 가능
                  <br />
                  <span className="text-lg font-semibold text-foreground">support@mymailtalk.com</span>
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>카카오톡 상담</CardTitle>
                <CardDescription>
                  실시간 채팅 상담
                  <br />
                  <span className="text-lg font-semibold text-foreground">@mailtalk</span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold">지금 바로 시작하세요</h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                메일톡과 함께 전문적인 비즈니스 이메일을 사용해보세요.
                간편한 설정으로 바로 시작할 수 있습니다.
              </p>
              <Link href="/signup" className="mt-8 inline-block">
                <Button size="lg" className="text-lg">
                  서비스 바로가기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <Logo showText={false} />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} 메일톡. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">
                이용약관
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                개인정보처리방침
              </Link>
              <Link href="#support" className="hover:text-foreground">
                문의하기
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
