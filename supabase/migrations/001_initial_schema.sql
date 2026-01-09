-- ============================================
-- Domain Email SaaS - Complete Database Schema
-- Multi-tenant B2B SaaS with Stripe, WHM, Kakao
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

-- User roles in the system
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'employee');

-- Company status
CREATE TYPE company_status AS ENUM ('pending_setup', 'active', 'suspended', 'cancelled');

-- Domain verification status
CREATE TYPE domain_status AS ENUM ('pending', 'dns_pending', 'verified', 'failed');

-- Domain management type (signup flow)
CREATE TYPE domain_management_type AS ENUM (
  'self_managed',        -- 직접 관리
  'agency_managed',      -- 관리 업체가 있음
  'no_domain'            -- 도메인 없음
);

-- Subscription status
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
);

-- Email account status
CREATE TYPE email_account_status AS ENUM (
  'pending', 'active', 'suspended', 'deleted'
);

-- Notification type
CREATE TYPE notification_type AS ENUM (
  'new_email', 'payment_success', 'payment_failed',
  'dns_verified', 'dns_failed', 'account_created',
  'subscription_updated', 'system'
);

-- Notification channel
CREATE TYPE notification_channel AS ENUM ('web', 'email', 'kakao');

-- Kakao delivery status
CREATE TYPE kakao_delivery_status AS ENUM (
  'pending', 'sent', 'delivered', 'failed', 'expired'
);

-- ============================================
-- COMPANIES (TENANTS)
-- ============================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Domain Configuration
  domain VARCHAR(255),
  domain_status domain_status DEFAULT 'pending',
  domain_management_type domain_management_type NOT NULL,
  domain_verified_at TIMESTAMPTZ,

  -- Temporary subdomain (for no_domain or dns_pending cases)
  -- e.g., company.ourmail.co
  temp_subdomain VARCHAR(100) UNIQUE,
  use_temp_domain BOOLEAN DEFAULT false,

  -- Company Contact
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),

  -- WHM/cPanel Integration
  cpanel_account_id VARCHAR(255),
  cpanel_username VARCHAR(100),
  cpanel_package VARCHAR(100),
  whm_server_id VARCHAR(100),

  -- Stripe Integration
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  subscription_status subscription_status DEFAULT 'incomplete',

  -- Billing
  current_seat_count INTEGER DEFAULT 0,
  kakao_alert_user_count INTEGER DEFAULT 0,

  -- Status
  status company_status DEFAULT 'pending_setup',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_domain CHECK (
    domain IS NULL OR domain ~* '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$'
  )
);

-- Indexes for companies
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_stripe_customer ON companies(stripe_customer_id);
CREATE INDEX idx_companies_status ON companies(status);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,

  -- Phone for Kakao
  phone VARCHAR(50),
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,

  -- Role & Company
  role user_role NOT NULL DEFAULT 'employee',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Kakao Alert Subscription (Add-on)
  kakao_alert_enabled BOOLEAN DEFAULT false,
  kakao_alert_consent BOOLEAN DEFAULT false,
  kakao_alert_consent_at TIMESTAMPTZ,

  -- Email Account (linked to cPanel)
  email_account_id VARCHAR(255),
  email_account_status email_account_status DEFAULT 'pending',
  email_quota_mb INTEGER DEFAULT 1000,
  email_used_mb INTEGER DEFAULT 0,

  -- Webmail
  webmail_password_hash TEXT,
  last_webmail_login TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes for users
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_kakao_enabled ON users(kakao_alert_enabled) WHERE kakao_alert_enabled = true;

-- ============================================
-- DNS RECORDS (for domain verification)
-- ============================================

CREATE TABLE dns_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- DNS Record Info
  record_type VARCHAR(20) NOT NULL, -- MX, TXT, CNAME, etc.
  host VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  priority INTEGER,
  ttl INTEGER DEFAULT 3600,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for dns_records
CREATE INDEX idx_dns_records_company ON dns_records(company_id);

-- ============================================
-- DNS REQUESTS (for agency_managed domains)
-- ============================================

CREATE TABLE dns_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Request Info
  agency_name VARCHAR(255),
  agency_email VARCHAR(255),
  agency_phone VARCHAR(50),

  -- Generated Document
  request_document_url TEXT,
  request_sent_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, completed
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STRIPE SUBSCRIPTION ITEMS
-- ============================================

