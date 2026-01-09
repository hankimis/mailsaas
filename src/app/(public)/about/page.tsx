import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Sparkles,
  Shield,
  Users,
  Target,
  Heart,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: '회사소개 - 메일톡',
  description: '메일톡은 중소기업과 스타트업을 위한 비즈니스 이메일 솔루션입니다.',
};

const values = [
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

const missions = [
  {
    icon: Target,
    title: '우리의 미션',
    description: '모든 기업이 전문적인 비즈니스 이메일을 쉽고 저렴하게 사용할 수 있도록 합니다.',
  },
  {
    icon: Heart,
    title: '우리의 가치',
    description: '고객의 성공이 곧 우리의 성공입니다. 항상 고객의 입장에서 생각합니다.',
  },
  {
    icon: Zap,
    title: '우리의 약속',
    description: '빠르고 안정적인 서비스로 비즈니스 커뮤니케이션을 지원합니다.',
  },
];

const navLinks = [
  { href: '/about', label: '회사소개' },
  { href: '/services', label: '서비스안내' },
  { href: '/pricing', label: '요금안내' },
  { href: '/support', label: '고객지원센터' },
];

export default function AboutPage() {
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
              <Building2 className="mr-2 h-4 w-4" />
              회사소개
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              중소기업을 위한
              <br />
              <span className="text-primary">비즈니스 이메일 솔루션</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              메일톡은 중소기업과 스타트업이 전문적인 비즈니스 이메일을
              쉽고 저렴하게 사용할 수 있도록 돕습니다.
            </p>
          </div>
        </div>
        <div className="absolute -top-40 right-0 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      </section>

      {/* Values Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">메일톡의 핵심 가치</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              고객 중심의 서비스로 비즈니스 성장을 지원합니다
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {values.map((value) => {
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

      {/* Mission Section */}
      <section className="bg-muted/30 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">우리가 하는 일</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              비즈니스 커뮤니케이션의 시작, 메일톡이 함께합니다
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {missions.map((mission) => {
              const Icon = mission.icon;
              return (
                <Card key={mission.title} className="border-2">
                  <CardHeader>
                    <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{mission.title}</CardTitle>
                    <CardDescription>{mission.description}</CardDescription>
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
              <h2 className="text-3xl font-bold">메일톡과 함께 시작하세요</h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                전문적인 비즈니스 이메일로 회사의 신뢰도를 높이세요.
              </p>
              <Link href="/signup" className="mt-8 inline-block">
                <Button size="lg" className="text-lg">
                  서비스 바로가기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
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
