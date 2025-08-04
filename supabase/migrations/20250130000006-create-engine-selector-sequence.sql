-- Create a lightweight PostgreSQL sequence for engine selection
-- This provides atomic, O(1) round-robin selection that scales to thousands of concurrent users
CREATE SEQUENCE IF NOT EXISTS engine_selector_seq;

-- Add a comment to document the purpose
COMMENT ON SEQUENCE engine_selector_seq IS 'Used for atomic round-robin selection of AI report engines'; 