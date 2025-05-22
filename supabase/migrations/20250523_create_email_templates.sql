
-- Check if table exists, if not create it
CREATE TABLE IF NOT EXISTS public.email_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR NOT NULL UNIQUE,
  subject VARCHAR NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert or update password change template
INSERT INTO public.email_notification_templates (template_type, subject, html_template, text_template)
VALUES (
  'password_change',
  'Your password has been changed',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #333;">Password Changed</h1>
    </div>
    <div style="color: #555; line-height: 1.6;">
      <p>Hello,</p>
      <p>We wanted to let you know that the password for your account was recently changed.</p>
      <p>If you made this change, you can disregard this email.</p>
      <p>If you did not change your password, please contact our support team immediately.</p>
    </div>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 12px; text-align: center;">
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>',
  'Hello,\n\nWe wanted to let you know that the password for your account was recently changed.\n\nIf you made this change, you can disregard this email.\n\nIf you did not change your password, please contact our support team immediately.\n\nThis is an automated message, please do not reply to this email.'
)
ON CONFLICT (template_type) 
DO UPDATE SET 
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  updated_at = now();

-- Insert or update email change template
INSERT INTO public.email_notification_templates (template_type, subject, html_template, text_template)
VALUES (
  'email_change',
  'Your email address has been changed',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #333;">Email Address Changed</h1>
    </div>
    <div style="color: #555; line-height: 1.6;">
      <p>Hello,</p>
      <p>We wanted to let you know that the email address for your account was recently changed to {{newEmail}}.</p>
      <p>If you made this change, you can disregard this email.</p>
      <p>If you did not change your email address, please contact our support team immediately.</p>
    </div>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 12px; text-align: center;">
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>',
  'Hello,\n\nWe wanted to let you know that the email address for your account was recently changed to {{newEmail}}.\n\nIf you made this change, you can disregard this email.\n\nIf you did not change your email address, please contact our support team immediately.\n\nThis is an automated message, please do not reply to this email.'
)
ON CONFLICT (template_type) 
DO UPDATE SET 
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  updated_at = now();

-- Insert or update security alert template
INSERT INTO public.email_notification_templates (template_type, subject, html_template, text_template)
VALUES (
  'security_alert',
  'Security Alert: {{alertType}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #333;">Security Alert</h1>
    </div>
    <div style="color: #555; line-height: 1.6;">
      <p>Hello,</p>
      <p>We detected a security event related to your account: {{alertType}}</p>
      <p>If this was you, you can disregard this email.</p>
      <p>If you did not perform this action, please contact our support team immediately.</p>
    </div>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 12px; text-align: center;">
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>',
  'Hello,\n\nWe detected a security event related to your account: {{alertType}}.\n\nIf this was you, you can disregard this email.\n\nIf you did not perform this action, please contact our support team immediately.\n\nThis is an automated message, please do not reply to this email.'
)
ON CONFLICT (template_type) 
DO UPDATE SET 
  subject = EXCLUDED.subject,
  html_template = EXCLUDED.html_template,
  text_template = EXCLUDED.text_template,
  updated_at = now();

-- Create or replace function to update the timestamps
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_email_templates_updated_at'
  ) THEN
    CREATE TRIGGER set_email_templates_updated_at
    BEFORE UPDATE ON public.email_notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();
  END IF;
END
$$;
