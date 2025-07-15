// Simple JWT implementation for demo purposes
// In production, use a proper JWT library

// JWT Configuration
const JWT_SECRET = 'kpi_brain_jwt_secret_2024_change_in_production';
const JWT_REFRESH_SECRET = 'kpi_brain_refresh_secret_2024_change_in_production';
const JWT_EXPIRES_IN = '1h'; // 1 hour
const JWT_REFRESH_EXPIRES_IN = '7d'; // 7 days

export interface JWTPayload {
  id: string;
  username: string;
  name: string;
  role: 'super-admin' | 'director' | 'clinician' | 'admin';
  position?: string;
  assignedClinicians?: string[];
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Simple base64url encoding for demo
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Simple base64url decoding for demo
function base64UrlDecode(str: string): string {
  // Add padding
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

// Simple JWT creation for demo purposes
function createSimpleJWT(payload: any, secret: string, expiresIn: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  // Convert expiration string to seconds
  let expSeconds = 3600; // Default 1 hour
  if (expiresIn === '1h') expSeconds = 3600;
  if (expiresIn === '7d') expSeconds = 604800;
  
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expSeconds,
    iss: 'kpi-brain',
    aud: 'kpi-brain-users'
  };
  
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  
  // Simple signature (not cryptographically secure - for demo only)
  const signature = base64UrlEncode(secret + headerEncoded + payloadEncoded);
  
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Generate JWT access and refresh tokens
 */
export const generateTokens = (user: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): TokenPair => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    position: user.position,
    assignedClinicians: user.assignedClinicians,
    iss: 'kpi-brain',
    aud: 'kpi-brain-users'
  };

  const accessToken = createSimpleJWT(payload, JWT_SECRET, JWT_EXPIRES_IN);

  const refreshTokenPayload = {
    id: user.id,
    username: user.username,
    iss: 'kpi-brain',
    aud: 'kpi-brain-users'
  };

  const refreshToken = createSimpleJWT(refreshTokenPayload, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN);

  // Calculate expiration time (1 hour from now)
  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour in milliseconds

  return {
    accessToken,
    refreshToken,
    expiresAt
  };
};

/**
 * Verify and decode JWT access token (simple demo version)
 */
export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format');
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('Token has expired');
      return null;
    }
    
    // Check issuer and audience
    if (payload.iss !== 'kpi-brain' || payload.aud !== 'kpi-brain-users') {
      console.error('Invalid token issuer or audience');
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
};

/**
 * Verify refresh token (simple demo version)
 */
export const verifyRefreshToken = (token: string): { id: string; username: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid refresh token format');
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(parts[1])) as any;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('Refresh token has expired');
      return null;
    }
    
    // Check issuer and audience
    if (payload.iss !== 'kpi-brain' || payload.aud !== 'kpi-brain-users') {
      console.error('Invalid refresh token issuer or audience');
      return null;
    }
    
    return { id: payload.id, username: payload.username };
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export const isTokenExpiring = (expiresAt: number): boolean => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  return (expiresAt - now) <= fiveMinutes;
};

/**
 * Get token expiration time from JWT (simple demo version)
 */
export const getTokenExpiration = (token: string): number | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    return payload?.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

/**
 * Create authorization header for API requests
 */
export const createAuthHeader = (token: string): Record<string, string> => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Extract token from authorization header
 */
export const extractTokenFromHeader = (authHeader: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};