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
  Server,
  Lock,
  Smartphone,
  ArrowRight,
  Check,
} from 'lucide-react';

export const metadata = {
  title: '서비스안내 - 메일톡',
  description: '메일톡의 비즈니스 이메일 서비스를 확인하세요. 웹메일, 카카오 알림, 보안 설정 등 다양한 기능을 제공합니다.',
};

const features = [
  {
    icon: Mail,
    title: '비즈니스 이메일',
    description: '회사 도메인으로 전문적인 이메일 주소를 사용하세요.',
    details: ['@회사도메인.com 이메일 생성', '무제한 이메일 발송/수신', '대용량 첨부파일 지원'],
  },
  {
    icon: Shield,
    title: '안전한 보안',
    description: 'SPF, DKIM, DMARC 설정으로 스팸과 피싱을 차단합니다.',
    details: ['자동 SPF/DKIM/DMARC 설정', '스팸 필터링', 'SSL/TLS 암호화'],
  },
  {
    icon: MessageSquare,
    title: '카카오 알림',
    description: '새 메일이 도착하면 카카오톡으로 즉시 알림을 받으세요.',
    details: ['실시간 새 메일 알림', '발신자/제목 미리보기', '웹메일 바로가기 링크'],
  },
  {
    icon: Globe,
    title: '웹메일 제공',
    description: '언제 어디서나 웹 브라우저로 이메일을 확인하세요.',
    details: ['반응형 웹메일 인터페이스', '모바일 최적화', '다국어 지원'],
  },
  {
    icon: Users,
    title: '팀 관리',
    description: '직원 계정을 쉽게 추가하고 관리할 수 있습니다.',
    details: ['직원 계정 무제한 추가', '권한별 역할 관리', '사용량 모니터링'],
  },
  {
    icon: CreditCard,
    title: '유연한 과금',
    description: '사용하는 만큼만 지불하는 좌석 기반 요금제입니다.',
    details: ['월별 자동 결제', '언제든 취소 가능', '볼륨 할인 적용'],
  },
];

const techFeatures = [
  {
    icon: Server,
    title: '안정적인 인프라',
    description: '99.9% 가동률을 보장하는 엔터프라이즈급 메일 서버',
  },
  {
    icon: Lock,
    title: '데이터 보호',
    description: '모든 데이터는 암호화되어 안전하게 저장됩니다',
  },
  {
    icon: Smartphone,
    title: '멀티 디바이스',
    description: 'PC, 모바일, 태블릿 어디서나 접속 가능',
  },
];

const navLinks = [
  { href: '/about', label: '회사소개' },
  { href: '/services', label: '서비스안내' },
  { href: '/pricing', label: '요금안내' },
  { href: '/support', label: '고객지원센터' },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
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
            <Badge variant="outline" className="mb-4">
              <Mail className="mr-2 h-4 w-4" />
              서비스안내
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              비즈니스에 필요한
              <br />
              <span className="text-primary">모든 이메일 기능</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              복잡한 설정 없이 바로 사용할 수 있는 완벽한 이메일 솔루션
            </p>
          </div>
        </div>
        <div className="absolute -top-40 right-0 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech Features Section */}
      <section className="bg-muted/30 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">기술적 특징</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              엔터프라이즈급 기술로 안정적인 서비스를 제공합니다
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {techFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-2 text-center">
                  <CardHeader>
                    <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
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

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <Card className="border-2 border-primary bg-primary/5">
            <div className="py-12 text-center">
              <h2 className="text-3xl font-bold">지금 바로 시작하세요</h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                메일톡의 모든 기능을 지금 바로 경험해보세요.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/signup">
                  <Button size="lg" className="text-lg">
                    서비스 바로가기
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="text-lg">
                    요금제 보기
                  </Button>
                </Link>
              </div>
            </div>
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
              <Link href="/support" className="hover:text-foreground">
                문의하기
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
