-- ============================================================================
-- COPY EXACT EMAIL NOTIFICATION TEMPLATES TABLE
-- Copy/paste this entire file into your TheraiAstro Supabase SQL Editor
-- ============================================================================

-- Create table with exact same structure
CREATE TABLE IF NOT EXISTS "public"."email_notification_templates" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "template_type" text NOT NULL,
    "subject" text NOT NULL,
    "body_html" text NOT NULL,
    "body_text" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add primary key and unique constraint
ALTER TABLE ONLY "public"."email_notification_templates"
    ADD CONSTRAINT "email_notification_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."email_notification_templates"
    ADD CONSTRAINT "email_notification_templates_template_type_key" UNIQUE ("template_type");

-- Enable RLS
ALTER TABLE "public"."email_notification_templates" ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY "Allow all users to view email templates" 
    ON "public"."email_notification_templates" 
    FOR SELECT 
    USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON "public"."email_notification_templates"
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- Grant permissions
GRANT ALL ON TABLE "public"."email_notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_notification_templates" TO "service_role";

-- Now copy your existing templates from old database to new one:
-- 1. Go to old database SQL editor and run:
--    SELECT * FROM email_notification_templates;
-- 2. Copy the results
-- 3. Insert them here using:
--    INSERT INTO email_notification_templates (template_type, subject, body_html, body_text) VALUES ...
