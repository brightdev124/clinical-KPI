import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sgufpefjtsdxrqlzkwyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndWZwZWZqdHNkeHJxbHprd3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTkxMTIsImV4cCI6MjA2NzQzNTExMn0.2Le-eOX1zZQBhEt7gx1QhHZ7JSu_8X6zVkpMTPq97uI';

export const supabase = createClient(supabaseUrl, supabaseKey);