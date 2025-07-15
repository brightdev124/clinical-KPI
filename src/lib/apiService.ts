import { supabase, supabaseJWT } from './supabase';
import { createAuthHeader } from './jwt';
import { TokenStorage } from './tokenStorage';

/**
 * Enhanced API service that includes JWT authentication headers
 */
export class APIService {
  /**
   * Execute a Supabase query with JWT authentication logging
   */
  static async executeWithAuth<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName?: string
  ): Promise<{ data: T | null; error: any }> {
    const accessToken = TokenStorage.getAccessToken();
    
    if (accessToken) {
      console.log(`🔐 Executing ${operationName || 'operation'} with JWT authentication`);
      supabaseJWT.setAccessToken(accessToken);
    } else {
      console.log(`⚠️  Executing ${operationName || 'operation'} without authentication`);
    }

    const result = await operation();
    
    if (result.error) {
      console.error(`❌ ${operationName || 'Operation'} failed:`, result.error);
    } else {
      console.log(`✅ ${operationName || 'Operation'} completed successfully`);
    }
    
    return result;
  }

  /**
   * Get all profiles with JWT authentication
   */
  static async getAllProfiles() {
    return this.executeWithAuth(
      () => supabase
        .from('profiles')
        .select(`
          id,
          name,
          username,
          accept,
          created_at,
          updated_at,
          position (
            id,
            position_title,
            role
          )
        `),
      'Get All Profiles'
    );
  }

  /**
   * Get user profile by ID with JWT authentication
   */
  static async getUserProfile(userId: string) {
    return this.executeWithAuth(
      () => supabase
        .from('profiles')
        .select(`
          id,
          name,
          username,
          accept,
          created_at,
          updated_at,
          position (
            id,
            position_title,
            role
          )
        `)
        .eq('id', userId)
        .single(),
      `Get User Profile (${userId})`
    );
  }

  /**
   * Update user approval status with JWT authentication
   */
  static async updateUserApproval(userId: string, approved: boolean) {
    return this.executeWithAuth(
      () => supabase
        .from('profiles')
        .update({ accept: approved })
        .eq('id', userId)
        .select(),
      `Update User Approval (${userId})`
    );
  }

  /**
   * Delete user with JWT authentication
   */
  static async deleteUser(userId: string) {
    return this.executeWithAuth(
      () => supabase
        .from('profiles')
        .delete()
        .eq('id', userId),
      `Delete User (${userId})`
    );
  }

  /**
   * Get KPIs with JWT authentication
   */
  static async getKPIs() {
    return this.executeWithAuth(
      () => supabase
        .from('kpis')
        .select('*')
        .order('created_at', { ascending: true }),
      'Get KPIs'
    );
  }

  /**
   * Create KPI with JWT authentication
   */
  static async createKPI(kpiData: any) {
    return this.executeWithAuth(
      () => supabase
        .from('kpis')
        .insert(kpiData)
        .select()
        .single(),
      'Create KPI'
    );
  }

  /**
   * Update KPI with JWT authentication
   */
  static async updateKPI(kpiId: string, kpiData: any) {
    return this.executeWithAuth(
      () => supabase
        .from('kpis')
        .update(kpiData)
        .eq('id', kpiId)
        .select()
        .single(),
      `Update KPI (${kpiId})`
    );
  }

  /**
   * Delete KPI with JWT authentication
   */
  static async deleteKPI(kpiId: string) {
    return this.executeWithAuth(
      () => supabase
        .from('kpis')
        .delete()
        .eq('id', kpiId),
      `Delete KPI (${kpiId})`
    );
  }

  /**
   * Get monthly reviews with JWT authentication
   */
  static async getMonthlyReviews(clinicianId?: string) {
    const query = supabase
      .from('monthly_reviews')
      .select(`
        *,
        clinician:profiles!monthly_reviews_clinician_fkey (
          id,
          name,
          username
        ),
        director:profiles!monthly_reviews_director_fkey (
          id,
          name,
          username
        )
      `)
      .order('review_date', { ascending: false });

    if (clinicianId) {
      query.eq('clinician', clinicianId);
    }

    return this.executeWithAuth(
      () => query,
      'Get Monthly Reviews'
    );
  }

  /**
   * Create monthly review with JWT authentication
   */
  static async createMonthlyReview(reviewData: any) {
    return this.executeWithAuth(
      () => supabase
        .from('monthly_reviews')
        .insert(reviewData)
        .select()
        .single(),
      'Create Monthly Review'
    );
  }

  /**
   * Update monthly review with JWT authentication
   */
  static async updateMonthlyReview(reviewId: string, reviewData: any) {
    return this.executeWithAuth(
      () => supabase
        .from('monthly_reviews')
        .update(reviewData)
        .eq('id', reviewId)
        .select()
        .single(),
      `Update Monthly Review (${reviewId})`
    );
  }

  /**
   * Get assigned clinicians for a director with JWT authentication
   */
  static async getAssignedClinicians(directorId: string) {
    return this.executeWithAuth(
      () => supabase
        .from('assign')
        .select(`
          clinician,
          profiles!assign_clinician_fkey (
            id,
            name,
            username
          )
        `)
        .eq('director', directorId),
      `Get Assigned Clinicians (${directorId})`
    );
  }

  /**
   * Assign clinician to director with JWT authentication
   */
  static async assignClinician(directorId: string, clinicianId: string) {
    return this.executeWithAuth(
      () => supabase
        .from('assign')
        .insert({ director: directorId, clinician: clinicianId })
        .select(),
      `Assign Clinician (${clinicianId} to ${directorId})`
    );
  }

  /**
   * Remove clinician assignment with JWT authentication
   */
  static async removeClinicianAssignment(directorId: string, clinicianId: string) {
    return this.executeWithAuth(
      () => supabase
        .from('assign')
        .delete()
        .eq('director', directorId)
        .eq('clinician', clinicianId),
      `Remove Clinician Assignment (${clinicianId} from ${directorId})`
    );
  }

  /**
   * Generic method for custom queries with JWT authentication
   */
  static async customQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string
  ) {
    return this.executeWithAuth(operation, operationName);
  }
}

/**
 * HTTP fetch wrapper with JWT authentication
 */
export class HTTPService {
  private static getAuthHeaders(): Record<string, string> {
    const accessToken = TokenStorage.getAccessToken();
    return accessToken ? createAuthHeader(accessToken) : { 'Content-Type': 'application/json' };
  }

  static async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async put<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}