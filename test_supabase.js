// Test script to check Supabase connection and table structure
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgufpefjtsdxrqlzkwyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndWZwZWZqdHNkeHJxbHprd3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTkxMTIsImV4cCI6MjA2NzQzNTExMn0.2Le-eOX1zZQBhEt7gx1QhHZ7JSu_8X6zVkpMTPq97uI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test profiles table
    console.log('\n1. Testing profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('Profiles error:', profilesError);
    } else {
      console.log('Profiles found:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('Sample profile:', profiles[0]);
      }
    }
    
    // Test assign table
    console.log('\n2. Testing assign table...');
    const { data: assignments, error: assignError } = await supabase
      .from('assign')
      .select('*')
      .limit(5);
    
    if (assignError) {
      console.error('Assign table error:', assignError);
      console.log('This might mean the assign table does not exist yet.');
      
      // Try to create a simple assignment to test
      console.log('\n2.1 Testing assignment creation...');
      const { error: insertError } = await supabase
        .from('assign')
        .insert({ clinician: 1, director: 1 });
      
      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('Assignment created successfully!');
      }
    } else {
      console.log('Assignments found:', assignments?.length || 0);
      if (assignments && assignments.length > 0) {
        console.log('Sample assignment:', assignments[0]);
      }
    }
    
    // Test directors query
    console.log('\n3. Testing directors query...');
    const { data: directors, error: directorsError } = await supabase
      .from('profiles')
      .select(`
        *,
        position_info:position(
          id,
          position_title,
          role
        )
      `)
      .eq('position_info.role', 'director')
      .eq('accept', true);
    
    if (directorsError) {
      console.error('Directors error:', directorsError);
    } else {
      console.log('Directors found:', directors?.length || 0);
      directors?.forEach(director => {
        console.log(`- ${director.name} (ID: ${director.id})`);
      });
    }
    
    // Test clinicians query
    console.log('\n4. Testing clinicians query...');
    const { data: clinicians, error: cliniciansError } = await supabase
      .from('profiles')
      .select(`
        *,
        position_info:position(
          id,
          position_title,
          role
        )
      `)
      .eq('position_info.role', 'clinician')
      .eq('accept', true);
    
    if (cliniciansError) {
      console.error('Clinicians error:', cliniciansError);
    } else {
      console.log('Clinicians found:', clinicians?.length || 0);
      clinicians?.forEach(clinician => {
        console.log(`- ${clinician.name} (ID: ${clinician.id})`);
      });
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

testConnection();