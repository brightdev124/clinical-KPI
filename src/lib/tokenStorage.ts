import { TokenPair } from './jwt';

const ACCESS_TOKEN_KEY = 'kpi_access_token';
const REFRESH_TOKEN_KEY = 'kpi_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'kpi_token_expires_at';
const USER_KEY = 'kpi_user_data';

export interface StoredUser {
  id: string;
  username: string;
  name: string;
  role: 'super-admin' | 'director' | 'clinician' | 'admin';
  position?: string;
  assignedClinicians?: string[];
  accept?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Token storage manager for localStorage operations
 */
export class TokenStorage {
  /**
   * Store JWT tokens in localStorage
   */
  static storeTokens(tokens: TokenPair): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, tokens.expiresAt.toString());
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Store user data in localStorage
   */
  static storeUser(user: StoredUser): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  /**
   * Get access token from localStorage
   */
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token from localStorage
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(): number | null {
    try {
      const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
      return expiresAt ? parseInt(expiresAt) : null;
    } catch (error) {
      console.error('Failed to get token expiration:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static getUser(): StoredUser | null {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Get all stored tokens and user data
   */
  static getStoredAuth(): {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    user: StoredUser | null;
  } {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
      expiresAt: this.getTokenExpiration(),
      user: this.getUser()
    };
  }

  /**
   * Check if we have valid tokens stored
   */
  static hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const expiresAt = this.getTokenExpiration();
    
    if (!accessToken || !expiresAt) {
      return false;
    }

    // Check if token is not expired (with 1-minute buffer)
    const now = Date.now();
    const buffer = 60 * 1000; // 1 minute
    return (expiresAt - now) > buffer;
  }

  /**
   * Check if tokens are expiring soon (within 5 minutes)
   */
  static areTokensExpiring(): boolean {
    const expiresAt = this.getTokenExpiration();
    
    if (!expiresAt) {
      return false;
    }

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes
    return (expiresAt - now) <= fiveMinutes && (expiresAt - now) > 0;
  }

  /**
   * Clear all stored tokens and user data
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      localStorage.removeItem(USER_KEY);
      
      // Also clear legacy storage keys for backward compatibility
      localStorage.removeItem('user');
      localStorage.removeItem('pendingUser');
    } catch (error) {
      console.error('Failed to clear stored data:', error);
    }
  }

  /**
   * Update only the access token (for token refresh)
   */
  static updateAccessToken(accessToken: string, expiresAt: number): void {
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
    } catch (error) {
      console.error('Failed to update access token:', error);
    }
  }

  /**
   * Debug function to log all stored auth data (for development)
   */
  static debugLogStoredAuth(): void {
    if (process.env.NODE_ENV === 'development') {
      const auth = this.getStoredAuth();
      console.log('🔐 Stored Auth Debug:', {
        hasAccessToken: !!auth.accessToken,
        hasRefreshToken: !!auth.refreshToken,
        expiresAt: auth.expiresAt ? new Date(auth.expiresAt).toLocaleString() : null,
        user: auth.user ? { id: auth.user.id, username: auth.user.username, role: auth.user.role } : null,
        isValid: this.hasValidTokens(),
        isExpiring: this.areTokensExpiring()
      });
    }
  }
}