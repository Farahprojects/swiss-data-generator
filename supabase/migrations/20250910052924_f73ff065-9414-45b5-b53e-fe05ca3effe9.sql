-- Change chat_id column from UUID to TEXT to support guest prefixes
ALTER TABLE guest_reports ALTER COLUMN chat_id TYPE TEXT;