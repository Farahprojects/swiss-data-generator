-- Phase 1: Remove foreign key constraints from guest_reports table
-- This eliminates the cascade blocking issues that prevent edge functions from running independently

-- Drop the foreign key constraint for translator_log_id
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'guest_reports_translator_log_id_fkey'
        AND table_name = 'guest_reports'
    ) THEN
        ALTER TABLE public.guest_reports DROP CONSTRAINT guest_reports_translator_log_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint: guest_reports_translator_log_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint guest_reports_translator_log_id_fkey does not exist';
    END IF;
END $$;

-- Drop the foreign key constraint for report_log_id  
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'guest_reports_report_log_id_fkey'
        AND table_name = 'guest_reports'
    ) THEN
        ALTER TABLE public.guest_reports DROP CONSTRAINT guest_reports_report_log_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint: guest_reports_report_log_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint guest_reports_report_log_id_fkey does not exist';
    END IF;
END $$;

-- The UUID columns translator_log_id and report_log_id remain for reference
-- but without the constraining foreign key relationships
-- This allows edge functions to run independently without blocking each other