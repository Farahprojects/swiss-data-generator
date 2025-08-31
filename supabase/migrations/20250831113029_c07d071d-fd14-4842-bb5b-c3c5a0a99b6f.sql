-- Remove NOT NULL constraints from columns that will be updated later
ALTER TABLE public.profiles 
ALTER COLUMN subscription_plan DROP NOT NULL,
ALTER COLUMN subscription_status DROP NOT NULL,
ALTER COLUMN features DROP NOT NULL,
ALTER COLUMN metadata DROP NOT NULL;