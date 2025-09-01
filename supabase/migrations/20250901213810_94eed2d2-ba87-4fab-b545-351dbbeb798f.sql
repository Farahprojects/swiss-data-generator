-- Update the subscription pricing with new cosmic copy
UPDATE price_list 
SET 
  name = 'Unlock Unlimited Insights — Go Deeper Every Day',
  description = 'Step into full access: ongoing guidance, advanced relationship insights, and personalized AI support whenever you need it. Unlimited relationship chats + tailored insights just for you.'
WHERE id = 'subscription1';

-- Update the essence/try-it pricing with new cosmic copy  
UPDATE price_list 
SET 
  name = 'Try It Once — Discover Your Cosmic Snapshot',
  description = 'Get a personalized report that reveals where you are right now and what''s shaping your path ahead. Your birth chart + today''s transits combined in one powerful insight.'
WHERE id = 'essence';