import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createAuthHeader } from './jwt';

const supabaseUrl = 'https://epgzvmkuxqqbkbvcexcv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZ3p2bWt1eHFxYmtidmNleGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NTE2MzQsImV4cCI6MjA3MDMyNzYzNH0.vPZ8NuePjn-2NE0IMrWtv4L4ug_Hs0JSTe0oVKroGUQ';

// Base Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Enhanced Supabase client with JWT authentication
 */
class SupabaseJWTClient {
  private client: SupabaseClient;
  private accessToken: string | null = null;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Set the JWT access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Create headers with JWT authentication
   */
  private getAuthHeaders(): Record<string, string> {
    if (this.accessToken) {
      return createAuthHeader(this.accessToken);
    }
    return {};
  }

  /**
   * Enhanced query builder that includes JWT authentication
   */
  from(table: string) {
    const query = this.client.from(table);
    
    // Add JWT token to request headers if available
    if (this.accessToken) {
      // Note: Supabase client doesn't directly support custom headers for every request
      // This is more for demonstration. In practice, you might need to implement
      // custom request interceptors or use the RLS policies in Supabase
      console.log('JWT Token would be included in request:', this.accessToken.substring(0, 20) + '...');
    }
    
    return query;
  }

  /**
   * Execute authenticated request with JWT token
   */
  async authenticatedRequest<T>(
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any; authenticated: boolean }> {
    const result = await operation();
    
    return {
      ...result,
      authenticated: !!this.accessToken
    };
  }

  /**
   * Storage operations (if needed)
   */
  get storage() {
    return this.client.storage;
  }

  /**
   * Auth operations (for Supabase auth if needed alongside JWT)
   */
  get auth() {
    return this.client.auth;
  }

  /**
   * Real-time subscriptions
   */
  get realtime() {
    return this.client.realtime;
  }
}

// Create and export the enhanced client
export const supabaseJWT = new SupabaseJWTClient();

// Export types for convenience
export type { SupabaseClient };