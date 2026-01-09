-- ============================================
-- Employee Invitations Table
-- ============================================

-- Create employee_invitations table
CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token varchar(64) UNIQUE NOT NULL,
  email varchar(255) NOT NULL,
  full_name varchar(100) NOT NULL,
  phone varchar(20) NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  kakao_alert_enabled boolean DEFAULT false,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  kakao_sent_at timestamptz,
  kakao_delivery_status varchar(20),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company ON employee_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON employee_invitations(email);

-- Trigger to update updated_at
CREATE TRIGGER update_employee_invitations_updated_at
  BEFORE UPDATE ON employee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY "Super admin full access on invitations"
  ON employee_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Company admin can manage their company's invitations
CREATE POLICY "Company admin can manage company invitations"
  ON employee_invitations FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'company_admin'
    )
  );

-- Anyone can read invitation by token (for registration page)
CREATE POLICY "Anyone can read invitation by token"
  ON employee_invitations FOR SELECT
  USING (true);

-- Grant permissions
GRANT ALL ON employee_invitations TO authenticated;
GRANT SELECT ON employee_invitations TO anon;
