-- Create clinician_types table
CREATE TABLE IF NOT EXISTS clinician_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some initial clinician types
INSERT INTO clinician_types (name, description)
VALUES 
  ('Physician', 'Medical doctor responsible for diagnosing and treating health conditions'),
  ('Nurse Practitioner', 'Advanced practice registered nurse who provides primary and specialty care'),
  ('Registered Nurse', 'Licensed nurse who coordinates patient care and provides education'),
  ('Physical Therapist', 'Healthcare professional who helps patients improve movement and manage pain'),
  ('Occupational Therapist', 'Healthcare professional who helps patients develop skills for daily living'),
  ('Speech Therapist', 'Healthcare professional who treats communication and swallowing disorders'),
  ('Psychologist', 'Mental health professional who diagnoses and treats mental disorders'),
  ('Psychiatrist', 'Medical doctor who specializes in mental health'),
  ('Social Worker', 'Professional who helps people solve and cope with problems in their everyday lives')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraint to clinician table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'clinician' AND column_name = 'clinician_type_id'
  ) THEN
    ALTER TABLE clinician ADD COLUMN clinician_type_id UUID REFERENCES clinician_types(id);
  END IF;
END
$$;