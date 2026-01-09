// ============================================
// KakaoTalk AlimTalk Templates
// ============================================

// 알림톡 템플릿 ID (Solapi에서 등록 후 발급)
export const KAKAO_TEMPLATES = {
  NEW_EMAIL: 'TPL_NEW_EMAIL',
  PAYMENT_SUCCESS: 'TPL_PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'TPL_PAYMENT_FAILED',
  ACCOUNT_CREATED: 'TPL_ACCOUNT_CREATED',
  DNS_VERIFIED: 'TPL_DNS_VERIFIED',
  PASSWORD_RESET: 'TPL_PASSWORD_RESET',
  EMPLOYEE_INVITE: 'TPL_EMPLOYEE_INVITE',
} as const;

// ============================================
// Template Variable Builders
// ============================================

interface NewEmailVariables {
  from: string;
  subject: string;
  webmailUrl: string;
}

export function buildNewEmailVariables(data: NewEmailVariables) {
  return {
    '#{발신자}': data.from,
    '#{제목}': truncate(data.subject, 50),
    '#{웹메일URL}': data.webmailUrl,
  };
}

/*
알림톡 내용 예시:
[메일 도착 알림]

새로운 메일이 도착했습니다.

보낸 사람: #{발신자}
제목: #{제목}

▶ 웹메일 바로가기
#{웹메일URL}
*/

interface PaymentSuccessVariables {
  companyName: string;
  amount: string;
  period: string;
  invoiceUrl: string;
}

export function buildPaymentSuccessVariables(data: PaymentSuccessVariables) {
  return {
    '#{회사명}': data.companyName,
    '#{결제금액}': data.amount,
    '#{이용기간}': data.period,
    '#{청구서URL}': data.invoiceUrl,
  };
}

/*
알림톡 내용 예시:
[결제 완료]

#{회사명}의 이메일 서비스 결제가 완료되었습니다.

결제 금액: #{결제금액}
이용 기간: #{이용기간}

▶ 청구서 확인
#{청구서URL}
*/

interface PaymentFailedVariables {
  companyName: string;
  amount: string;
  reason: string;
  retryUrl: string;
}

export function buildPaymentFailedVariables(data: PaymentFailedVariables) {
  return {
    '#{회사명}': data.companyName,
    '#{결제금액}': data.amount,
    '#{실패사유}': data.reason,
    '#{재결제URL}': data.retryUrl,
  };
}

/*
알림톡 내용 예시:
[결제 실패]

#{회사명}의 이메일 서비스 결제에 실패했습니다.

결제 금액: #{결제금액}
실패 사유: #{실패사유}

서비스 이용을 위해 결제 정보를 확인해주세요.

▶ 결제 재시도
#{재결제URL}
*/

interface AccountCreatedVariables {
  userName: string;
  email: string;
  webmailUrl: string;
}

export function buildAccountCreatedVariables(data: AccountCreatedVariables) {
  return {
    '#{사용자명}': data.userName,
    '#{이메일}': data.email,
    '#{웹메일URL}': data.webmailUrl,
  };
}

/*
알림톡 내용 예시:
[이메일 계정 생성]

#{사용자명}님의 비즈니스 이메일 계정이 생성되었습니다.

이메일: #{이메일}

▶ 웹메일 바로가기
#{웹메일URL}
*/

interface DNSVerifiedVariables {
  companyName: string;
  domain: string;
  dashboardUrl: string;
}

export function buildDNSVerifiedVariables(data: DNSVerifiedVariables) {
  return {
    '#{회사명}': data.companyName,
    '#{도메인}': data.domain,
    '#{대시보드URL}': data.dashboardUrl,
  };
}

/*
알림톡 내용 예시:
[도메인 인증 완료]

#{회사명}의 도메인 인증이 완료되었습니다.

도메인: #{도메인}

이제 비즈니스 이메일을 사용할 수 있습니다.

▶ 대시보드 바로가기
#{대시보드URL}
*/

interface PasswordResetVariables {
  userName: string;
  resetUrl: string;
  expireTime: string;
}

export function buildPasswordResetVariables(data: PasswordResetVariables) {
  return {
    '#{사용자명}': data.userName,
    '#{재설정URL}': data.resetUrl,
    '#{만료시간}': data.expireTime,
  };
}

/*
알림톡 내용 예시:
[비밀번호 재설정]

#{사용자명}님의 비밀번호 재설정 요청입니다.

아래 링크에서 새 비밀번호를 설정해주세요.
유효 시간: #{만료시간}

▶ 비밀번호 재설정
#{재설정URL}

본인이 요청하지 않으셨다면 이 메시지를 무시해주세요.
*/

interface EmployeeInviteVariables {
  employeeName: string;
  companyName: string;
  email: string;
  inviteUrl: string;
  expireDate: string;
}

export function buildEmployeeInviteVariables(data: EmployeeInviteVariables) {
  return {
    '#{직원명}': data.employeeName,
    '#{회사명}': data.companyName,
    '#{이메일}': data.email,
    '#{초대URL}': data.inviteUrl,
    '#{만료일}': data.expireDate,
  };
}

/*
알림톡 내용 예시:
[메일톡 직원 초대]

#{직원명}님, #{회사명}에서 비즈니스 이메일 서비스에 초대했습니다.

이메일: #{이메일}

아래 링크에서 계정을 활성화해주세요.
(유효기간: #{만료일}까지)

▶ 계정 활성화하기
#{초대URL}
*/

// ============================================
// Utility Functions
// ============================================

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// Sanitize variables for Kakao template
export function sanitizeVariable(value: string): string {
  // Remove special characters that might break the template
  return value
    .replace(/[<>]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}
