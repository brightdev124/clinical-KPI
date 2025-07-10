-- Update position table structure if it exists
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'position') THEN
        -- Check if position_title column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'position' 
                      AND column_name = 'position_title') THEN
            -- Add position_title column
            ALTER TABLE position ADD COLUMN position_title text;
            
            -- If name column exists, copy data from name to position_title
            IF EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'position' 
                      AND column_name = 'name') THEN
                UPDATE position SET position_title = name;
                ALTER TABLE position DROP COLUMN name;
            END IF;
        END IF;
        
        -- Check if role column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'position' 
                      AND column_name = 'role') THEN
            -- Add role column with default value
            ALTER TABLE position ADD COLUMN role text DEFAULT 'clinician';
        END IF;
        
        -- Check if created_at column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'position' 
                      AND column_name = 'created_at') THEN
            -- Add created_at column
            ALTER TABLE position ADD COLUMN created_at timestamp with time zone DEFAULT now();
        END IF;
    ELSE
        -- Create the position table if it doesn't exist
        CREATE TABLE position (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            position_title text,
            role text DEFAULT 'clinician',
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END
$$;

-- Add some initial positions if the table is empty
INSERT INTO position (position_title, role)
SELECT * FROM (
    VALUES 
        ('Chief Medical Officer', 'super-admin'),
        ('Hospital Director', 'director'),
        ('Department Head', 'director'),
        ('Senior Physician', 'clinician'),
        ('Attending Physician', 'clinician'),
        ('Resident Physician', 'clinician'),
        ('Nurse Manager', 'director'),
        ('Registered Nurse', 'clinician'),
        ('Physical Therapist', 'clinician'),
        ('Occupational Therapist', 'clinician')
) AS new_positions(title, role)
WHERE NOT EXISTS (SELECT 1 FROM position LIMIT 1);

-- Create RLS policies for position table
BEGIN;
    -- Enable RLS on position table
    ALTER TABLE position ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Positions are viewable by authenticated users" ON position;
    DROP POLICY IF EXISTS "Positions are editable by super admins only" ON position;

    -- Create policies
    CREATE POLICY "Positions are viewable by authenticated users" 
    ON position FOR SELECT 
    USING (auth.role() = 'authenticated');

    CREATE POLICY "Positions are editable by super admins only" 
    ON position FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super-admin'
        )
    );
COMMIT;