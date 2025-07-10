// Test script for updated signup functionality with admin role
const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

if (supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-supabase-anon-key') {
  console.log('Please update the Supabase credentials in this script or set environment variables:');
  console.log('export SUPABASE_URL="your-actual-url"');
  console.log('export SUPABASE_ANON_KEY="your-actual-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPositionLookup() {
  console.log('🔍 Testing position lookup functionality...\n');
  
  try {
    // Test admin position lookup
    console.log('Testing admin position lookup:');
    const { data: adminPositions, error: adminError } = await supabase
      .from('position')
      .select('id, position_title, role')
      .or('position_title.eq.Administrator,role.eq.admin');

    if (adminError) {
      console.error('❌ Admin position lookup failed:', adminError);
    } else {
      console.log('✅ Admin positions found:', adminPositions);
    }

    // Test director position lookup
    console.log('\nTesting director position lookup:');
    const { data: directorPositions, error: directorError } = await supabase
      .from('position')
      .select('id, position_title, role')
      .or('position_title.eq.Director,role.eq.director');

    if (directorError) {
      console.error('❌ Director position lookup failed:', directorError);
    } else {
      console.log('✅ Director positions found:', directorPositions);
    }

    // Test profiles table structure
    console.log('\nTesting profiles table structure:');
    const { data: profilesStructure, error: structureError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Profiles table structure check failed:', structureError);
    } else {
      console.log('✅ Profiles table accessible');
      if (profilesStructure && profilesStructure.length > 0) {
        console.log('📋 Available columns:', Object.keys(profilesStructure[0]));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testSignupFlow() {
  console.log('\n🧪 Testing signup flow (simulation)...\n');
  
  const testCases = [
    { role: 'admin', name: 'Test Admin', username: 'testadmin' },
    { role: 'director', name: 'Test Director', username: 'testdirector' },
    { role: 'clinician', name: 'Test Clinician', username: 'testclinician' }
  ];

  for (const testCase of testCases) {
    console.log(`Testing ${testCase.role} signup simulation:`);
    
    try {
      // Simulate position lookup
      let positionId = null;
      if (testCase.role === 'director' || testCase.role === 'admin') {
        const titleToMatch = testCase.role === 'director' ? 'Director' : 'Administrator';
        const { data: positionData, error: positionError } = await supabase
          .from('position')
          .select('id')
          .eq('position_title', titleToMatch)
          .single();

        if (positionError) {
          const roleToMatch = testCase.role === 'admin' ? 'admin' : 'director';
          const { data: altPositionData, error: altPositionError } = await supabase
            .from('position')
            .select('id')
            .eq('role', roleToMatch)
            .limit(1)
            .single();

          if (altPositionError) {
            console.log(`⚠️  No ${testCase.role} position found, would create profile without position reference`);
          } else {
            positionId = altPositionData.id;
            console.log(`✅ Found ${testCase.role} position by role match:`, positionId);
          }
        } else {
          positionId = positionData.id;
          console.log(`✅ Found ${testCase.role} position by title match:`, positionId);
        }
      } else {
        console.log(`ℹ️  No position lookup needed for ${testCase.role}`);
      }

      // Check if username would conflict
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', testCase.username)
        .single();

      if (existingUser) {
        console.log(`⚠️  Username ${testCase.username} already exists, would show conflict error`);
      } else if (checkError && checkError.code !== 'PGRST116') {
        console.log(`❌ Database error checking username: ${checkError.message}`);
      } else {
        console.log(`✅ Username ${testCase.username} is available`);
      }

      console.log(`✅ ${testCase.role} signup simulation completed successfully\n`);

    } catch (error) {
      console.error(`❌ ${testCase.role} signup simulation failed:`, error);
    }
  }
}

async function main() {
  console.log('🚀 Starting signup implementation tests...\n');
  
  await testPositionLookup();
  await testSignupFlow();
  
  console.log('✅ All tests completed!');
}

main().catch(console.error);