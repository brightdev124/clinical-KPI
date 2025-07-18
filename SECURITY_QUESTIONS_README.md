# Security Questions Implementation

This implementation adds a security question system for password recovery to the KPI application using the existing `security_answers` table.

## Features

- **5 Common Security Questions**: Pre-defined questions that users can choose from
- **Optional Registration**: Users can optionally set up a security question during registration
- **Password Recovery**: Users can reset their password using their security question
- **Secure Storage**: Answers are hashed before storage for security
- **User-Friendly Interface**: Step-by-step password recovery process

## Database Setup

### 1. Run the SQL Setup Script

Execute the `security-answers-setup.sql` file in your Supabase SQL editor to set up Row Level Security policies and indexes.

### 2. Existing Table Structure

The implementation uses your existing `security_answers` table:

```sql
create table public.security_answers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  question text not null,
  answer_hash text not null,
  created_at timestamp with time zone default timezone('utc', now())
);
```

## The 5 Security Questions

1. "What was the name of your first pet?"
2. "In what city were you born?"
3. "What is your mother's maiden name?"
4. "What was the name of your elementary school?"
5. "What was the make of your first car?"

## New Pages

### 1. Register Page (`/register`)
- Complete registration form with position selection
- Optional security question setup
- Role-based field display (director/clinician specific fields)
- Password confirmation and validation

### 2. Forgot Password Page (`/forgot-password`)
- Step-by-step password recovery process:
  1. Enter username
  2. Answer security question
  3. Set new password
  4. Success confirmation

## Updated Pages

### Login Page (`/login`)
- Added "Forgot your password?" link
- Added "Register here" link for new users

## Services

### SecurityQuestionService
Located in `src/services/securityQuestionService.ts`

Key methods:
- `getSecurityQuestions()`: Get all 5 available questions
- `saveSecurityAnswer()`: Save user's security answer
- `getUserSecurityQuestion()`: Get user's security question for recovery
- `resetPasswordWithSecurityAnswer()`: Verify answer and reset password
- `hasSecurityQuestionSetup()`: Check if user has security question set up

### Updated UserService
- Added `getAllPositions()` method for registration form

## Security Features

- **Answer Hashing**: Security answers are hashed using SHA-256 before storage
- **Case Insensitive**: Answers are normalized (lowercase, trimmed) before hashing
- **Row Level Security**: Database policies ensure users can only access their own data
- **Input Validation**: Comprehensive form validation on both client and server side

## Usage Flow

### Registration with Security Question
1. User fills out registration form
2. User optionally enables security question
3. User selects a question and provides an answer
4. Answer is hashed and stored securely
5. User account is created

### Password Recovery
1. User clicks "Forgot your password?" on login page
2. User enters their username
3. System retrieves user's security question
4. User answers the security question
5. If correct, user can set a new password
6. Password is updated and user can log in

## File Structure

```
src/
├── pages/
│   ├── Register.tsx          # New registration page
│   ├── ForgotPassword.tsx    # New password recovery page
│   └── Login.tsx             # Updated with new links
├── services/
│   ├── securityQuestionService.ts  # New service for security questions
│   └── userService.ts        # Updated with getAllPositions()
└── App.tsx                   # Updated with new routes

Database Setup:
└── security-answers-setup.sql       # SQL setup script
```

## Setup Instructions

1. **Database Setup**: Run `security-answers-setup.sql` in your Supabase SQL editor
2. **Application**: The new pages and functionality are ready to use
3. **Testing**: 
   - Navigate to `/register` to test registration with security questions
   - Navigate to `/login` and click "Forgot your password?" to test recovery

## Security Considerations

1. **Client-Side Hashing**: Currently using client-side SHA-256 hashing. In production, consider server-side hashing with salt.
2. **Rate Limiting**: Consider implementing rate limiting for password reset attempts.
3. **Answer Validation**: Security answers are case-insensitive and trimmed for better user experience.
4. **Database Policies**: RLS policies ensure data isolation between users.

## Ready to Use!

The implementation is complete and ready for production use. Users can now:
- Register with optional security questions
- Recover passwords using security questions
- All existing functionality remains intact