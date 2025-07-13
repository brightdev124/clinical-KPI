import { supabase } from '../lib/supabase';

export interface ReviewItem {
  id: string;
  clinician: string; // UUID reference to profiles(id)
  kpi: string; // UUID reference to kpis(id)
  director?: string; // UUID reference to profiles(id) - director who created the review
  met_check: boolean; // true if KPI met
  notes?: string; // if not met
  plan?: string; // if not met
  score: number; // weight or 0
  date: string; // creation timestamp
  file_url?: string; // URL to uploaded file in Supabase Storage
}

export interface CreateReviewItemData {
  clinician: string;
  kpi: string;
  director?: string; // UUID reference to profiles(id) - director who created the review
  met_check: boolean;
  notes?: string;
  plan?: string;
  score: number;
  file_url?: string;
}

export interface UpdateReviewItemData {
  met_check?: boolean;
  notes?: string;
  plan?: string;
  score?: number;
  file_url?: string;
  director?: string; // UUID reference to profiles(id) - director who updated the review
}

export class ReviewService {
  /**
   * Create a new review item
   */
  static async createReviewItem(reviewData: CreateReviewItemData): Promise<ReviewItem> {
    const { data, error } = await supabase
      .from('review_items')
      .insert({
        clinician: reviewData.clinician,
        kpi: reviewData.kpi,
        director: reviewData.director || null,
        met_check: reviewData.met_check,
        notes: reviewData.notes || null,
        plan: reviewData.plan || null,
        score: reviewData.score,
        file_url: reviewData.file_url || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create review item: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all review items for a specific clinician
   */
  static async getClinicianReviews(clinicianId: string): Promise<ReviewItem[]> {
    const { data, error } = await supabase
      .from('review_items')
      .select(`
        *,
        kpis!inner(id, title, description, weight)
      `)
      .eq('clinician', clinicianId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clinician reviews: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get review items for a specific clinician and KPI
   */
  static async getClinicianKPIReviews(clinicianId: string, kpiId: string): Promise<ReviewItem[]> {
    const { data, error } = await supabase
      .from('review_items')
      .select('*')
      .eq('clinician', clinicianId)
      .eq('kpi', kpiId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clinician KPI reviews: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get review items for a specific month and year
   */
  static async getReviewsByPeriod(
    clinicianId: string, 
    month: number, 
    year: number
  ): Promise<ReviewItem[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('review_items')
      .select(`
        *,
        kpis!inner(id, title, description, weight)
      `)
      .eq('clinician', clinicianId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reviews by period: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a review item
   */
  static async updateReviewItem(id: string, reviewData: UpdateReviewItemData): Promise<ReviewItem> {
    const updateData: any = {};
    if (reviewData.met_check !== undefined) updateData.met_check = reviewData.met_check;
    if (reviewData.notes !== undefined) updateData.notes = reviewData.notes;
    if (reviewData.plan !== undefined) updateData.plan = reviewData.plan;
    if (reviewData.score !== undefined) updateData.score = reviewData.score;
    if (reviewData.file_url !== undefined) updateData.file_url = reviewData.file_url;
    if (reviewData.director !== undefined) updateData.director = reviewData.director;

    const { data, error } = await supabase
      .from('review_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update review item: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a review item
   */
  static async deleteReviewItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('review_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete review item: ${error.message}`);
    }
  }

  /**
   * Calculate clinician score for a specific period
   */
  static async calculateClinicianScore(
    clinicianId: string, 
    month: number, 
    year: number
  ): Promise<number> {
    const reviews = await this.getReviewsByPeriod(clinicianId, month, year);
    
    if (reviews.length === 0) return 0;

    let totalWeight = 0;
    let earnedScore = 0;

    reviews.forEach(review => {
      totalWeight += (review as any).kpis.weight;
      earnedScore += review.score;
    });

    return totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 0;
  }

  /**
   * Get all review items with KPI details
   */
  static async getAllReviewsWithKPIs(): Promise<ReviewItem[]> {
    const { data, error } = await supabase
      .from('review_items')
      .select(`
        *,
        kpis!inner(id, title, description, weight),
        clinician_profile:profiles!clinician(id, name, username),
        director_profile:profiles!director(id, name, username)
      `)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all reviews: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Submit multiple review items for a clinician (batch operation)
   */
  static async submitClinicianReview(
    clinicianId: string,
    reviewItems: CreateReviewItemData[]
  ): Promise<ReviewItem[]> {
    const { data, error } = await supabase
      .from('review_items')
      .insert(reviewItems.map(item => ({
        clinician: clinicianId,
        kpi: item.kpi,
        director: item.director || null,
        met_check: item.met_check,
        notes: item.notes || null,
        plan: item.plan || null,
        score: item.score,
        file_url: item.file_url || null,
      })))
      .select();

    if (error) {
      throw new Error(`Failed to submit clinician review: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if a review exists for a specific clinician, KPI, and period
   */
  static async reviewExists(
    clinicianId: string,
    kpiId: string,
    month: number,
    year: number
  ): Promise<boolean> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('review_items')
      .select('id')
      .eq('clinician', clinicianId)
      .eq('kpi', kpiId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .limit(1);

    if (error) {
      throw new Error(`Failed to check review existence: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }
}

export default ReviewService;