const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgufpefjtsdxrqlzkwyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndWZwZWZqdHNkeHJxbHprd3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTkxMTIsImV4cCI6MjA2NzQzNTExMn0.2Le-eOX1zZQBhEt7gx1QhHZ7JSu_8X6zVkpMTPq97uI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTables() {
  try {
    console.log('Setting up database tables...');

    // Create KPIs table
    const { error: kpisError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS kpis (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          weight INTEGER NOT NULL CHECK (weight BETWEEN 1 AND 20),
          floor TEXT,
          removed BOOLEAN DEFAULT false NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
      `
    });

    if (kpisError) {
      console.error('Error creating kpis table:', kpisError);
      return;
    }

    // Create review_items table
    const { error: reviewError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (reviewError) {
      console.error('Error creating review_items table:', reviewError);
      return;
    }

    console.log('Tables created successfully!');

    // Insert sample KPIs
    const sampleKPIs = [
      {
        title: 'Patient Satisfaction Score',
        description: 'Maintain patient satisfaction above 4.5/5 based on post-visit surveys',
        weight: 9,
        floor: '1st Floor'
      },
      {
        title: 'Documentation Compliance',
        description: 'Complete all required documentation within 24 hours of patient encounter',
        weight: 8,
        floor: '2nd Floor'
      },
      {
        title: 'Continuing Education',
        description: 'Complete required CE hours and attend mandatory training sessions',
        weight: 6,
        floor: '1st Floor'
      },
      {
        title: 'Team Collaboration',
        description: 'Effective collaboration with multidisciplinary team and peer feedback',
        weight: 7,
        floor: '3rd Floor'
      },
      {
        title: 'Clinical Outcomes',
        description: 'Achieve target clinical outcomes for assigned patient population',
        weight: 10,
        floor: '2nd Floor'
      }
    ];

    for (const kpi of sampleKPIs) {
      const { error } = await supabase
        .from('kpis')
        .insert(kpi);
      
      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error inserting KPI:', error);
      }
    }

    console.log('Sample KPIs inserted successfully!');

  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupTables();