-- Complete database setup for updated signup functionality
-- Run this script to ensure all required tables and constraints are in place

-- First, ensure the position table exists with proper structure
CREATE TABLE IF NOT EXISTS position (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_title TEXT,
    role TEXT DEFAULT 'clinician',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure profiles table has the correct structure
DO $$
BEGIN
    -- Check if position column exists in profiles table
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'position') THEN
        -- Add position column as UUID reference to position table
        ALTER TABLE profiles ADD COLUMN position UUID;
    END IF;
    
    -- Update the role check constraint to include 'admin'
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('super-admin', 'director', 'clinician', 'admin'));
        
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.table_constraints 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND constraint_name = 'fk_profiles_position') THEN
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_position 
            FOREIGN KEY (position) REFERENCES position(id);
    END IF;
END
$$;

-- Insert essential position records
INSERT INTO position (position_title, role) VALUES 
    ('Administrator', 'admin'),
    ('Director', 'director'),
    ('Clinical Director', 'director'),
    ('Medical Director', 'director'),
    ('Nursing Director', 'director'),
    ('Department Director', 'director'),
    ('Chief Medical Officer', 'super-admin'),
    ('Senior Physician', 'clinician'),
    ('Attending Physician', 'clinician'),
    ('Registered Nurse', 'clinician')
ON CONFLICT DO NOTHING;

-- Enable RLS on position table if not already enabled
ALTER TABLE position ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies for position table
DROP POLICY IF EXISTS "Positions are viewable by all users" ON position;
CREATE POLICY "Positions are viewable by all users" 
    ON position FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Positions are editable by super admins only" ON position;
CREATE POLICY "Positions are editable by super admins only" 
    ON position FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super-admin', 'admin')
        )
    );

-- Update profiles table RLS policies to handle new admin role
DROP POLICY IF EXISTS "Allow public read access" ON profiles;
CREATE POLICY "Allow public read access" 
    ON profiles FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON profiles;
CREATE POLICY "Allow public insert access" 
    ON profiles FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
CREATE POLICY "Allow users to update their own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM profiles admin_profiles
        WHERE admin_profiles.id = auth.uid()
        AND admin_profiles.role IN ('super-admin', 'admin')
    ));

-- Display summary of setup
SELECT 
    'Positions' as table_name,
    COUNT(*) as record_count,
    string_agg(DISTINCT role, ', ') as available_roles
FROM position
UNION ALL
SELECT 
    'Profiles' as table_name,
    COUNT(*) as record_count,
    string_agg(DISTINCT role, ', ') as available_roles
FROM profiles;