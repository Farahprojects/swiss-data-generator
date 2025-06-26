
-- Update template names to match existing React components
UPDATE website_templates 
SET name = 'Creative' 
WHERE name = 'Warm';

UPDATE website_templates 
SET name = 'Professional' 
WHERE name = 'Elegant';
