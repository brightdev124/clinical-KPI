// Simple test to check Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sgufpefjtsdxrqlzkwyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndWZwZWZqdHNkeHJxbHprd3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTkxMTIsImV4cCI6MjA2NzQzNTExMn0.2Le-eOX1zZQBhEt7gx1QhHZ7JSu_8X6zVkpMTPq97uI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('Connection successful:', data);
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testConnection();