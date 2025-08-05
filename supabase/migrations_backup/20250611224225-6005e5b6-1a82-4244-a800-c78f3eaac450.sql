
-- Check if RLS is enabled on journal_entries table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'journal_entries';

-- Check what RLS policies exist on journal_entries table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'journal_entries';

-- Test the actual query that the frontend is making (as the authenticated user would see it)
-- This simulates what happens when the frontend calls journalEntriesService.getJournalEntries()
SELECT id, client_id, coach_id, title, entry_text, created_at, updated_at
FROM journal_entries 
WHERE client_id = '8202487e-5273-485f-8514-20c656f354bb'
ORDER BY created_at DESC;

-- Also check if there are any journal entries at all in the database
SELECT COUNT(*) as total_journal_entries FROM journal_entries;

-- Check what client_ids exist in journal_entries
SELECT DISTINCT client_id, COUNT(*) as entry_count 
FROM journal_entries 
GROUP BY client_id;
