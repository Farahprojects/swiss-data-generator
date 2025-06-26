
-- Add draft customization data column to coach_websites table
ALTER TABLE coach_websites 
ADD COLUMN draft_customization_data jsonb DEFAULT '{}'::jsonb;

-- Add has_unpublished_changes flag to track when draft differs from published
ALTER TABLE coach_websites 
ADD COLUMN has_unpublished_changes boolean DEFAULT false;

-- Copy existing customization_data to draft_customization_data for existing websites
UPDATE coach_websites 
SET draft_customization_data = customization_data 
WHERE draft_customization_data = '{}'::jsonb;
