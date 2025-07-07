# Supabase Authentication Setup

## Overview
This application now uses Supabase for authentication with username-only signup and login support. Users sign up with only a username (no email required) and login with their username.

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

### 3. Email Configuration (Optional)
To enable email verification and password reset:
1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your SMTP settings or use Supabase's built-in email service
3. Customize email templates as needed

## Features

### Authentication Methods
- **Login**: Users login with username only
- **Signup**: Users sign up with username, full name, and password (no email required)
- **Demo Accounts**: Fallback demo accounts for testing

### User Profiles
- Each user has a profile with:
  - Unique username
  - Auto-generated email (for Supabase compatibility)
  - Full name
  - Role (admin, clinical_director, clinician)
  - Assigned clinicians (for directors)
  - Assigned director (for clinicians)

### Security Features
- Row Level Security (RLS) enabled
- Users can only access their own profile data
- Password hashing handled by Supabase
- Email verification (if configured)

## Database Schema

### profiles Table
- `id`: UUID (references auth.users)
- `name`: TEXT (full name)
- `email`: TEXT (email address)
- `username`: TEXT (unique username)
- `role`: TEXT (admin, clinical_director, clinician)
- `assigned_clinicians`: TEXT[] (array of user IDs)
- `assigned_director`: TEXT (user ID)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Usage

### Login
Users login with their username:
```javascript
await login('username', 'password');
```

### Signup
New users sign up with username, name, and password (no email required):
```javascript
await signup('username', 'password', 'Full Name');
```

**Note**: The system automatically generates a dummy email (`username@clinickpi.local`) for Supabase compatibility, but users never see or interact with this email.

### Demo Accounts
For testing, the following demo accounts are available:
- **Username**: `admin` - Role: Admin
- **Username**: `director` - Role: Clinical Director
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