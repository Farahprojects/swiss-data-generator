
-- Update password change template with new logo and improved design
UPDATE public.email_notification_templates 
SET 
  subject = 'Your Therai Astro password has been changed',
  body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://wrvqqvqvwqmfdqvqmaar.supabase.co/storage/v1/object/public/therai-assets/therai-astro-logo.png" alt="Therai Astro" style="width: 200px; height: auto;" />
    </div>
    <div style="background-color: #f8f4ff; border-left: 4px solid #7B61FF; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
      <h1 style="color: #333; margin-top: 0; font-size: 24px;">Password Successfully Changed</h1>
      <p style="color: #555; line-height: 1.6; font-size: 16px;">Your Therai Astro account password was recently changed.</p>
    </div>
    <div style="color: #555; line-height: 1.6; font-size: 16px;">
      <p><strong>What happened:</strong> The password for your Therai Astro account was changed.</p>
      <p><strong>When:</strong> Just now, on {{date}}</p>
      <p><strong>If this was you:</strong> Great! No action is needed. Your account is secure.</p>
      <p><strong>If this wasn''t you:</strong> Please contact our support team immediately by replying to this email.</p>
    </div>
    <div style="margin-top: 40px; background-color: #f9f9f9; padding: 20px; border-radius: 4px; text-align: center;">
      <p style="margin-bottom: 20px; color: #666; font-size: 15px;">Need any help with your account?</p>
      <a href="https://theraiastro.com/support" style="background-color: #7B61FF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Contact Support</a>
    </div>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center;">
      <p>This is an automated security notification. Please do not reply directly to this email.</p>
      <p>&copy; 2025 Therai Astro. All rights reserved.</p>
    </div>
  </div>',
  body_text = 'PASSWORD CHANGE NOTIFICATION

Your Therai Astro account password was recently changed.

What happened: The password for your Therai Astro account was changed.
When: Just now
If this was you: Great! No action is needed. Your account is secure.
If this wasn''t you: Please contact our support team immediately by replying to this email.

Need help with your account?
Visit: https://theraiastro.com/support

This is an automated security notification. Please do not reply directly to this email.

© 2025 Therai Astro. All rights reserved.',
  updated_at = now()
WHERE template_type = 'password_change';

-- Create a bucket for storing email assets if it doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('therai-assets', 'Therai Email Assets', true)
ON CONFLICT (id) DO NOTHING;
