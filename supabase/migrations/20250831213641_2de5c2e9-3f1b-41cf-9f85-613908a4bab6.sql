-- Create email verification template for signup flow
INSERT INTO public.email_notification_templates (
  template_type, 
  subject, 
  body_html, 
  body_text
) VALUES (
  'email_verification',
  'Please verify your Therai Astro account',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://auth.theraiastro.com/storage/v1/object/public/therai-assets/therai-logo.png" alt="Therai Astro" style="width: 200px; height: auto;" />
  </div>
  <div style="padding: 20px; margin-bottom: 30px;">
    <h1 style="color: #333; margin-top: 0; font-size: 24px;">Welcome to Therai Astro!</h1>
    <p style="color: #555; line-height: 1.6; font-size: 16px;">Thank you for signing up. Please verify your email address to complete your registration and unlock your personalized astrological insights.</p>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{verification_link}}" style="background-color: #7B61FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
      Verify Email Address
    </a>
  </div>
  <div style="color: #555; line-height: 1.6; font-size: 14px; margin-top: 30px;">
    <p>If the button above doesn''t work, you can copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">{{verification_link}}</p>
    <p><strong>Important:</strong> This verification link will expire in 24 hours for security purposes.</p>
  </div>
  <div style="margin-top: 40px; background-color: #f9f9f9; padding: 20px; border-radius: 4px; text-align: center;">
    <p style="margin-bottom: 0; color: #666; font-size: 15px;">Didn''t sign up for Therai Astro? You can safely ignore this email.</p>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center;">
    <p>This is an automated message. Please do not reply directly to this email.</p>
    <p>&copy; 2025 Therai Astro. All rights reserved.</p>
  </div>
</div>',
  'Welcome to Therai Astro!

Thank you for signing up. Please verify your email address to complete your registration.

Click this link to verify: {{verification_link}}

Or copy and paste this link into your browser:
{{verification_link}}

This verification link will expire in 24 hours.

If you didn''t sign up for Therai Astro, you can safely ignore this email.

Thank you,
The Therai Astro Team'
)
ON CONFLICT (template_type) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();