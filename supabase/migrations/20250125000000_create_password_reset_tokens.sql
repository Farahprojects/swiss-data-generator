-- Create password_reset_tokens table for token_hash -> email mapping
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage tokens
CREATE POLICY "Service role can manage password reset tokens" ON password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Create policy to allow users to read their own tokens (if needed)
CREATE POLICY "Users can read their own tokens" ON password_reset_tokens
  FOR SELECT USING (auth.email() = email);
