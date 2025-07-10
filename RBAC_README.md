# Role-Based Access Control (RBAC) Implementation

This document explains the role-based access control system implemented in the Clinical KPI application.

## User Roles

### 1. Super Admin
- **Access**: Full access to all features
- **Available Pages**:
  - Dashboard
  - KPI Management
  - Clinicians Management
  - Clinician Types Management
  - Analytics/Performance
  - User Management

### 2. Director
- **Access**: Limited to clinical operations
- **Available Pages**:
  - Dashboard
  - Clinicians Management
  - Analytics/Performance

### 3. Clinician
- **Access**: Only their own profile
- **Available Pages**:
  - Clinician Profile (their own)

## Demo Accounts

You can test the system with these demo accounts:

- **Super Admin**: Username: `admin`, Password: `password`
- **Director**: Username: `director`, Password: `password`
- **Clinician**: Username: `clinician`, Password: `password`

## Database Updates

To implement RBAC, the following database changes were made:

1. **Updated role constraint** to include 'super-admin':
   ```sql
   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
   ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super-admin', 'director', 'clinician'));
   ```

2. **Added accept column** for approval workflow:
   ```sql
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accept BOOLEAN DEFAULT false NOT NULL;
   ```

3. **Updated admin user** to super-admin role:
   ```sql
   UPDATE profiles SET role = 'super-admin', name = 'System Administrator' WHERE username = 'admin';
   ```

## Features

### Navigation
- Navigation menu items are filtered based on user role
- Clinicians see only "My Profile" link
- Directors see Dashboard, Clinicians, and Analytics
- Super Admins see all menu items

### Route Protection
- Routes are protected using `RoleBasedRoute` component
- Unauthorized access attempts redirect to appropriate pages
- Clinicians are automatically redirected to their profile

### User Approval System
- New user registrations require admin approval
- Users see a "Pending Approval" page until accepted
- Admin users can manage approvals through User Management

## Implementation Details

### Components
- `RoleBasedRoute`: Protects routes based on user roles
- `PendingApproval`: Shows waiting message for unapproved users
- `Sidebar`: Filters navigation based on user role

### Context Updates
- `AuthContext`: Updated to handle role-based authentication
- Added `isPendingApproval` state for approval workflow
- Enhanced user interface with role information

### Database Schema
- `profiles` table updated with new role types
- `accept` column added for approval workflow
- Sample data updated to reflect new roles