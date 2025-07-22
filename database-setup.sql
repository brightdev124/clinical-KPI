-- Create KPIs table
CREATE TABLE IF NOT EXISTS kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 20),
  floor TEXT,
  removed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create review_items table (note: fixed typo in column name)
CREATE TABLE IF NOT EXISTS review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinician UUID REFERENCES profiles(id) NOT NULL,
  kpi UUID REFERENCES kpis(id) NOT NULL,
  director UUID REFERENCES profiles(id),
  met_check BOOLEAN NOT NULL,
  notes TEXT,
  plan TEXT,
  score INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;

-- Create policies for kpis table
CREATE POLICY "Allow public read access on kpis" ON kpis FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on kpis" ON kpis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on kpis" ON kpis FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on kpis" ON kpis FOR DELETE USING (true);

-- Create policies for review_items table
CREATE POLICY "Allow public read access on review_items" ON review_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on review_items" ON review_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on review_items" ON review_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on review_items" ON review_items FOR DELETE USING (true);

-- Insert sample KPIs
INSERT INTO kpis (title, description, weight, floor, removed) VALUES
  ('Patient Satisfaction Score', 'Maintain patient satisfaction above 4.5/5 based on post-visit surveys', 9, '1st Floor', false),
  ('Documentation Compliance', 'Complete all required documentation within 24 hours of patient encounter', 8, '2nd Floor', false),
  ('Continuing Education', 'Complete required CE hours and attend mandatory training sessions', 6, '1st Floor', false),
  ('Team Collaboration', 'Effective collaboration with multidisciplinary team and peer feedback', 7, '3rd Floor', false),
  ('Clinical Outcomes', 'Achieve target clinical outcomes for assigned patient population', 10, '2nd Floor', false),
  ('Safety Protocols', 'Adherence to safety protocols and incident-free performance', 9, '1st Floor', false),
  ('Quality Improvement', 'Participation in quality improvement initiatives and process optimization', 5, '3rd Floor', false)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpis_removed ON kpis(removed);
CREATE INDEX IF NOT EXISTS idx_kpis_floor ON kpis(floor);
CREATE INDEX IF NOT EXISTS idx_review_items_clinician ON review_items(clinician);
CREATE INDEX IF NOT EXISTS idx_review_items_kpi ON review_items(kpi);
CREATE INDEX IF NOT EXISTS idx_review_items_director ON review_items(director);
CREATE INDEX IF NOT EXISTS idx_review_items_date ON review_items(date);
CREATE INDEX IF NOT EXISTS idx_review_items_clinician_date ON review_items(clinician, date);