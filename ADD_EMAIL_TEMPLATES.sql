-- ============================================================================
-- EMAIL NOTIFICATION TEMPLATES TABLE - Standalone Setup
-- Copy/paste this entire file into your TheraiAstro Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_notification_templates(template_type);

-- RLS
ALTER TABLE email_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view email templates"
    ON email_notification_templates FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage email templates"
    ON email_notification_templates FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON email_notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- Insert default templates for Swiss Data Generator
INSERT INTO email_notification_templates (template_type, subject, body_html, body_text)
VALUES 
(
    'email_verification',
    'Verify your Swiss Data Generator account',
    '<html>
    <body style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-weight: 300; font-style: italic; color: #111827; font-size: 32px;">Swiss Data Generator</h1>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
            <h2 style="font-weight: 300; color: #111827; font-size: 24px; margin-bottom: 16px;">Verify Your Email</h2>
            <p style="color: #6b7280; font-weight: 300; line-height: 1.6; margin-bottom: 24px;">
                Thanks for signing up! Click the button below to verify your email and start generating Swiss ephemeris data.
            </p>
            <div style="text-align: center;">
                <a href="{{verification_link}}" 
                   style="display: inline-block; background: #111827; color: white; padding: 14px 32px; 
                          border-radius: 12px; text-decoration: none; font-weight: 300; font-size: 16px;">
                    Verify Email Address
                </a>
            </div>
        </div>
        
        <p style="color: #9ca3af; font-size: 14px; font-weight: 300; text-align: center;">
            If you didn''t create this account, you can safely ignore this email.
        </p>
    </body>
    </html>',
    'Verify your Swiss Data Generator account. Click the link: {{verification_link}}'
),
(
    'support_email',
    'New Contact Form Submission',
    '<html>
    <body style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-weight: 300; color: #111827;">New Contact Form Submission</h2>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 20px 0;">
            <p><strong>From:</strong> {{name}}</p>
            <p><strong>Email:</strong> {{email}}</p>
            <p><strong>Subject:</strong> {{subject}}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">{{message}}</p>
        </div>
    </body>
    </html>',
    'New Contact Form Submission from {{name}} ({{email}}): {{message}}'
),
(
    'welcome_email',
    'Welcome to Swiss Data Generator!',
    '<html>
    <body style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-weight: 300; font-style: italic; color: #111827; font-size: 32px;">Welcome!</h1>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
            <p style="color: #6b7280; font-weight: 300; line-height: 1.6; margin-bottom: 16px;">
                You''re all set! Your Swiss Data Generator subscription is now active.
            </p>
            <p style="color: #6b7280; font-weight: 300; line-height: 1.6; margin-bottom: 24px;">
                Start generating accurate Swiss ephemeris data for your astrological applications.
            </p>
            <div style="text-align: center;">
                <a href="https://yourapp.com/generate" 
                   style="display: inline-block; background: #111827; color: white; padding: 14px 32px; 
                          border-radius: 12px; text-decoration: none; font-weight: 300; font-size: 16px;">
                    Start Generating Data
                </a>
            </div>
        </div>
    </body>
    </html>',
    'Welcome to Swiss Data Generator! Your subscription is now active. Start generating data at: https://yourapp.com/generate'
)
ON CONFLICT (template_type) DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    updated_at = NOW();

-- Verify templates were inserted
SELECT 
    template_type, 
    subject,
    created_at 
FROM email_notification_templates 
ORDER BY template_type;

