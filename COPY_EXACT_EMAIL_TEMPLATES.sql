-- ============================================================================
-- EXACT EMAIL NOTIFICATION TEMPLATES COPY
-- Copy/paste this entire file into your TheraiAstro Supabase SQL Editor
-- ============================================================================

-- Create table with exact structure
CREATE TABLE IF NOT EXISTS "public"."email_notification_templates" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "template_type" text NOT NULL,
    "subject" text NOT NULL,
    "body_html" text NOT NULL,
    "body_text" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add primary key and unique constraint
ALTER TABLE ONLY "public"."email_notification_templates"
    ADD CONSTRAINT "email_notification_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."email_notification_templates"
    ADD CONSTRAINT "email_notification_templates_template_type_key" UNIQUE ("template_type");

-- Enable RLS
ALTER TABLE "public"."email_notification_templates" ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Allow all users to view email templates" 
    ON "public"."email_notification_templates" 
    FOR SELECT 
    USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON "public"."email_notification_templates"
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- Grant permissions
GRANT ALL ON TABLE "public"."email_notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_notification_templates" TO "service_role";

-- Insert EXACT templates with original IDs and timestamps
INSERT INTO email_notification_templates (id, template_type, subject, body_html, body_text, created_at, updated_at)
VALUES 
    ('0ae07d79-dad2-43ad-8a05-43e641e332cd', 
    'email_change',
    'Your Therai email address has been changed',
    '<div style="font-family: ''GT Sectra'', serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; margin: 0; font-size: 32px; font-weight: 400; font-family: ''GT Sectra'', serif;">Therai</h1>
  </div>
  <div style="margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0; font-size: 24px; font-family: Arial, sans-serif;">Email Address Updated</h2>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">This message confirms that the email address for your Therai account has been changed.</p>
  </div>
  <div style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 4px;">
    <p><strong>Previous Email:</strong> {{old_email}}</p>
    <p><strong>New Email:</strong> {{new_email}}</p>
    <p><strong>When:</strong> {{date}}</p>
    <p><strong>If this was you:</strong> You''re all set.</p>
    <p><strong>If this wasn''t you:</strong> Please contact our support team immediately.</p>
  </div>
  <div style="margin-top: 40px; background-color: #f9f9f9; padding: 20px; border-radius: 4px; text-align: center;">
    <p style="margin-bottom: 20px; color: #666; font-size: 15px; font-family: Arial, sans-serif;">Need help or didn''t make this change?</p>
    <a href="https://therai.co/support" style="background-color: #ffffff; color: #000; padding: 12px 25px; text-decoration: none; border: 2px solid #000; border-radius: 25px; font-weight: 500; display: inline-block; font-family: Arial, sans-serif;">Contact Support</a>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
    <p>This is an automated system message. Please do not reply directly to this email.</p>
    <p>&copy; 2025 Therai. All rights reserved.</p>
  </div>
</div>',
    'Email Change Notification\n\nHello, this is a notification that your email address was recently changed to a new email.\n\nIf you made this change, no further action is required.\n\nIf you did not change your email address, please contact support immediately.\n\nThank you,\',
    '2025-05-21 23:00:03.051188+00',
    '2025-09-23 23:30:07.025231+00'),

    ('e1f2234d-5fba-4e1a-b512-cf23130f91f5',
    'password_change',
    'Your Therai password has been changed',
    '<div style="font-family: ''GT Sectra'', serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; margin: 0; font-size: 32px; font-weight: 400; font-family: ''GT Sectra'', serif;">Therai</h1>
  </div>
  <div style="margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0; font-size: 24px; font-family: Arial, sans-serif;">Reset Your Password</h2>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">We received a request to reset your password. Click the button below to create a new password.</p>
  </div>
  <div style="text-align: center; margin: 40px 0;">
    <a href="{{verification_link}}" style="background-color: #ffffff; color: #000; padding: 15px 30px; text-decoration: none; border: 2px solid #000; border-radius: 25px; font-weight: 500; display: inline-block; font-family: Arial, sans-serif; font-size: 16px;">Reset Password</a>
  </div>
  <div style="color: #555; line-height: 1.6; font-size: 14px; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 4px;">
    <p><strong>Security Note:</strong> This link will expire in 24 hours for your security.</p>
    <p><strong>Didn''t request this?</strong> You can safely ignore this email. Your password won''t be changed.</p>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
    <p>This is an automated password reset request. Please do not reply directly to this email.</p>
    <p>&copy; 2025 Therai. All rights reserved.</p>
  </div>
</div>',
    'PASSWORD CHANGE NOTIFICATION\n\nYour Therai account password was recently changed.\n\nWhat happened: The password for your Therai account was changed.\nWhen: Just now\nIf this was you: Great! No action is needed. Your account is secure.\nIf this wasn''t you: Please contact our support team immediately by replying to this email.\n\nNeed help with your account?\nVisit: https://therai.com/support\n\nThis is an automated security notification. Please do not reply directly to this email.\n\n© 2025 Therai. All rights reserved.',
    '2025-05-21 23:00:03.051188+00',
    '2025-09-23 23:09:33.834854+00'),

    ('9afcfeed-b217-4cd2-8af7-39a1067fb1f1',
    'report_delivery',
    'Your Energetic Overlay Report is Ready',
    '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Your Energetic Overlay Report</title>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  </head>\n  <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">\n    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; width: 100%;">\n      <tr>\n        <td align="center" style="padding: 20px;">\n          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.07); padding: 24px;">\n            <tr>\n              <td style="text-align: left;">\n                <img\n                  src="https://auth.therai.co/storage/v1/object/public/therai-assets/therai-logo.png"\n                  alt="Therai Logo"\n                  style="width: 160px; max-width: 100%; margin-bottom: 12px;"\n                />\n\n                <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #1a1a1a;">\n                  Your Energetic Overlay Report is Ready\n                </h2>\n\n                <p style="font-size: 15px; color: #374151; margin: 0 0 20px;">\n                  We''ve finished generating your personalized energetic overlay report, based on your unique astrological blueprint. The full report has been attached as a PDF to this email.\n                </p>\n\n                <p style="font-size: 15px; color: #374151; margin: 0 0 20px;">\n                  We hope this helps you better understand your current flow, your energetic strengths, and how to realign when needed.\n                </p>\n\n                <p style="font-size: 13px; color: #6b7280; margin: 0 0 20px;">\n                  If you didn''t request this report or believe it was sent in error, you can safely ignore this email.\n                </p>\n\n                <div style="margin-top: 32px; font-size: 12px; color: #6b7280; text-align: left;">\n                  <a href="https://www.theraiastro.com" style="color: #6b7280; text-decoration: none;">www.theraiastro.com</a> &nbsp;|&nbsp; Since 2025\n                </div>\n              </td>\n            </tr>\n          </table>\n        </td>\n      </tr>\n    </table>\n  </body>\n</html>',
    'Your report is attached as a PDF. We hope it helps you realign, reflect, and understand your energetic state.',
    '2025-06-17 10:56:17.104922+00',
    '2025-09-18 01:53:32.153505+00'),

    ('becaf84d-707f-443b-b53e-b16c8ed626fb',
    'email_verification',
    'Please verify your Therai account',
    '<div style="font-family: ''GT Sectra'', serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; margin: 0; font-size: 32px; font-weight: 400; font-family: ''GT Sectra'', serif;">Therai</h1>
  </div>
  <div style="margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0; font-size: 24px; font-family: Arial, sans-serif;">Verify Your Email</h2>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">Thank you for signing up. Please verify your email address to complete your registration.</p>
  </div>
  <div style="text-align: center; margin: 40px 0;">
    <a href="{{verification_link}}" style="background-color: #ffffff; color: #000; padding: 15px 30px; text-decoration: none; border: 2px solid #000; border-radius: 25px; font-weight: 500; display: inline-block; font-family: Arial, sans-serif; font-size: 16px;">Verify Email</a>
  </div>
  <div style="color: #555; line-height: 1.6; font-size: 14px; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 4px;">
    <p><strong>Security Note:</strong> This link will expire in 24 hours for your security.</p>
    <p><strong>Didn''t sign up?</strong> You can safely ignore this email.</p>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
    <p>This is an automated verification request. Please do not reply directly to this email.</p>
    <p>&copy; 2025 Therai. All rights reserved.</p>
  </div>
</div>',
    'Welcome to Therai!\n\nThank you for signing up. Please verify your email address to complete your registration.\n\nClick this link to verify: {{verification_link}}\n\nOr copy and paste this link into your browser:\n{{verification_link}}\n\nThis verification link will expire in 24 hours.\n\nIf you didn''t sign up to Therai, you can safely ignore this email.\n\nThank you,\nTherai Team',
    '2025-08-31 21:36:40.470038+00',
    '2025-09-23 23:27:18.01727+00'),

    ('5b873b89-4180-428a-8e09-956efd90e2af',
    'support_email',
    'Your email inquiry has been received',
    '<div style="font-family: ''GT Sectra'', serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; margin: 0; font-size: 32px; font-weight: 400; font-family: ''GT Sectra'', serif;">Therai</h1>
  </div>
  <div style="margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0; font-size: 24px; font-family: Arial, sans-serif;">Thank You for Contacting Us</h2>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">Hello {{name}},</p>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">Thank you for reaching out to us. We have received your message and a member of our team will get back to you as soon as possible, usually within 24 hours.</p>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">In the meantime, you may find answers to common questions in our <a href="https://therai.co/support" style="color: #000; text-decoration: underline;">support</a>.</p>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">We appreciate your interest in Therai and look forward to assisting you.</p>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">Best regards,<br>Therai Team</p>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
    <p>This is an automated message. Please do not reply directly to this email.</p>
    <p>&copy; 2025 Therai. All rights reserved.</p>
  </div>
</div>',
    'Hi there,\n\nThanks for reaching out to Theria. We''ve received your message and our team will get back to you within 24 hours.\n\nTalk soon,\nThe Theria Team\nhttps://therai.co',
    '2025-05-23 07:06:43.214809+00',
    '2025-09-23 23:43:31.357269+00')
ON CONFLICT (template_type) DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    updated_at = EXCLUDED.updated_at;

-- Verify templates were copied
SELECT template_type, subject, created_at, updated_at 
FROM email_notification_templates 
ORDER BY template_type;
