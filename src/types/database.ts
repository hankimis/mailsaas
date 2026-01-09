// ============================================
// Database Types - Auto-generated style
// ============================================

export type UserRole = 'super_admin' | 'company_admin' | 'employee';
export type CompanyStatus = 'pending_setup' | 'active' | 'suspended' | 'cancelled';
export type DomainStatus = 'pending' | 'dns_pending' | 'verified' | 'failed';
export type DomainManagementType = 'self_managed' | 'agency_managed' | 'no_domain';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
export type EmailAccountStatus = 'pending' | 'active' | 'suspended' | 'deleted';
export type NotificationType =
  | 'new_email'
  | 'payment_success'
  | 'payment_failed'
  | 'dns_verified'
  | 'dns_failed'
  | 'account_created'
  | 'subscription_updated'
  | 'system';
export type NotificationChannel = 'web' | 'email' | 'kakao';
export type KakaoDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';

// ============================================
// Table Types
// ============================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  domain_status: DomainStatus;
  domain_management_type: DomainManagementType;
  domain_verified_at: string | null;
  temp_subdomain: string | null;
  use_temp_domain: boolean;
  contact_email: string;
  contact_phone: string | null;
  cpanel_account_id: string | null;
  cpanel_username: string | null;
  cpanel_package: string | null;
  whm_server_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  current_seat_count: number;
  kakao_alert_user_count: number;
  status: CompanyStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  phone_verified_at: string | null;
  role: UserRole;
  company_id: string | null;
  kakao_alert_enabled: boolean;
  kakao_alert_consent: boolean;
  kakao_alert_consent_at: string | null;
  email_account_id: string | null;
  email_account_status: EmailAccountStatus;
  email_quota_mb: number;
  email_used_mb: number;
  webmail_password_hash: string | null;
  last_webmail_login: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface DnsRecord {
  id: string;
  company_id: string;
  record_type: string;
  host: string;
  value: string;
  priority: number | null;
  ttl: number;
  is_verified: boolean;
  verified_at: string | null;
  last_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DnsRequest {
  id: string;
  company_id: string;
  agency_name: string | null;
  agency_email: string | null;
  agency_phone: string | null;
  request_document_url: string | null;
  request_sent_at: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionItem {
  id: string;
  company_id: string;
  stripe_subscription_item_id: string;
  stripe_price_id: string;
  item_type: 'email_seat' | 'kakao_alert';
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface BillingHistory {
  id: string;
  company_id: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  company_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UserNotificationSettings {
  id: string;
  user_id: string;
  web_enabled: boolean;
  email_enabled: boolean;
  kakao_enabled: boolean;
  new_email_web: boolean;
  new_email_email: boolean;
  new_email_kakao: boolean;
  payment_web: boolean;
  payment_email: boolean;
  payment_kakao: boolean;
  system_web: boolean;
  system_email: boolean;
  system_kakao: boolean;
  created_at: string;
  updated_at: string;
}

export interface KakaoDeliveryLog {
  id: string;
  user_id: string;
  notification_id: string | null;
  solapi_message_id: string | null;
  solapi_group_id: string | null;
  template_id: string;
  phone: string;
  variables: Record<string, string> | null;
  status: KakaoDeliveryStatus;
  status_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface EmailPollingState {
  id: string;
  user_id: string;
  last_uid: number;
  last_poll_at: string | null;
  mailbox: string;
  consecutive_errors: number;
  last_error: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  company_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface JobRecord {
  id: string;
  queue_name: string;
  job_id: string;
  job_name: string;
  company_id: string | null;
  user_id: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
}

export interface AdminSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface EmployeeInvitation {
  id: string;
  token: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  company_id: string;
  invited_by: string | null;
  kakao_alert_enabled: boolean;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  kakao_sent_at: string | null;
  kakao_delivery_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInvitationWithCompany extends EmployeeInvitation {
  company: Company;
}

// ============================================
// Extended Types (with relations)
// ============================================

export interface UserWithCompany extends User {
  company: Company | null;
}

export interface CompanyWithMembers extends Company {
  members: User[];
}

export interface NotificationWithUser extends Notification {
  user: Pick<User, 'id' | 'email' | 'full_name'>;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Form/Input Types
// ============================================

export interface CreateCompanyInput {
  name: string;
  domain?: string;
  domain_management_type: DomainManagementType;
  contact_email: string;
  contact_phone?: string;
}

export interface CreateUserInput {
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  phone?: string;
}

export interface UpdateUserInput {
  full_name?: string;
  phone?: string;
  kakao_alert_enabled?: boolean;
}

export interface SignupInput {
  company_name: string;
  company_slug: string;
  domain?: string;
  domain_management_type: DomainManagementType;
  admin_email: string;
  admin_name: string;
  admin_phone?: string;
  password: string;
}

// ============================================
// Stripe Types
// ============================================

export interface StripeSubscriptionData {
  subscription_id: string;
  customer_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  items: {
    email_seat: {
      item_id: string;
      price_id: string;
      quantity: number;
    };
    kakao_alert?: {
      item_id: string;
      price_id: string;
      quantity: number;
    };
  };
}

// ============================================
// Session/Auth Types
// ============================================

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  company_id: string | null;
  company_name: string | null;
  company_slug: string | null;
  company_status: CompanyStatus | null;
  kakao_alert_enabled: boolean;
}

// ============================================
// Supabase Database Type (for client)
// ============================================

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Company, 'id' | 'created_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      dns_records: {
        Row: DnsRecord;
        Insert: Omit<DnsRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DnsRecord, 'id' | 'created_at'>>;
      };
      dns_requests: {
        Row: DnsRequest;
        Insert: Omit<DnsRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DnsRequest, 'id' | 'created_at'>>;
      };
      subscription_items: {
        Row: SubscriptionItem;
        Insert: Omit<SubscriptionItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SubscriptionItem, 'id' | 'created_at'>>;
      };
      billing_history: {
        Row: BillingHistory;
        Insert: Omit<BillingHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<BillingHistory, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      user_notification_settings: {
        Row: UserNotificationSettings;
        Insert: Omit<UserNotificationSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserNotificationSettings, 'id' | 'created_at'>>;
      };
      kakao_delivery_logs: {
        Row: KakaoDeliveryLog;
        Insert: Omit<KakaoDeliveryLog, 'id' | 'created_at'>;
        Update: Partial<Omit<KakaoDeliveryLog, 'id' | 'created_at'>>;
      };
      email_polling_state: {
        Row: EmailPollingState;
        Insert: Omit<EmailPollingState, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<EmailPollingState, 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never;
      };
      job_records: {
        Row: JobRecord;
        Insert: Omit<JobRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<JobRecord, 'id' | 'created_at'>>;
      };
      admin_settings: {
        Row: AdminSetting;
        Insert: Omit<AdminSetting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AdminSetting, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      get_user_with_company: {
        Args: { user_id: string };
        Returns: SessionUser[];
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_company_id: string | null;
          p_type: NotificationType;
          p_title: string;
          p_message: string;
          p_action_url?: string;
          p_related_entity_type?: string;
          p_related_entity_id?: string;
        };
        Returns: string;
      };
      mark_notifications_read: {
        Args: {
          p_user_id: string;
          p_notification_ids?: string[];
        };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      company_status: CompanyStatus;
      domain_status: DomainStatus;
      domain_management_type: DomainManagementType;
      subscription_status: SubscriptionStatus;
      email_account_status: EmailAccountStatus;
      notification_type: NotificationType;
      notification_channel: NotificationChannel;
      kakao_delivery_status: KakaoDeliveryStatus;
    };
  };
}
