-- Create the assign table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.assign (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinician bigint REFERENCES profiles(id) ON DELETE CASCADE,
    director bigint REFERENCES profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE public.assign ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read assignments
CREATE POLICY "Allow authenticated users to read assignments" ON public.assign
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert assignments
CREATE POLICY "Allow authenticated users to insert assignments" ON public.assign
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to delete assignments
CREATE POLICY "Allow authenticated users to delete assignments" ON public.assign
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to update assignments
CREATE POLICY "Allow authenticated users to update assignments" ON public.assign
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assign_clinician ON public.assign(clinician);
CREATE INDEX IF NOT EXISTS idx_assign_director ON public.assign(director);
CREATE INDEX IF NOT EXISTS idx_assign_created_at ON public.assign(created_at);