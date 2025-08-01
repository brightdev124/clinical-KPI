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
        kpis!inner(id, title, description, weight),
        clinician_profile:profiles!clinician(id, name, accept),
        director_profile:profiles!director(id, name, accept)
      `)
      .eq('clinician', clinicianId)
      .eq('clinician_profile.accept', true)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clinician reviews: ${error.message}`);
    }

    // Additional filtering to ensure only reviews from approved directors are included
    const filteredData = (data || []).filter(review => 
      !review.director_profile || review.director_profile.accept === true
    );

    return filteredData;
  }

  /**
   * Get review items for a specific clinician and KPI
   */
  static async getClinicianKPIReviews(clinicianId: string, kpiId: string): Promise<ReviewItem[]> {
    const { data, error } = await supabase
      .from('review_items')
      .select(`
        *,
        clinician_profile:profiles!clinician(id, name, accept),
        director_profile:profiles!director(id, name, accept)
      `)
      .eq('clinician', clinicianId)
      .eq('kpi', kpiId)
      .eq('clinician_profile.accept', true)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clinician KPI reviews: ${error.message}`);
    }

    // Additional filtering to ensure only reviews from approved directors are included
    const filteredData = (data || []).filter(review => 
      !review.director_profile || review.director_profile.accept === true
    );

    return filteredData;
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
        kpis!inner(id, title, description, weight),
        clinician_profile:profiles!clinician(id, name, accept),
        director_profile:profiles!director(id, name, accept)
      `)
      .eq('clinician', clinicianId)
      .eq('clinician_profile.accept', true)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reviews by period: ${error.message}`);
    }

    // Additional filtering to ensure only reviews from approved directors are included
    const filteredData = (data || []).filter(review => 
      !review.director_profile || review.director_profile.accept === true
    );

    return filteredData;
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
        clinician_profile:profiles!clinician(id, name, username, accept),
        director_profile:profiles!director(id, name, username, accept)
      `)
      .eq('clinician_profile.accept', true)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all reviews: ${error.message}`);
    }

    // Additional filtering to ensure only reviews from approved directors are included
    const filteredData = (data || []).filter(review => 
      !review.director_profile || review.director_profile.accept === true
    );

    return filteredData;
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
      .select(`
        id,
        clinician_profile:profiles!clinician(accept)
      `)
      .eq('clinician', clinicianId)
      .eq('kpi', kpiId)
      .eq('clinician_profile.accept', true)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .limit(1);

    if (error) {
      throw new Error(`Failed to check review existence: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Replace or create a review for a specific clinician, KPI, and period
   * This ensures only one review exists per clinician per KPI per month
   */
  static async replaceReviewForPeriod(
    clinicianId: string,
    kpiId: string,
    month: number,
    year: number,
    reviewData: CreateReviewItemData
  ): Promise<ReviewItem> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // First, get existing reviews to ensure we only delete reviews from approved users
    const existingReviews = await supabase
      .from('review_items')
      .select(`
        id,
        clinician_profile:profiles!clinician(accept)
      `)
      .eq('clinician', clinicianId)
      .eq('kpi', kpiId)
      .eq('clinician_profile.accept', true)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (existingReviews.error) {
      throw new Error(`Failed to fetch existing reviews: ${existingReviews.error.message}`);
    }

    // Delete existing reviews from approved users only
    if (existingReviews.data && existingReviews.data.length > 0) {
      const reviewIds = existingReviews.data.map(review => review.id);
      const { error: deleteError } = await supabase
        .from('review_items')
        .delete()
        .in('id', reviewIds);

      if (deleteError) {
        throw new Error(`Failed to delete existing reviews: ${deleteError.message}`);
      }
    }

    // Then create the new review
    return await this.createReviewItem(reviewData);
  }

  /**
   * Get review items for a specific date range (for weekly reviews)
   */
  static async getReviewsByDateRange(
    clinicianId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReviewItem[]> {
    const { data, error } = await supabase
      .from('review_items')
      .select(`
        *,
        kpis!inner(id, title, description, weight),
        clinician_profile:profiles!clinician(id, name, accept),
        director_profile:profiles!director(id, name, accept)
      `)
      .eq('clinician', clinicianId)
      .eq('clinician_profile.accept', true)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reviews by date range: ${error.message}`);
    }

    // Additional filtering to ensure only reviews from approved directors are included
    const filteredData = (data || []).filter(review => 
      !review.director_profile || review.director_profile.accept === true
    );

    return filteredData;
  }

  /**
   * Replace or create a review for a specific clinician, KPI, and date range
   * This ensures only one review exists per clinician per KPI per date range (for weekly reviews)
   */
  static async replaceReviewForDateRange(
    clinicianId: string,
    kpiId: string,
    startDate: Date,
    endDate: Date,
    reviewData: CreateReviewItemData
  ): Promise<ReviewItem> {
    // First, get existing reviews to ensure we only delete reviews from approved users
    const existingReviews = await supabase
      .from('review_items')
      .select(`
        id,
        clinician_profile:profiles!clinician(accept)
      `)
      .eq('clinician', clinicianId)
      .eq('kpi', kpiId)
      .eq('clinician_profile.accept', true)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (existingReviews.error) {
      throw new Error(`Failed to fetch existing reviews: ${existingReviews.error.message}`);
    }

    // Delete existing reviews from approved users only
    if (existingReviews.data && existingReviews.data.length > 0) {
      const reviewIds = existingReviews.data.map(review => review.id);
      const { error: deleteError } = await supabase
        .from('review_items')
        .delete()
        .in('id', reviewIds);

      if (deleteError) {
        throw new Error(`Failed to delete existing reviews: ${deleteError.message}`);
      }
    }

    // Then create the new review
    return await this.createReviewItem(reviewData);
  }

  /**
   * Calculate monthly averages from weekly reviews
   */
  static async getMonthlyAverageFromWeeklyReviews(
    clinicianId: string, 
    month: number, 
    year: number
  ): Promise<{ kpiId: string; averageScore: number; totalWeight: number; metPercentage: number }[]> {
    // Get the start and end of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const { data, error } = await supabase
      .from('review_items')
      .select(`
        kpi,
        met_check,
        score,
        kpi_info:kpis(weight)
      `)
      .eq('clinician', clinicianId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      throw new Error(`Failed to fetch weekly reviews for monthly average: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by KPI and calculate averages
    const kpiGroups: Record<string, { scores: number[]; metCount: number; totalCount: number; weight: number }> = {};

    data.forEach(review => {
      if (!kpiGroups[review.kpi]) {
        kpiGroups[review.kpi] = {
          scores: [],
          metCount: 0,
          totalCount: 0,
          weight: review.kpi_info?.weight || 0
        };
      }

      kpiGroups[review.kpi].scores.push(review.score || 0);
      kpiGroups[review.kpi].totalCount++;
      if (review.met_check) {
        kpiGroups[review.kpi].metCount++;
      }
    });

    // Calculate averages for each KPI
    return Object.entries(kpiGroups).map(([kpiId, group]) => ({
      kpiId,
      averageScore: group.scores.length > 0 ? group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length : 0,
      totalWeight: group.weight,
      metPercentage: group.totalCount > 0 ? (group.metCount / group.totalCount) * 100 : 0
    }));
  }

  /**
   * Get monthly score from weekly averages
   */
  static async getMonthlyScoreFromWeeklyReviews(
    clinicianId: string, 
    month: number, 
    year: number
  ): Promise<number> {
    const averages = await this.getMonthlyAverageFromWeeklyReviews(clinicianId, month, year);
    
    if (averages.length === 0) {
      return 0;
    }

    const totalPossibleWeight = averages.reduce((sum, avg) => sum + avg.totalWeight, 0);
    const totalEarnedWeight = averages.reduce((sum, avg) => sum + avg.averageScore, 0);

    return totalPossibleWeight > 0 ? Math.round((totalEarnedWeight / totalPossibleWeight) * 100) : 0;
  }
}

export default ReviewService;