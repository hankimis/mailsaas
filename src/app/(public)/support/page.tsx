import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  FileText,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: '고객지원센터 - 메일톡',
  description: '메일톡 고객지원센터입니다. 전화, 이메일, 카카오톡으로 문의하세요.',
};

const contactMethods = [
  {
    icon: Phone,
    title: '전화 상담',
    description: '평일 09:00 - 18:00',
    contact: '02-1234-5678',
    action: 'tel:02-1234-5678',
    actionLabel: '전화하기',
  },
  {
    icon: Mail,
    title: '이메일 문의',
    description: '24시간 접수 가능',
    contact: 'support@mymailtalk.com',
    action: 'mailto:support@mymailtalk.com',
    actionLabel: '이메일 보내기',
  },
  {
    icon: MessageSquare,
    title: '카카오톡 상담',
    description: '실시간 채팅 상담',
    contact: '@mailtalk',
    action: 'https://pf.kakao.com/_mailtalk',
    actionLabel: '카카오톡 상담',
  },
];

const supportHours = [
  { day: '월요일 - 금요일', hours: '09:00 - 18:00' },
  { day: '토요일', hours: '휴무' },
  { day: '일요일/공휴일', hours: '휴무' },
];

const faqs = [
  {
    question: '이메일 계정은 어떻게 만드나요?',
    answer: '회원가입 후 대시보드에서 직원 추가 메뉴를 통해 이메일 계정을 생성할 수 있습니다.',
  },
  {
    question: '도메인은 어떻게 연결하나요?',
    answer: '회원가입 시 도메인을 입력하면 자동으로 DNS 설정 가이드가 제공됩니다. 가이드에 따라 DNS 레코드를 추가해주세요.',
  },
  {
    question: '웹메일은 어떻게 접속하나요?',
    answer: '대시보드에서 웹메일 바로가기 버튼을 클릭하거나 직접 webmail.mymailtalk.com에 접속하세요.',
  },
  {
    question: '카카오 알림은 어떻게 활성화하나요?',
    answer: '대시보드 > 설정 > 카카오 알림에서 휴대폰 인증 후 활성화할 수 있습니다.',
  },
  {
    question: '결제 수단은 무엇이 있나요?',
    answer: '신용카드(VISA, MasterCard, AMEX)로 결제할 수 있습니다. Stripe을 통한 안전한 결제를 지원합니다.',
  },
  {
    question: '서비스 해지는 어떻게 하나요?',
    answer: '대시보드 > 설정 > 구독 관리에서 언제든지 해지할 수 있습니다. 해지 시 결제 주기 종료일까지 서비스를 이용할 수 있습니다.',
  },
];

const resources = [
  {
    icon: BookOpen,
    title: '시작 가이드',
    description: '메일톡 시작하기',
    href: '#',
  },
  {
    icon: FileText,
    title: 'DNS 설정 가이드',
    description: '도메인 연결 방법',
    href: '#',
  },
  {
    icon: Mail,
    title: '웹메일 사용법',
    description: '웹메일 기능 안내',
    href: '#',
  },
];

const navLinks = [
  { href: '/about', label: '회사소개' },
  { href: '/services', label: '서비스안내' },
  { href: '/pricing', label: '요금안내' },
  { href: '/support', label: '고객지원센터' },
];

export default function SupportPage() {
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
              <HelpCircle className="mr-2 h-4 w-4" />
              고객지원센터
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              언제든
              <br />
              <span className="text-primary">도움을 드립니다</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              궁금한 점이 있으시면 언제든지 문의해주세요.
              <br />
              전문 상담원이 신속하게 답변 드립니다.
            </p>
          </div>
        </div>
        <div className="absolute -top-40 right-0 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      </section>

      {/* Contact Methods Section */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            {contactMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Card key={method.title} className="border-2 text-center">
                  <CardHeader>
                    <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{method.title}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-xl font-semibold">{method.contact}</p>
                    <a href={method.action}>
                      <Button variant="outline" className="w-full">
                        {method.actionLabel}
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Support Hours Section */}
      <section className="bg-muted/30 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-4">
                <Clock className="mr-2 h-4 w-4" />
                상담 시간
              </Badge>
              <h2 className="text-3xl font-bold md:text-4xl">고객센터 운영 시간</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                영업시간 내 문의 시 빠른 답변을 받으실 수 있습니다.
              </p>

              <div className="mt-8 space-y-4">
                {supportHours.map((item) => (
                  <div key={item.day} className="flex justify-between border-b pb-4">
                    <span className="font-medium">{item.day}</span>
                    <span className="text-muted-foreground">{item.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Badge variant="outline" className="mb-4">
                <BookOpen className="mr-2 h-4 w-4" />
                도움말
              </Badge>
              <h2 className="text-3xl font-bold md:text-4xl">자료실</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                자주 사용하는 기능의 가이드를 확인하세요.
              </p>

              <div className="mt-8 space-y-4">
                {resources.map((resource) => {
                  const Icon = resource.icon;
                  return (
                    <Link key={resource.title} href={resource.href}>
                      <Card className="transition-colors hover:border-primary/50">
                        <CardHeader className="flex flex-row items-center gap-4 py-4">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{resource.title}</CardTitle>
                            <CardDescription>{resource.description}</CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
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
            <h2 className="text-3xl font-bold md:text-4xl">FAQ</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              자주 묻는 질문들을 확인해보세요
            </p>
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
              <h2 className="text-3xl font-bold">더 궁금한 점이 있으신가요?</h2>
              <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                언제든지 문의해주세요. 친절하게 안내해드리겠습니다.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a href="mailto:support@mymailtalk.com">
                  <Button size="lg" className="text-lg">
                    이메일 문의하기
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="text-lg">
                    서비스 바로가기
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
