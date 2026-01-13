'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Building, HelpCircle, Check } from 'lucide-react';
import type { DomainManagementType } from '@/types/database';

interface DomainChoiceOption {
  value: DomainManagementType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  features: string[];
}

const options: DomainChoiceOption[] = [
  {
    value: 'self_managed',
    title: '도메인 직접 관리하고 있음',
    description: '도메인 DNS를 직접 설정할 수 있습니다.',
    icon: Globe,
    badge: '추천',
    features: [
      '즉시 사용 가능',
      'DNS 설정 가이드 제공',
      '빠른 인증 완료',
    ],
  },
  {
    value: 'agency_managed',
    title: '관리 업체가 있음',
    description: '호스팅/웹에이전시에서 도메인을 관리합니다.',
    icon: Building,
    features: [
      'DNS 요청서 자동 생성',
      '관리 업체 전달 가이드',
      'DNS 완료 전 임시 메일 제공',
    ],
  },
  {
    value: 'no_domain',
    title: '도메인이 없음',
    description: '아직 도메인이 없어도 시작할 수 있습니다.',
    icon: HelpCircle,
    features: [
      '임시 도메인 즉시 제공',
      'company.ourmail.co 형태',
      '나중에 도메인 연결 가능',
    ],
  },
];

interface DomainChoiceCardProps {
  value: DomainManagementType | null;
  onChange: (value: DomainManagementType) => void;
}

export function DomainChoiceCard({ value, onChange }: DomainChoiceCardProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">도메인 관리 방식을 선택해주세요</h3>
        <p className="text-sm text-muted-foreground">
          비즈니스 이메일에 사용할 도메인 설정 방법을 선택합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <Card
              key={option.value}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-2 border-primary bg-primary/5'
              )}
              onClick={() => onChange(option.value)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'rounded-lg p-2',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {option.badge && (
                    <Badge className="bg-primary text-primary-foreground">
                      {option.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3 text-base">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {option.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
