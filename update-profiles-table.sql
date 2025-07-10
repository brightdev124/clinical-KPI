-- Update profiles table to add position column
DO $$
BEGIN
    -- Check if position column exists in profiles table
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'position') THEN
        -- Add position column as UUID reference to position table
        ALTER TABLE profiles ADD COLUMN position UUID;
        
        -- Add foreign key constraint to reference position table
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_position 
            FOREIGN KEY (position) REFERENCES position(id);
    END IF;
    
    -- Update the role check constraint to include 'admin'
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('super-admin', 'director', 'clinician', 'admin'));
END
$$;

-- Insert admin role into position table if it doesn't exist
INSERT INTO position (position_title, role)
SELECT 'Administrator', 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM position 
    WHERE position_title = 'Administrator' OR role = 'admin'
);

-- Insert more specific director positions if they don't exist
INSERT INTO position (position_title, role)
SELECT * FROM (
    VALUES 
        ('Director', 'director'),
        ('Clinical Director', 'director'),
        ('Medical Director', 'director'),
        ('Nursing Director', 'director'),
        ('Department Director', 'director')
) AS new_positions(title, role)
WHERE NOT EXISTS (
    SELECT 1 FROM position 
    WHERE position_title = new_positions.title
);