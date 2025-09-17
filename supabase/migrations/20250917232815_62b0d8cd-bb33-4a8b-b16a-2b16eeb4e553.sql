-- Check if user_preferences table has the foreign key constraint and drop it if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_preferences_user_id_fkey' 
        AND table_name = 'user_preferences'
    ) THEN
        ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_user_id_fkey;
    END IF;
END $$;