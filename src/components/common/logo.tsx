import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { logo: 'h-6 w-6', text: 'text-lg' },
  md: { logo: 'h-8 w-8', text: 'text-xl' },
  lg: { logo: 'h-10 w-10', text: 'text-2xl' },
};

const imageSizes = {
  sm: 24,
  md: 32,
  lg: 40,
};

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src="/mailtalklogo.png"
        alt="메일톡 로고"
        width={imageSizes[size]}
        height={imageSizes[size]}
        className={cn('rounded-lg', sizeClasses[size].logo)}
      />
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight',
            sizeClasses[size].text
          )}
        >
          메일톡
        </span>
      )}
    </div>
  );
}
