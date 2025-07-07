# Supabase Authentication Setup

## Overview
This application uses Supabase with a custom profiles table for authentication. Users sign up with username, name, password, and role selection (Director or Clinician). No email is required - authentication is purely username-based.

## Setup Instructions

### 1. Database Setup
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-setup.sql` into the editor
4. Run the script to create the necessary tables and functions

### 2. Environment Variables (Optional)
For better security, you can move the Supabase key to an environment variable:

Create a `.env` file in your project root:
```
VITE_SUPABASE_URL=https://sgufpefjtsdxrqlzkwyf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndWZwZWZqdHNkeHJxbHprd3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTkxMTIsImV4cCI6MjA2NzQzNTExMn0.2Le-eOX1zZQBhEt7gx1QhHZ7JSu_8X6zVkpMTPq97uI
```

Then update `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

## Features

### Authentication Methods
- **Login**: Users login with username only
- **Signup**: Users sign up with username, full name, password, and role selection (Director or Clinician)
- **Demo Accounts**: Fallback demo accounts for testing

### User Profiles
- Each user has a profile with:
  - Unique username
  - Full name
  - Role (director, clinician)
  - Password (stored directly in database)
  - Created/Updated timestamps

### Security Features
- Row Level Security (RLS) enabled
- Public access for authentication (users can sign up and login)
- Simple password-based authentication

## Database Schema

### profiles Table
- `id`: UUID (primary key, auto-generated)
- `username`: TEXT (unique username)
- `name`: TEXT (full name)
- `role`: TEXT (director, clinician)
- `password`: TEXT (password)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Usage

### Login
Users login with their username:
```javascript
await login('username', 'password');
```

### Signup
New users sign up with username, name, password, and role selection:
```javascript
await signup('username', 'password', 'Full Name', 'clinical_director'); // For Director
// or
await signup('username', 'password', 'Full Name', 'clinician'); // For Clinician
```

**Available Roles:**
- `director` - For users with director privileges
- `clinician` - For regular clinician users

**Note**: After successful signup, users are automatically logged in and redirected to the dashboard.

### Demo Accounts
For testing, the following demo accounts are available:
- **Username**: `admin` - Role: Director
- **Username**: `director` - Role: Director
- **Username**: `clinician` - Role: Clinician

All demo accounts use the password: `password`

## Troubleshooting

### Common Issues

1. **Username already exists**: Usernames must be unique across all users
2. **Email verification**: Users may need to verify their email before logging in
3. **RLS Policies**: Make sure Row Level Security policies are properly configured
4. **CORS Issues**: Ensure your domain is added to the allowed origins in Supabase

### Error Messages
- `Username already exists`: The chosen username is already taken
- `Username not found`: No user found with the provided username
- `Failed to create user profile`: Database error during profile creation

## Next Steps

1. **Email Verification**: Configure email templates and SMTP settings
2. **Password Reset**: Implement password reset functionality
3. **Role Management**: Add admin interface for managing user roles
4. **Profile Management**: Add user profile editing functionality
5. **Security Enhancements**: Add rate limiting and additional security measures