-- Fix the assign table data type mismatch
-- The assign table currently uses bigint for foreign keys but profiles uses uuid/text

-- First, check the current structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assign' AND table_schema = 'public';

-- Drop existing foreign key constraints
ALTER TABLE public.assign DROP CONSTRAINT IF EXISTS assign_clinician_fkey;
ALTER TABLE public.assign DROP CONSTRAINT IF EXISTS assign_director_fkey;

-- Change the data types to match profiles table (assuming profiles.id is text/uuid)
ALTER TABLE public.assign ALTER COLUMN clinician TYPE text;
ALTER TABLE public.assign ALTER COLUMN director TYPE text;

-- Re-add foreign key constraints with correct data types
ALTER TABLE public.assign 
ADD CONSTRAINT assign_clinician_fkey 
FOREIGN KEY (clinician) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.assign 
ADD CONSTRAINT assign_director_fkey 
FOREIGN KEY (director) REFERENCES profiles(id) ON DELETE SET NULL;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assign' AND table_schema = 'public';