import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCard,
  Check,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { formatPrice, PRICING } from '@/constants/pricing';

export const metadata = {
  title: '요금안내 - 메일톡',
  description: '메일톡의 합리적인 요금제를 확인하세요. 사용하는 만큼만 지불하는 좌석 기반 요금제입니다.',
};

const pricingFeatures = [
  '비즈니스 이메일 계정',
  '1GB 이메일 저장 공간',
  '웹메일 접근',
  'SMTP/IMAP 지원',
  'SPF/DKIM/DMARC 설정',
  '팀 관리 대시보드',
  '이메일 기술 지원',
];

const kakaoFeatures = [
  '실시간 새 메일 알림',
  '카카오톡으로 즉시 확인',
  '발신자/제목 미리보기',
  '웹메일 바로가기 링크',
];

const faqs = [
  {
    question: '결제는 어떻게 하나요?',
    answer: '신용카드로 월별 자동 결제됩니다. Stripe을 통한 안전한 결제를 지원합니다.',
  },
  {
    question: '중간에 사용자를 추가하면 어떻게 되나요?',
    answer: '사용자를 추가하면 일할 계산되어 다음 결제일에 정산됩니다.',
  },
  {
    question: '카카오 알림은 필수인가요?',
    answer: '아니요, 카카오 알림은 선택 사항입니다. 필요한 사용자만 개별적으로 활성화할 수 있습니다.',
  },
  {
    question: '환불이 가능한가요?',
    answer: '서비스 이용 시작 후 7일 이내에 환불 요청이 가능합니다.',
  },
  {
    question: '볼륨 할인은 어떻게 적용되나요?',
    answer: '10명 이상 사용 시 자동으로 볼륨 할인이 적용됩니다. 자세한 내용은 고객지원센터로 문의해주세요.',
  },
];

const navLinks = [
  { href: '/about', label: '회사소개' },
  { href: '/services', label: '서비스안내' },
  { href: '/pricing', label: '요금안내' },
  { href: '/support', label: '고객지원센터' },
];

export default function PricingPage() {
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
              <CreditCard className="mr-2 h-4 w-4" />
              요금안내
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              심플하고
              <br />
              <span className="text-primary">합리적인 요금제</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              사용하는 만큼만 지불하세요. 숨겨진 비용이 없습니다.
            </p>
          </div>
        </div>
        <div className="absolute -top-40 right-0 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      </section>

      {/* Pricing Cards Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
            {/* Email Seat */}
            <Card className="relative border-2">
              <CardHeader>
                <CardTitle className="text-2xl">이메일 좌석</CardTitle>
                <CardDescription>기본 비즈니스 이메일</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold">{formatPrice(PRICING.EMAIL_SEAT.AMOUNT)}</span>
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
                  <Button className="w-full" size="lg">시작하기</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Kakao Alert Add-on */}
            <Card className="relative border-2 border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">추천</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">카카오 알림 (옵션)</CardTitle>
                <CardDescription>실시간 카카오톡 새 메일 알림</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-bold">+{formatPrice(PRICING.KAKAO_ALERT.AMOUNT)}</span>
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
            <Link href="/support" className="text-primary hover:underline">
              문의하기
            </Link>
          </p>
        </div>
      </section>

      {/* Example Pricing */}
      <section className="bg-muted/30 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">요금 예시</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              실제 사용 시 예상 비용을 확인해보세요
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>소규모 팀</CardTitle>
                <CardDescription>5명 기준</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatPrice(PRICING.EMAIL_SEAT.AMOUNT * 5)}
                  <span className="text-base font-normal text-muted-foreground">/월</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  이메일 좌석 5개
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary text-center">
              <CardHeader>
                <CardTitle>성장하는 팀</CardTitle>
                <CardDescription>10명 기준 (카카오 알림 5명)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatPrice(PRICING.EMAIL_SEAT.AMOUNT * 10 + PRICING.KAKAO_ALERT.AMOUNT * 5)}
                  <span className="text-base font-normal text-muted-foreground">/월</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  이메일 좌석 10개 + 카카오 알림 5개
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CardTitle>중견 기업</CardTitle>
                <CardDescription>30명 기준 (카카오 알림 15명)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatPrice(PRICING.EMAIL_SEAT.AMOUNT * 30 + PRICING.KAKAO_ALERT.AMOUNT * 15)}
                  <span className="text-base font-normal text-muted-foreground">/월</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  이메일 좌석 30개 + 카카오 알림 15개
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-4">
              <HelpCircle className="mr-2 h-4 w-4" />
              자주 묻는 질문
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">요금 관련 FAQ</h2>
          </div>

          <div className="mx-auto mt-16 max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription>{faq.answer}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/30 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <Card className="border-2 border-primary bg-primary/5">
            <div className="py-12 text-center">
              <h2 className="text-3xl font-bold">지금 바로 시작하세요</h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                합리적인 가격으로 전문적인 비즈니스 이메일을 사용하세요.
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
