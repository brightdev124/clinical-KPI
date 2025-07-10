# Permission Management System

This document explains the implementation of the permission management system for the KPI application, which handles three distinct roles: super-admin, director, and clinician.

## Database Structure

The system uses the following tables:

1. **profiles** - Main user table
   ```sql
   create table profiles (
     id uuid primary key default uuid_generate_v4(),
     created_at timestamp default now(),
     position uuid references position(id),
     name text,
     accept boolean default false,
     username text unique,
     password text
   );
   ```

2. **position** - Contains position information
   ```sql
   create table position (
     id uuid primary key default uuid_generate_v4(),
     name text
   );
   ```

3. **director** - Contains director-specific information
   ```sql
   create table director (
     id uuid primary key default uuid_generate_v4(),
     profile uuid references profiles(id),
     direction text
   );
   ```

4. **clinician** - Contains clinician-specific information
   ```sql
   create table clinician (
     id uuid primary key default uuid_generate_v4(),
     profile uuid references profiles(id),
     clinician text
   );
   ```

## Implementation Details

### UserService

The `UserService` class has been enhanced to handle the new database structure:

1. **Data Retrieval**
   - `getAllUsers()` - Fetches all users with their role-specific information
   - `getUserById()` - Fetches a specific user with their role-specific information
   - `getAllPositions()` - Fetches all available positions

2. **User Management**
   - `createUser()` - Creates a new user with role-specific information
   - `updateUser()` - Updates a user, handling role changes and role-specific information
   - `deleteUser()` - Deletes a user and their role-specific information
   - `toggleUserAcceptance()` - Toggles a user's approval status

3. **Transaction Management**
   - Uses transaction functions (`begin_transaction`, `commit_transaction`, `rollback_transaction`) to ensure data integrity when operations span multiple tables

### Permission Management UI

The Permission Management page has been enhanced to:

1. **Display Role-Specific Information**
   - Shows position information for all users
   - Shows direction information for directors
   - Shows clinician type information for clinicians

2. **Role-Based Filtering**
   - Tab navigation to filter by role (All, Super Admin, Director, Clinician)
   - Additional filters for approval status and search functionality

3. **Role-Specific Editing**
   - Dynamic form fields based on the selected role
   - Position selection for all users
   - Direction field for directors
   - Clinician type field for clinicians

## Usage

1. **Viewing Users**
   - Use the tabs to filter by role (All, Super Admin, Director, Clinician)
   - Use the search box to find users by name or username
   - Use the role and status filters for additional filtering

2. **Editing Users**
   - Click the edit button to modify a user
   - Change basic information (name, username, password)
   - Change role and role-specific information
   - Change position
   - Toggle approval status

3. **Deleting Users**
   - Click the delete button to remove a user
   - Confirm deletion in the modal

4. **Approving/Rejecting Users**
   - Click the approve/reject button to toggle a user's approval status

## Security Considerations

- Super Admin users cannot be edited or deleted
- Users cannot delete their own accounts
- Role-specific information is properly maintained when roles change

## Transaction Functions

The following SQL functions have been added to support transactions:

```sql
-- Begin transaction function
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
  -- Start a transaction
  BEGIN;
END;
$$ LANGUAGE plpgsql;

-- Commit transaction function
CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void AS $$
BEGIN
  -- Commit the transaction
  COMMIT;
END;
$$ LANGUAGE plpgsql;

-- Rollback transaction function
CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void AS $$
BEGIN
  -- Rollback the transaction
  ROLLBACK;
END;
$$ LANGUAGE plpgsql;
```

These functions must be executed in the database to enable transaction support.