CREATE TABLE subscription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Stripe Info
  stripe_subscription_item_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,

  -- Item Type
  item_type VARCHAR(50) NOT NULL, -- 'email_seat' or 'kakao_alert'

  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for subscription_items
CREATE INDEX idx_subscription_items_company ON subscription_items(company_id);
CREATE INDEX idx_subscription_items_type ON subscription_items(item_type);

-- ============================================
-- BILLING HISTORY
-- ============================================

CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Stripe Invoice Info
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),

  -- Amount
  amount_due INTEGER NOT NULL, -- in cents
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'usd',

  -- Status
  status VARCHAR(50) NOT NULL, -- paid, open, void, uncollectible

  -- Period
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Details
  description TEXT,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Index for billing_history
CREATE INDEX idx_billing_history_company ON billing_history(company_id);
CREATE INDEX idx_billing_history_status ON billing_history(status);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Notification Content
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Related Entity
  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  -- Action URL
  action_url TEXT,

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- USER NOTIFICATION SETTINGS
-- ============================================

CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Channel Settings
  web_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  kakao_enabled BOOLEAN DEFAULT false, -- Linked to paid subscription

  -- Type-specific Settings
  new_email_web BOOLEAN DEFAULT true,
  new_email_email BOOLEAN DEFAULT false,
  new_email_kakao BOOLEAN DEFAULT false,

  payment_web BOOLEAN DEFAULT true,
  payment_email BOOLEAN DEFAULT true,
  payment_kakao BOOLEAN DEFAULT false,

  system_web BOOLEAN DEFAULT true,
  system_email BOOLEAN DEFAULT true,
  system_kakao BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- KAKAO DELIVERY LOGS
-- ============================================

CREATE TABLE kakao_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  -- Solapi Info
  solapi_message_id VARCHAR(255),
  solapi_group_id VARCHAR(255),

  -- Message Content
  template_id VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  variables JSONB,

  -- Status
  status kakao_delivery_status DEFAULT 'pending',
  status_message TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for kakao_delivery_logs
CREATE INDEX idx_kakao_logs_user ON kakao_delivery_logs(user_id);
CREATE INDEX idx_kakao_logs_status ON kakao_delivery_logs(status);
CREATE INDEX idx_kakao_logs_created ON kakao_delivery_logs(created_at DESC);

-- ============================================
-- EMAIL POLLING STATE
-- ============================================

CREATE TABLE email_polling_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Polling State
  last_uid BIGINT DEFAULT 0,
  last_poll_at TIMESTAMPTZ,
  mailbox VARCHAR(100) DEFAULT 'INBOX',

  -- Error Tracking
  consecutive_errors INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, mailbox)
);

-- ============================================
-- AUDIT LOGS (for compliance)
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Action
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Details
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- JOB QUEUE RECORDS (for BullMQ tracking)
-- ============================================

CREATE TABLE job_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Job Info
  queue_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255) NOT NULL,
  job_name VARCHAR(100) NOT NULL,

  -- Related Entities
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Data
  payload JSONB,
  result JSONB,
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Indexes for job_records
CREATE INDEX idx_job_records_queue ON job_records(queue_name);
CREATE INDEX idx_job_records_status ON job_records(status);

-- ============================================
-- SUPER ADMIN SETTINGS
-- ============================================

CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Setting
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO admin_settings (key, value, description) VALUES
  ('email_seat_price', '{"amount": 500, "currency": "usd"}', 'Email seat price in cents'),
  ('kakao_alert_price', '{"amount": 200, "currency": "usd"}', 'Kakao alert add-on price in cents'),
  ('default_email_quota_mb', '1000', 'Default email quota in MB'),
  ('temp_domain_suffix', '"ourmail.co"', 'Temporary domain suffix'),
  ('max_seats_per_company', '100', 'Maximum seats per company'),
  ('trial_days', '14', 'Trial period in days');

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kakao_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_polling_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - COMPANIES
-- ============================================

-- Super admins can see all companies
CREATE POLICY "Super admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Company members can view their own company
CREATE POLICY "Company members can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users WHERE users.id = auth.uid()
    )
  );

