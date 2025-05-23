
-- Insert or update the support email template
INSERT INTO public.email_notification_templates (template_type, subject, body_html, body_text)
VALUES (
  'support_email',
  'Thank you for contacting Theria Astro',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #333;">Thank You for Contacting Us</h1>
    </div>
    <div style="color: #555; line-height: 1.6;">
      <p>Hello {{name}},</p>
      <p>Thank you for reaching out to us. We have received your message and a member of our team will get back to you as soon as possible, usually within 24 hours.</p>
      <p>In the meantime, you may find answers to common questions in our <a href="https://theraiapi.com/documentation">documentation</a>.</p>
      <p>We appreciate your interest in Theria Astro and look forward to assisting you.</p>
      <p>Best regards,<br>The Theria Team</p>
    </div>
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e8e8e8; color: #999; font-size: 12px; text-align: center;">
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>',
  'Hello {{name}},\n\nThank you for reaching out to us. We have received your message and a member of our team will get back to you as soon as possible, usually within 24 hours.\n\nIn the meantime, you may find answers to common questions in our documentation at https://theraiapi.com/documentation\n\nWe appreciate your interest in Theria Astro and look forward to assisting you.\n\nBest regards,\nThe Theria Team\n\nThis is an automated message, please do not reply to this email.'
)
ON CONFLICT (template_type) 
DO UPDATE SET 
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();
