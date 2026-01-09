'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  Mail,
  CreditCard,
  Settings,
  Bell,
  Globe,
  Shield,
  Building2,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useAuthContext } from '@/components/auth/auth-provider';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('super_admin' | 'company_admin' | 'employee')[];
}

const mainNavItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '직원 관리',
    href: '/dashboard/employees',
    icon: Users,
    roles: ['super_admin', 'company_admin'],
  },
  {
    title: '이메일 계정',
    href: '/dashboard/emails',
    icon: Mail,
  },
  {
    title: '도메인 설정',
    href: '/dashboard/domain',
    icon: Globe,
    roles: ['super_admin', 'company_admin'],
  },
  {
    title: '알림 설정',
    href: '/dashboard/notifications',
    icon: Bell,
  },
];

const billingNavItems: NavItem[] = [
  {
    title: '구독 관리',
    href: '/dashboard/billing',
    icon: CreditCard,
    roles: ['super_admin', 'company_admin'],
  },
];

const adminNavItems: NavItem[] = [
  {
    title: '회사 관리',
    href: '/admin/companies',
    icon: Building2,
    roles: ['super_admin'],
  },
  {
    title: '시스템 설정',
    href: '/admin/settings',
    icon: Shield,
    roles: ['super_admin'],
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: '설정',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    title: '도움말',
    href: '/help',
    icon: HelpCircle,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sessionUser, signOut } = useAuthContext();

  const filterNavItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.roles) return true;
      if (!sessionUser) return false;
      return item.roles.includes(sessionUser.role);
    });
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;

    return (
      <Link href={item.href}>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-3',
            isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          <Icon className="h-4 w-4" />
          {item.title}
        </Button>
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {filterNavItems(mainNavItems).map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {filterNavItems(billingNavItems).length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              결제
            </p>
            <div className="space-y-1">
              {filterNavItems(billingNavItems).map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </>
        )}

        {filterNavItems(adminNavItems).length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              관리자
            </p>
            <div className="space-y-1">
              {filterNavItems(adminNavItems).map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t p-4">
        <div className="space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </aside>
  );
}
