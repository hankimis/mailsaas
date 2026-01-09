import { z } from 'zod';

// Login Schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 8자 이상이어야 합니다'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Signup Schema
export const signupSchema = z.object({
  // Company Info
  company_name: z
    .string()
    .min(1, '회사명을 입력해주세요')
    .min(2, '회사명은 2자 이상이어야 합니다')
    .max(100, '회사명은 100자 이하여야 합니다'),
  company_slug: z
    .string()
    .min(1, '회사 고유 ID를 입력해주세요')
    .min(3, '회사 ID는 3자 이상이어야 합니다')
    .max(50, '회사 ID는 50자 이하여야 합니다')
    .regex(
      /^[a-z0-9-]+$/,
      '소문자, 숫자, 하이픈(-)만 사용 가능합니다'
    ),

  // Domain
  domain_management_type: z.enum(['self_managed', 'agency_managed', 'no_domain'], {
    message: '도메인 관리 방식을 선택해주세요',
  }),
  domain: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(val);
      },
      { message: '올바른 도메인 형식이 아닙니다' }
    ),

  // Agency Info (for agency_managed)
  agency_name: z.string().optional(),
  agency_email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  agency_phone: z.string().optional(),

  // Admin Info
  admin_email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  admin_name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .min(2, '이름은 2자 이상이어야 합니다'),
  admin_phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(val.replace(/-/g, ''));
      },
      { message: '올바른 휴대폰 번호 형식이 아닙니다' }
    ),

  // Password
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '영문 대소문자와 숫자를 포함해야 합니다'
    ),
  password_confirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.password === data.password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
}).refine((data) => {
  // Domain required for self_managed and agency_managed
  if (data.domain_management_type !== 'no_domain' && !data.domain) {
    return false;
  }
  return true;
}, {
  message: '도메인을 입력해주세요',
  path: ['domain'],
});

export type SignupInput = z.infer<typeof signupSchema>;

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Reset Password Schema
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '영문 대소문자와 숫자를 포함해야 합니다'
    ),
  password_confirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.password === data.password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Add Employee Schema
export const addEmployeeSchema = z.object({
  email: z
    .string()
    .min(1, '이메일 ID를 입력해주세요'),
  full_name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .min(2, '이름은 2자 이상이어야 합니다'),
  phone: z
    .string()
    .min(1, '휴대폰 번호를 입력해주세요')
    .refine(
      (val) => /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(val.replace(/-/g, '')),
      { message: '올바른 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)' }
    ),
  role: z.enum(['employee', 'company_admin'], {
    message: '역할을 선택해주세요',
  }),
  kakao_alert_enabled: z.boolean(),
});

// Employee Registration Schema (for invited employees)
export const employeeRegistrationSchema = z.object({
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(8, '비밀번호는 8자 이상이어야 합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '영문 대소문자와 숫자를 포함해야 합니다'
    ),
  password_confirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.password === data.password_confirm, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['password_confirm'],
});

export type EmployeeRegistrationInput = z.infer<typeof employeeRegistrationSchema>;

export type AddEmployeeInput = z.infer<typeof addEmployeeSchema>;

// Phone Verification Schema
export const phoneVerificationSchema = z.object({
  phone: z
    .string()
    .min(1, '휴대폰 번호를 입력해주세요')
    .refine(
      (val) => /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(val.replace(/-/g, '')),
      { message: '올바른 휴대폰 번호 형식이 아닙니다' }
    ),
  code: z
    .string()
    .min(6, '인증번호 6자리를 입력해주세요')
    .max(6, '인증번호 6자리를 입력해주세요'),
});

export type PhoneVerificationInput = z.infer<typeof phoneVerificationSchema>;
