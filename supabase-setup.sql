-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'clinician' CHECK (role IN ('super-admin', 'director', 'clinician')),
  password TEXT NOT NULL,
  accept BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Allow public read access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update their own profile" ON profiles FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO profiles (username, name, role, password, accept) 
VALUES 
  ('admin', 'System Administrator', 'super-admin', 'password', true),
  ('director', 'Dr. Michael Chen', 'director', 'password', true),
  ('clinician', 'Dr. Emily Rodriguez', 'clinician', 'password', true)
ON CONFLICT (username) DO NOTHING;