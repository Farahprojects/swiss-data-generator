-- Update pricing plans structure
-- Clear existing subscription data
DELETE FROM price_list WHERE endpoint = 'subscription';

-- Insert new pricing plans
INSERT INTO price_list (
  id, 
  endpoint, 
  report_type, 
  name, 
  description, 
  unit_price_usd, 
  created_at, 
  product_code, 
  is_ai
) VALUES
-- Personal Plan (Thread-Limited)
('subscription_personal', 'subscription', 'subscription', 
 'Personal Growth Plan — Focus on Your Intentions', 
 'Ideal for individuals: create up to 10 intention threads per month, receive AI guidance and insights tailored to your journey.', 
 25.00, '2025-01-24 00:00:00+00', 'SUB_PERSONAL_MONTHLY', 'subscription'),

-- Professional Plan (Unlimited)
('subscription_professional', 'subscription', 'subscription', 
 'Professional Plan — Unlimited Coaching Power', 
 'Designed for coaches or power users: unlimited intention threads, full AI support, and advanced insights for multiple clients.', 
 75.00, '2025-01-24 00:00:00+00', 'SUB_PROFESSIONAL_MONTHLY', 'subscription'),

-- One-Time Purchase (Single Intention)
('subscription_onetime', 'subscription', 'subscription', 
 'Single-Intention Pass — Focused Journey', 
 'Perfect for trying the system with one intention thread: 2-month guided experience with AI insights. No subscription required.', 
 20.00, '2025-01-24 00:00:00+00', 'SUB_ONETIME_INTENTION', 'subscription');
