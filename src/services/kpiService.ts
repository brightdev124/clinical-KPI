import { supabase } from '../lib/supabase';

export interface KPI {
  id: string;
  title: string;
  description: string;
  weight: number;
  floor: string;
  is_removed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateKPIData {
  title: string;
  description: string;
  weight: number;
  floor: string;
}

export interface UpdateKPIData {
  title?: string;
  description?: string;
  weight?: number;
  floor?: string;
  is_removed?: boolean;
}

export class KPIService {
  /**
   * Fetch all active KPIs from the database
   */
  static async getAllKPIs(): Promise<KPI[]> {
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KPIs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a KPI by ID
   */
  static async getKPIById(id: string): Promise<KPI | null> {
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('id', id)
      .eq('is_removed', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // KPI not found
      }
      throw new Error(`Failed to fetch KPI: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new KPI
   */
  static async createKPI(kpiData: CreateKPIData): Promise<KPI> {
    // Validate weight is between 1 and 20
    if (kpiData.weight < 1 || kpiData.weight > 20) {
      throw new Error('Weight must be between 1 and 20');
    }

    const { data, error } = await supabase
      .from('kpis')
      .insert({
        title: kpiData.title,
        description: kpiData.description,
        weight: kpiData.weight,
        floor: kpiData.floor,
        is_removed: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create KPI: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a KPI
   */
  static async updateKPI(id: string, kpiData: UpdateKPIData): Promise<KPI> {
    // Validate weight if provided
    if (kpiData.weight !== undefined && (kpiData.weight < 1 || kpiData.weight > 20)) {
      throw new Error('Weight must be between 1 and 20');
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (kpiData.title !== undefined) updateData.title = kpiData.title;
    if (kpiData.description !== undefined) updateData.description = kpiData.description;
    if (kpiData.weight !== undefined) updateData.weight = kpiData.weight;
    if (kpiData.floor !== undefined) updateData.floor = kpiData.floor;
    if (kpiData.is_removed !== undefined) updateData.is_removed = kpiData.is_removed;

    const { data, error } = await supabase
      .from('kpis')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update KPI: ${error.message}`);
    }

    return data;
  }

  /**
   * Soft delete a KPI (mark as removed)
   */
  static async deleteKPI(id: string): Promise<void> {
    const { error } = await supabase
      .from('kpis')
      .update({ is_removed: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete KPI: ${error.message}`);
    }
  }

  /**
   * Permanently delete a KPI (hard delete)
   */
  static async permanentlyDeleteKPI(id: string): Promise<void> {
    const { error } = await supabase
      .from('kpis')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to permanently delete KPI: ${error.message}`);
    }
  }

  /**
   * Restore a soft-deleted KPI
   */
  static async restoreKPI(id: string): Promise<KPI> {
    const { data, error } = await supabase
      .from('kpis')
      .update({ is_removed: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to restore KPI: ${error.message}`);
    }

    return data;
  }

  /**
   * Get KPIs by floor
   */
  static async getKPIsByFloor(floor: string): Promise<KPI[]> {
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('floor', floor)
      .eq('is_removed', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KPIs by floor: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all removed KPIs
   */
  static async getRemovedKPIs(): Promise<KPI[]> {
    const { data, error } = await supabase
      .from('kpis')
      .select('*')
      .eq('is_removed', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch removed KPIs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get KPI statistics
   */
  static async getKPIStats(): Promise<{
    total: number;
    byFloor: Record<string, number>;
    byWeight: Record<string, number>;
    averageWeight: number;
    totalWeight: number;
    removed: number;
  }> {
    const { data, error } = await supabase
      .from('kpis')
      .select('weight, floor, is_removed');

    if (error) {
      throw new Error(`Failed to fetch KPI statistics: ${error.message}`);
    }

    const stats = {
      total: 0,
      byFloor: {} as Record<string, number>,
      byWeight: {} as Record<string, number>,
      averageWeight: 0,
      totalWeight: 0,
      removed: 0,
    };

    let activeKPIs = 0;
    let totalWeightSum = 0;

    data.forEach(kpi => {
      if (kpi.is_removed) {
        stats.removed++;
        return;
      }

      activeKPIs++;
      totalWeightSum += kpi.weight;

      // Count by floor
      stats.byFloor[kpi.floor] = (stats.byFloor[kpi.floor] || 0) + 1;
      
      // Count by weight
      stats.byWeight[kpi.weight.toString()] = (stats.byWeight[kpi.weight.toString()] || 0) + 1;
    });

    stats.total = activeKPIs;
    stats.totalWeight = totalWeightSum;
    stats.averageWeight = activeKPIs > 0 ? Math.round((totalWeightSum / activeKPIs) * 100) / 100 : 0;

    return stats;
  }

  /**
   * Get unique floors
   */
  static async getFloors(): Promise<string[]> {
    const { data, error } = await supabase
      .from('kpis')
      .select('floor')
      .eq('is_removed', false);

    if (error) {
      throw new Error(`Failed to fetch floors: ${error.message}`);
    }

    const floors = Array.from(new Set(data.map(kpi => kpi.floor)))
      .filter(floor => floor && floor.trim() !== '')
      .sort();

    return floors;
  }
}

export default KPIService;