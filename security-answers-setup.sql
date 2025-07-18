-- Security Answers Table Setup for KPI Application
-- This script sets up the security_answers table with proper RLS policies

-- Enable RLS on the security_answers table
ALTER TABLE public.security_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_answers table

-- Policy: Users can view their own security answers
DROP POLICY IF EXISTS "Users can view their own security answers" ON public.security_answers;
CREATE POLICY "Users can view their own security answers" 
    ON public.security_answers FOR SELECT 
    USING (profile_id = auth.uid());

-- Policy: Users can insert their own security answers
DROP POLICY IF EXISTS "Users can insert their own security answers" ON public.security_answers;
CREATE POLICY "Users can insert their own security answers" 
    ON public.security_answers FOR INSERT 
    WITH CHECK (profile_id = auth.uid());

-- Policy: Users can update their own security answers
DROP POLICY IF EXISTS "Users can update their own security answers" ON public.security_answers;
CREATE POLICY "Users can update their own security answers" 
    ON public.security_answers FOR UPDATE 
    USING (profile_id = auth.uid());

-- Policy: Users can delete their own security answers
DROP POLICY IF EXISTS "Users can delete their own security answers" ON public.security_answers;
CREATE POLICY "Users can delete their own security answers" 
    ON public.security_answers FOR DELETE 
    USING (profile_id = auth.uid());

-- Create an index for better performance on profile_id lookups
CREATE INDEX IF NOT EXISTS idx_security_answers_profile_id ON public.security_answers(profile_id);

-- Add a trigger to update the updated_at timestamp (if you want to add this column)
-- First, let's add the updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'security_answers' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.security_answers 
        ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc', now());
    END IF;
END $$;

-- Create or replace the trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
DROP TRIGGER IF EXISTS update_security_answers_updated_at ON public.security_answers;
CREATE TRIGGER update_security_answers_updated_at
    BEFORE UPDATE ON public.security_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_answers TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'security_answers' 
ORDER BY ordinal_position;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Security answers table setup completed successfully!';
    RAISE NOTICE 'Table: security_answers';
    RAISE NOTICE 'RLS Policies: Created for SELECT, INSERT, UPDATE, DELETE';
    RAISE NOTICE 'Indexes: Created on profile_id';
    RAISE NOTICE 'Triggers: Created for updated_at timestamp';
    RAISE NOTICE 'Ready for use with the KPI application!';
END $$;