// ============================================
// Pricing Constants
// ============================================

export const PRICING = {
  EMAIL_SEAT: {
    AMOUNT: 500, // $5.00 in cents
    CURRENCY: 'usd',
    INTERVAL: 'month' as const,
    LABEL: 'Email Seat',
    DESCRIPTION: 'Business email with 1GB storage',
  },
  KAKAO_ALERT: {
    AMOUNT: 200, // $2.00 in cents
    CURRENCY: 'usd',
    INTERVAL: 'month' as const,
    LABEL: 'Kakao Mail Alert',
    DESCRIPTION: 'Real-time KakaoTalk notifications for new emails',
  },
} as const;

export const LIMITS = {
  MAX_SEATS_PER_COMPANY: 100,
  DEFAULT_EMAIL_QUOTA_MB: 1000,
  TRIAL_DAYS: 14,
  MIN_SEATS: 1,
} as const;

export const TEMP_DOMAIN = {
  SUFFIX: 'ourmail.co',
  ENABLED: true,
} as const;

// Format price for display
export function formatPrice(amountInCents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

// Calculate total monthly cost
export function calculateMonthlyCost(
  seatCount: number,
  kakaoAlertCount: number
): number {
  return (
    seatCount * PRICING.EMAIL_SEAT.AMOUNT +
    kakaoAlertCount * PRICING.KAKAO_ALERT.AMOUNT
  );
}
