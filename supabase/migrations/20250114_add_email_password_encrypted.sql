-- Add encrypted email password column for webmail SSO auto-login
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_password_encrypted TEXT;

-- Add comment
COMMENT ON COLUMN users.email_password_encrypted IS 'AES-256-GCM encrypted webmail password for SSO auto-login';
