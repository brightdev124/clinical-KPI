# Position Management System

This document explains the implementation of the Position Management system for the KPI application, which is accessible only to super-admin users.

## Database Structure

The system uses the `position` table with the following structure:

```sql
CREATE TABLE position (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_title text,
  role text DEFAULT 'clinician',
  created_at timestamp with time zone DEFAULT now()
);
```

## Implementation Details

### Position Management Page

The Position Management page (`PositionManagement.tsx`) provides a complete interface for managing positions in the application:

1. **Access Control**
   - Only super-admin users can access this page
   - Unauthorized users are redirected to the dashboard
   - A security check is performed on component mount

2. **Features**
   - List all positions with their titles, roles, and creation dates
   - Add new positions with specified roles
   - Edit existing positions
   - Delete positions (with validation to prevent deletion of positions in use)
   - Search functionality to filter positions by title or role

3. **Role Assignment**
   - Each position can be assigned one of three roles:
     - super-admin
     - director
     - clinician
   - The role is visually indicated with appropriate colors and icons

### Database Security

The position table is protected by Row Level Security (RLS) policies:

1. **View Access**
   - All authenticated users can view positions
   ```sql
   CREATE POLICY "Positions are viewable by authenticated users" 
   ON position FOR SELECT 
   USING (auth.role() = 'authenticated');
   ```

2. **Edit Access**
   - Only super-admin users can add, edit, or delete positions
   ```sql
   CREATE POLICY "Positions are editable by super admins only" 
   ON position FOR ALL 
   USING (
       EXISTS (
           SELECT 1 FROM profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role = 'super-admin'
       )
   );
   ```

## Navigation

The Position Management page is accessible from the sidebar navigation menu:

- The link is labeled "Positions" with a briefcase icon
- It's only visible to users with the super-admin role
- The route is `/positions`

## Usage

1. **Viewing Positions**
   - Navigate to the Positions page from the sidebar
   - View the list of all positions
   - Use the search box to filter positions

2. **Adding a Position**
   - Click the "Add New Position" button
   - Enter a position title
   - Select a role (super-admin, director, or clinician)
   - Click "Add Position" to save

3. **Editing a Position**
   - Click the edit button next to a position
   - Modify the title or role
   - Click "Save Changes" to update

4. **Deleting a Position**
   - Click the delete button next to a position
   - Confirm deletion in the modal
   - The system will prevent deletion if the position is assigned to any users

## Integration with User Management

The Position Management system integrates with the User Management system:

1. **User Assignment**
   - Positions can be assigned to users in the Permission Management page
   - Each user can have one position

2. **Role Consistency**
   - The position's role should match the user's role for consistency
   - This is enforced in the UI but should also be validated on the server

## SQL Migration

A migration script (`position-table-update.sql`) is provided to:

1. Update the position table structure if it exists
2. Create the table if it doesn't exist
3. Add initial position data if the table is empty
4. Set up the necessary RLS policies

To apply the migration, execute the SQL script in your Supabase database.