-- Super admins can insert companies
CREATE POLICY "Super admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Allow service role to insert (for signup flow)
CREATE POLICY "Service role can insert companies"
  ON companies FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Company admins can update their own company (limited fields)
CREATE POLICY "Company admins can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_admin', 'super_admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_admin', 'super_admin')
    )
  );

-- ============================================
-- RLS POLICIES - USERS
-- ============================================

-- Users can view themselves
CREATE POLICY "Users can view self"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Company admins can view company members
CREATE POLICY "Company admins can view company members"
  ON users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_admin', 'super_admin')
    )
  );

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Users can update themselves (limited)
CREATE POLICY "Users can update self"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Company admins can update company members
CREATE POLICY "Company admins can update company members"
  ON users FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'company_admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'company_admin'
    )
  );

-- Service role can insert users
CREATE POLICY "Service role can insert users"
  ON users FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - NOTIFICATIONS
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - USER NOTIFICATION SETTINGS
-- ============================================

CREATE POLICY "Users can view own notification settings"
  ON user_notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification settings"
  ON user_notification_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own notification settings"
  ON user_notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- RLS POLICIES - BILLING
-- ============================================

-- Company admins can view billing history
CREATE POLICY "Company admins can view billing history"
  ON billing_history FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_admin', 'super_admin')
    )
  );

-- Super admins can view all billing
CREATE POLICY "Super admins can view all billing"
  ON billing_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- ============================================
-- RLS POLICIES - ADMIN SETTINGS
-- ============================================

-- Only super admins can view admin settings
CREATE POLICY "Super admins can view admin settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Only super admins can update admin settings
CREATE POLICY "Super admins can update admin settings"
  ON admin_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_dns_records_updated_at
  BEFORE UPDATE ON dns_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_dns_requests_updated_at
  BEFORE UPDATE ON dns_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscription_items_updated_at
  BEFORE UPDATE ON subscription_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_email_polling_updated_at
  BEFORE UPDATE ON email_polling_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Get user with company info
-- ============================================

CREATE OR REPLACE FUNCTION get_user_with_company(user_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role user_role,
  company_id UUID,
  company_name VARCHAR,
  company_slug VARCHAR,
  company_status company_status,
  kakao_alert_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.company_id,
    c.name as company_name,
    c.slug as company_slug,
    c.status as company_status,
    u.kakao_alert_enabled
  FROM users u
  LEFT JOIN companies c ON u.company_id = c.id
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update seat count
-- ============================================

CREATE OR REPLACE FUNCTION update_company_seat_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the company's seat count when users are added/removed/activated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE companies
    SET current_seat_count = (
      SELECT COUNT(*)
      FROM users
      WHERE company_id = NEW.company_id
      AND is_active = true
      AND role != 'super_admin'
    )
    WHERE id = NEW.company_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE companies
    SET current_seat_count = (
      SELECT COUNT(*)
      FROM users
      WHERE company_id = OLD.company_id
      AND is_active = true
      AND role != 'super_admin'
    )
    WHERE id = OLD.company_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_seat_count
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION update_company_seat_count();

-- ============================================
-- FUNCTION: Update Kakao alert user count
-- ============================================

CREATE OR REPLACE FUNCTION update_kakao_alert_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    UPDATE companies
    SET kakao_alert_user_count = (
      SELECT COUNT(*)
      FROM users
      WHERE company_id = NEW.company_id
      AND kakao_alert_enabled = true
      AND is_active = true
    )
    WHERE id = NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_kakao_count
  AFTER UPDATE OF kakao_alert_enabled ON users
  FOR EACH ROW EXECUTE FUNCTION update_kakao_alert_count();

-- ============================================
-- FUNCTION: Create notification
-- ============================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_company_id UUID,
  p_type notification_type,
  p_title VARCHAR,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_related_entity_type VARCHAR DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, company_id, type, title, message,
    action_url, related_entity_type, related_entity_id
  ) VALUES (
    p_user_id, p_company_id, p_type, p_title, p_message,
    p_action_url, p_related_entity_type, p_related_entity_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Mark notifications as read
-- ============================================

CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = false;
  ELSE
    -- Mark specific ones as read
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id
    AND id = ANY(p_notification_ids)
    AND is_read = false;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
