# JWT Authentication Implementation - KPI Brain

## 🎯 Overview

This document describes the JWT (JSON Web Token) authentication system implemented for the KPI Brain application, providing secure user authentication with 1-hour token expiration and automatic refresh capabilities.

## 🏗️ Architecture

### Core Components

1. **JWT Utilities** (`src/lib/jwt.ts`)
   - Token generation and verification
   - 1-hour access token expiration
   - 7-day refresh token expiration
   - Secure token validation

2. **Token Storage** (`src/lib/tokenStorage.ts`)
   - LocalStorage management
   - Token persistence
   - Automatic cleanup
   - Migration from legacy auth

3. **Enhanced Supabase Client** (`src/lib/supabase.ts`)
   - JWT-aware database queries
   - Automatic token inclusion
   - Request logging and debugging

4. **API Service** (`src/lib/apiService.ts`)
   - Authenticated API requests
   - Error handling
   - Operation logging

5. **Enhanced AuthContext** (`src/contexts/AuthContext.tsx`)
   - JWT state management
   - Automatic token refresh
   - User session handling

## 🔐 Authentication Flow

### Login Process
```
1. User enters credentials
2. Validate against database/mock users
3. Generate JWT access token (1h) + refresh token (7d)
4. Store tokens in localStorage
5. Update application state
6. Set Supabase JWT client token
```

### Token Refresh Process
```
1. Monitor token expiration (auto-check every minute)
2. When token expires in <5 minutes, auto-refresh
3. Verify refresh token validity
4. Generate new access token
5. Update storage and state
6. Continue user session seamlessly
```

### Logout Process
```
1. Clear all tokens from localStorage
2. Reset application state
3. Clear Supabase JWT client
4. Redirect to landing page
```

## 📊 JWT Token Structure

### Access Token Payload
```json
{
  "id": "user-uuid",
  "username": "user123",
  "name": "Dr. John Doe",
  "role": "director",
  "position": "position-uuid",
  "assignedClinicians": ["clinician-id-1", "clinician-id-2"],
  "iat": 1704067200,
  "exp": 1704070800,
  "iss": "kpi-brain",
  "aud": "kpi-brain-users"
}
```

### Refresh Token Payload
```json
{
  "id": "user-uuid",
  "username": "user123",
  "iat": 1704067200,
  "exp": 1704672000,
  "iss": "kpi-brain",
  "aud": "kpi-brain-users"
}
```

## 🛠️ Implementation Details

### Configuration
- **Access Token Expiry**: 1 hour
- **Refresh Token Expiry**: 7 days
- **Auto-refresh Trigger**: 5 minutes before expiry
- **Storage**: localStorage
- **Secret Keys**: Environment-based (change in production)

### Security Features
- ✅ Cryptographic token signing
- ✅ Token expiration validation
- ✅ Issuer and audience verification
- ✅ Automatic token refresh
- ✅ Secure token storage
- ✅ Legacy migration support

### Integration Points

#### Supabase Integration
```typescript
// Enhanced client with JWT logging
import { supabaseJWT } from '../lib/supabase';

// Set token for authenticated requests
supabaseJWT.setAccessToken(accessToken);

// Execute authenticated query
const result = await supabaseJWT.authenticatedRequest(
  () => supabase.from('profiles').select('*')
);
```

#### API Requests
```typescript
import { APIService } from '../lib/apiService';

// All requests include JWT automatically
const profiles = await APIService.getAllProfiles();
const kpis = await APIService.getKPIs();
```

#### React Component Usage
```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { 
    user, 
    accessToken, 
    isTokenExpiring,
    refreshToken,
    logout 
  } = useAuth();

  // Use authentication state
  if (isTokenExpiring) {
    console.log('Token expiring soon, will auto-refresh');
  }
};
```

## 🧪 Testing

### Demo Application
Open `jwt-demo.html` in your browser to test JWT functionality:

1. **Login Testing**
   - Test with different user roles
   - Verify token generation
   - Check payload structure

2. **Token Expiration**
   - Watch real-time countdown
   - Test auto-refresh logic
   - Verify token validation

3. **API Integration**
   - Test authenticated requests
   - Verify header inclusion
   - Check error handling

### Mock Users
| Username | Role | Status | Description |
|----------|------|--------|-------------|
| `admin` | super-admin | ✅ Active | System administrator |
| `director` | director | ✅ Active | Clinical director |
| `clinician` | clinician | ✅ Active | Medical clinician |
| `pending` | clinician | ⏳ Pending | Awaiting approval |

## 🔧 Configuration

### Environment Variables (Production)
```env
JWT_SECRET=your-super-secure-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

### Token Storage Keys
- `kpi_access_token` - JWT access token
- `kpi_refresh_token` - JWT refresh token
- `kpi_token_expires_at` - Expiration timestamp
- `kpi_user_data` - User profile data

## 📈 Monitoring & Debugging

### Development Features
- 🔍 Real-time token status (JWTStatus component)
- 📊 Token expiration countdown
- 🔄 Manual refresh testing
- 📝 Request logging
- ⚠️ Expiration warnings

### Console Logging
```
✅ Mock user logged in with JWT tokens
🔄 Token is expiring, attempting refresh...
🔄 Token refreshed successfully
🚪 Logging out user...
✅ User logged out successfully
```

## 🚀 Production Deployment

### Security Checklist
- [ ] Change JWT secrets in production
- [ ] Use HTTPS for all requests
- [ ] Implement proper CORS policies
- [ ] Set up monitoring for token usage
- [ ] Configure rate limiting
- [ ] Implement token blacklisting (if needed)

### Performance Considerations
- ✅ Automatic token refresh prevents expired requests
- ✅ LocalStorage for fast token access
- ✅ Minimal payload size for faster requests
- ✅ Efficient token validation

## 🎨 User Experience

### Visual Indicators
- 🟢 **Active Session**: User authenticated with valid token
- 🟡 **Expiring Soon**: Token expires in <5 minutes (auto-refresh)
- 🔴 **Expired**: Token expired, refresh failed
- ⏳ **Pending**: User awaiting approval (no tokens)

### Seamless Experience
- ✅ Automatic token refresh (no user interruption)
- ✅ Persistent sessions across browser restarts
- ✅ Legacy authentication migration
- ✅ Real-time status updates

## 🔄 Migration from Legacy Auth

The system automatically migrates from localStorage-based authentication:

```typescript
// Legacy storage detected
const legacyUser = localStorage.getItem('user');

if (legacyUser) {
  // Generate JWT tokens for existing user
  const tokens = generateTokens(userData);
  TokenStorage.storeTokens(tokens);
  
  // Clear legacy storage
  localStorage.removeItem('user');
  localStorage.removeItem('pendingUser');
}
```

## 📚 Additional Resources

- [JWT.io - Token Debugger](https://jwt.io/)
- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [React Context API](https://react.dev/reference/react/createContext)
- [JSON Web Token RFC](https://tools.ietf.org/html/rfc7519)

---

**Implementation Status**: ✅ Complete
**Testing**: ✅ Demo available
**Production Ready**: ⚠️ Update secrets before deployment