import { supabase } from '../lib/supabase';

export interface KPIGroup {
  id: string;
  title: string;
  director: string;
  kpi: string;
  created_at?: string;
}

export interface CreateKPIGroupData {
  title: string;
  director: string;
  kpi: string;
}

export interface UpdateKPIGroupData {
  title?: string;
  director?: string;
  kpi?: string;
}

export interface KPIGroupWithDetails {
  id: string;
  title: string;
  director: string;
  kpi: string;
  created_at?: string;
  kpi_info?: {
    id: string;
    title: string;
    description: string;
    weight: number;
    floor: string;
  };
  director_info?: {
    id: string;
    name: string;
    username: string;
  };
}

export class KPIGroupService {
  /**
   * Fetch all KPI groups from the database
   */
  static async getAllKPIGroups(): Promise<KPIGroup[]> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KPI groups: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Fetch KPI groups with detailed information (joins with KPIs and profiles)
   */
  static async getKPIGroupsWithDetails(): Promise<KPIGroupWithDetails[]> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select(`
        *,
        kpi_info:kpi(
          id,
          title,
          description,
          weight,
          floor
        ),
        director_info:director(
          id,
          name,
          username
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KPI groups with details: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get KPI groups by director ID
   */
  static async getKPIGroupsByDirector(directorId: string): Promise<KPIGroup[]> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select('*')
      .eq('director', directorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KPI groups by director: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get KPI groups by director ID with details
   */
  static async getKPIGroupsByDirectorWithDetails(directorId: string): Promise<KPIGroupWithDetails[]> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select(`
        *,
        kpi_info:kpi(
          id,
          title,
          description,
          weight,
          floor
        ),
        director_info:director(
          id,
          name,
          username
        )
      `)
      .eq('director', directorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KPI groups by director with details: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get unique group titles for a director
   */
  static async getGroupTitlesByDirector(directorId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select('title')
      .eq('director', directorId);

    if (error) {
      throw new Error(`Failed to fetch group titles: ${error.message}`);
    }

    const titles = Array.from(new Set(data.map(group => group.title)))
      .filter(title => title && title.trim() !== '')
      .sort();

    return titles;
  }

  /**
   * Get KPIs in a specific group for a director
   */
  static async getKPIsInGroup(directorId: string, groupTitle: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select('kpi')
      .eq('director', directorId)
      .eq('title', groupTitle);

    if (error) {
      throw new Error(`Failed to fetch KPIs in group: ${error.message}`);
    }

    return data.map(group => group.kpi);
  }

  /**
   * Create a new KPI group entry
   */
  static async createKPIGroup(groupData: CreateKPIGroupData): Promise<KPIGroup> {
    const { data, error } = await supabase
      .from('kpi_group')
      .insert({
        title: groupData.title,
        director: groupData.director,
        kpi: groupData.kpi,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create KPI group: ${error.message}`);
    }

    return data;
  }

  /**
   * Create multiple KPI group entries for a group
   */
  static async createKPIGroupBatch(groupTitle: string, directorId: string, kpiIds: string[]): Promise<KPIGroup[]> {
    const groupEntries = kpiIds.map(kpiId => ({
      title: groupTitle,
      director: directorId,
      kpi: kpiId,
    }));

    const { data, error } = await supabase
      .from('kpi_group')
      .insert(groupEntries)
      .select();

    if (error) {
      throw new Error(`Failed to create KPI group batch: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update a KPI group entry
   */
  static async updateKPIGroup(id: string, groupData: UpdateKPIGroupData): Promise<KPIGroup> {
    const updateData: any = {};
    if (groupData.title !== undefined) updateData.title = groupData.title;
    if (groupData.director !== undefined) updateData.director = groupData.director;
    if (groupData.kpi !== undefined) updateData.kpi = groupData.kpi;

    const { data, error } = await supabase
      .from('kpi_group')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update KPI group: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a KPI group entry
   */
  static async deleteKPIGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('kpi_group')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete KPI group: ${error.message}`);
    }
  }

  /**
   * Delete all KPI group entries for a specific group title and director
   */
  static async deleteKPIGroupByTitleAndDirector(groupTitle: string, directorId: string): Promise<void> {
    const { error } = await supabase
      .from('kpi_group')
      .delete()
      .eq('title', groupTitle)
      .eq('director', directorId);

    if (error) {
      throw new Error(`Failed to delete KPI group: ${error.message}`);
    }
  }

  /**
   * Update a group (delete old entries and create new ones)
   */
  static async updateKPIGroupByTitle(
    groupTitle: string, 
    directorId: string, 
    newKpiIds: string[]
  ): Promise<KPIGroup[]> {
    // First, delete existing entries for this group
    await this.deleteKPIGroupByTitleAndDirector(groupTitle, directorId);
    
    // Then create new entries
    if (newKpiIds.length > 0) {
      return await this.createKPIGroupBatch(groupTitle, directorId, newKpiIds);
    }
    
    return [];
  }

  /**
   * Check if a group title exists for a director
   */
  static async groupTitleExists(groupTitle: string, directorId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select('id')
      .eq('title', groupTitle)
      .eq('director', directorId)
      .limit(1);

    if (error) {
      throw new Error(`Failed to check group title existence: ${error.message}`);
    }

    return (data || []).length > 0;
  }

  /**
   * Get KPI group statistics for a director
   */
  static async getKPIGroupStats(directorId: string): Promise<{
    totalGroups: number;
    totalKPIs: number;
    averageKPIsPerGroup: number;
    groupTitles: string[];
  }> {
    const { data, error } = await supabase
      .from('kpi_group')
      .select('title, kpi')
      .eq('director', directorId);

    if (error) {
      throw new Error(`Failed to fetch KPI group statistics: ${error.message}`);
    }

    const groupTitles = Array.from(new Set(data.map(group => group.title)));
    const totalKPIs = data.length;
    const totalGroups = groupTitles.length;
    const averageKPIsPerGroup = totalGroups > 0 ? Math.round((totalKPIs / totalGroups) * 100) / 100 : 0;

    return {
      totalGroups,
      totalKPIs,
      averageKPIsPerGroup,
      groupTitles,
    };
  }
}

export default KPIGroupService;