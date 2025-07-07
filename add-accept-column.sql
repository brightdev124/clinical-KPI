-- Add accept column to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accept BOOLEAN DEFAULT false NOT NULL;

-- Update existing users to be accepted (optional - you may want to set specific users)
UPDATE profiles SET accept = true WHERE username IN ('admin', 'director', 'clinician');