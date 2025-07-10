# Updated Signup Implementation with Admin Role

## Overview
This implementation adds admin role support to the signup process and automatically links users to their corresponding positions in the position table.

## Changes Made

### 1. Database Schema Updates
- Added `position` column to `profiles` table as UUID reference
- Updated role constraint to include 'admin' role
- Added foreign key constraint linking profiles to position table

### 2. Updated AuthModal.tsx
- Added "Administrator" option to the role selection
- Updated type definitions to include 'admin' role
- Users can now select from: Administrator, Director, or Clinician

### 3. Updated AuthContext.tsx
- Extended User interface to include position field
- Modified signup function to handle admin role
- Enhanced position matching logic:
  - For directors: looks for position titled "Director" or any position with role "director"
  - For admins: looks for position titled "Administrator" or any position with role "admin"
  - For clinicians: no position lookup (can be added later if needed)

## Database Schema Requirements

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super-admin', 'director', 'clinician', 'admin')),
  password TEXT NOT NULL,
  position UUID REFERENCES position(id),
  accept BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Position Table
```sql
CREATE TABLE position (
  id UUID PRIMARY KEY,
  position_title TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Run Database Updates
Execute the following SQL files in order:
```bash
# Apply position table structure
psql -f position-table-update.sql

# Apply profiles table updates
psql -f update-profiles-table.sql
```

### 2. Verify Data
Ensure your position table has the necessary records:
```sql
-- Check existing positions
SELECT * FROM position;

-- Add missing positions if needed
INSERT INTO position (position_title, role) VALUES 
  ('Administrator', 'admin'),
  ('Director', 'director'),
  ('Clinical Director', 'director');
```

## Usage Flow

### Signup Process
1. User selects role (Administrator, Director, or Clinician)
2. System attempts to find matching position:
   - **Administrator**: Looks for "Administrator" title or "admin" role
   - **Director**: Looks for "Director" title or "director" role
   - **Clinician**: No position lookup (stored as NULL)
3. Creates profile with position reference
4. User enters pending approval state

### Error Handling
- If no matching position found, profile is created without position reference
- Warning logged to console for debugging
- Signup process continues without failing
- Proper error messages for username conflicts and database issues

## Testing

### Test Admin Signup
```javascript
// Test admin role signup
const testAdminSignup = async () => {
  try {
    await signup('testadmin', 'password123', 'Test Admin', 'admin');
    console.log('Admin signup successful');
  } catch (error) {
    console.error('Admin signup failed:', error);
  }
};
```

### Test Director Signup
```javascript
// Test director role signup
const testDirectorSignup = async () => {
  try {
    await signup('testdirector', 'password123', 'Test Director', 'director');
    console.log('Director signup successful');
  } catch (error) {
    console.error('Director signup failed:', error);
  }
};
```

## Troubleshooting

### "Could not find the 'role' column" Error
- Ensure your profiles table has the role column
- Run the database setup scripts
- Check that your Supabase schema is up to date

### Position Not Found Warnings
- Check that position table has appropriate records
- Verify position_title and role values match expected values
- Add missing positions manually if needed

### Foreign Key Constraint Errors
- Ensure position table exists before adding foreign key
- Check that referenced position IDs exist
- Verify UUID format is correct

## Future Enhancements
- Add position dropdown during signup for more specific role selection
- Implement position hierarchy and permissions
- Add automatic position creation for missing roles
- Add role-based access control based on position