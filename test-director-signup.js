// Test script to verify director signup functionality
const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'your-supabase-url';
const supabaseKey = 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectorSignup() {
  console.log('Testing director signup functionality...');
  
  try {
    // First, let's check if we have any director positions
    const { data: positions, error: positionError } = await supabase
      .from('position')
      .select('id, position_title, role')
      .eq('role', 'director');

    if (positionError) {
      console.error('Error fetching positions:', positionError);
      return;
    }

    console.log('Available director positions:', positions);

    // Look for a position with title "director"
    const { data: directorPosition, error: directorError } = await supabase
      .from('position')
      .select('id')
      .eq('position_title', 'director')
      .single();

    if (directorError) {
      console.log('No position with title "director" found, trying to find any director role...');
      
      // Try to find any position with director role
      const { data: altDirectorPosition, error: altError } = await supabase
        .from('position')
        .select('id')
        .eq('role', 'director')
        .limit(1)
        .single();

      if (altError) {
        console.log('No director positions found at all.');
      } else {
        console.log('Found director position:', altDirectorPosition);
      }
    } else {
      console.log('Found director position:', directorPosition);
    }

    // Test the actual signup flow (commented out to avoid creating test users)
    /*
    const testUser = {
      username: 'test_director_' + Date.now(),
      password: 'test_password',
      name: 'Test Director',
      role: 'director'
    };

    const { data: newUser, error: signupError } = await supabase
      .from('profiles')
      .insert({
        username: testUser.username,
        password: testUser.password,
        name: testUser.name,
        role: testUser.role,
        position: directorPosition?.id || altDirectorPosition?.id,
        accept: false,
      })
      .select()
      .single();

    if (signupError) {
      console.error('Signup error:', signupError);
    } else {
      console.log('Test user created successfully:', newUser);
      
      // Clean up - delete the test user
      await supabase
        .from('profiles')
        .delete()
        .eq('id', newUser.id);
      
      console.log('Test user cleaned up');
    }
    */

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testDirectorSignup();