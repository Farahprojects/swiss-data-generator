-- Create email verification template for signup flow
INSERT INTO public.email_notification_templates (
  template_type, 
  subject, 
  body_html, 
  body_text
) VALUES (
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
  'Welcome to Therai!

Thank you for signing up. Please verify your email address to complete your registration.

Click this link to verify: {{verification_link}}

This verification link will expire in 24 hours.

If you didn''t sign up for Therai, you can safely ignore this email.

Thank you,
The Therai Team'
),
(
  'password_reset',
  'Reset your Therai password',
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
  'Reset your Therai password

We received a request to reset your password. Click the link below to create a new password.

Reset your password: {{verification_link}}

This link will expire in 24 hours for your security.

If you didn''t request this password reset, you can safely ignore this email. Your password won''t be changed.

Thank you,
The Therai Team'
),
(
  'support_email',
  'Thank you for contacting Therai support',
  '<div style="font-family: ''GT Sectra'', serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e8e8e8; border-radius: 8px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #000; margin: 0; font-size: 32px; font-weight: 400; font-family: ''GT Sectra'', serif;">Therai</h1>
  </div>
  <div style="margin-bottom: 30px;">
    <h2 style="color: #333; margin-top: 0; font-size: 24px; font-family: Arial, sans-serif;">Thank You for Contacting Us</h2>
    <p style="color: #555; line-height: 1.6; font-size: 16px; font-family: Arial, sans-serif;">We have received your message and will get back to you as soon as possible.</p>
  </div>
  <div style="color: #555; line-height: 1.6; font-size: 14px; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 4px;">
    <p><strong>What happens next?</strong></p>
    <p>• Our support team will review your message</p>
    <p>• We typically respond within 24 hours</p>
    <p>• You''ll receive a direct reply to this email</p>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
    <p>This is an automated confirmation. Please do not reply directly to this email.</p>
    <p>&copy; 2025 Therai. All rights reserved.</p>
  </div>
</div>',
  'Thank You for Contacting Therai Support

We have received your message and will get back to you as soon as possible.

What happens next?
• Our support team will review your message
• We typically respond within 24 hours  
• You''ll receive a direct reply to this email

Thank you,
The Therai Team'
)
ON CONFLICT (template_type) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();