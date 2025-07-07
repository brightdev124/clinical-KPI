-- Update the role constraint to include super-admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super-admin', 'director', 'clinician'));

-- Update the admin user to super-admin role
UPDATE profiles SET role = 'super-admin', name = 'System Administrator' WHERE username = 'admin';

-- Ensure the admin user is accepted
UPDATE profiles SET accept = true WHERE username = 'admin';