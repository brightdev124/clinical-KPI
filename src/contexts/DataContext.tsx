import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { KPI, KPIService } from '../services/kpiService';
import { ReviewItem, ReviewService } from '../services/reviewService';
import { supabase } from '../lib/supabase';

interface KPIContextType {
  id: string;
  title: string;
  description: string;
  weight: number;
  floor: string;
  is_removed: boolean;
}

interface Clinician {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  assignedDirector: string;
  startDate: string;
  avatar?: string;
}

interface ReviewEntry {
  id: string;
  clinicianId: string;
  kpiId: string;
  month: string;
  year: number;
  met: boolean;
  reviewDate?: string;
  notes?: string;
  plan?: string;
  files?: string[];
}

interface Assignment {
  id: string;
  clinician: string;
  director: string;
  created_at: string;
}

interface Position {
  id: string;
  position_title: string;
  role: 'super-admin' | 'director' | 'clinician';
}

interface Profile {
  id: string;
  name: string;
  username: string;
  position: string; // UUID reference to position table
  accept: boolean;
  created_at: string;
  updated_at: string;
  position_info?: Position; // For joined data
  director_info?: {
    id: string;
    direction: string;
  };
  clinician_info?: {
    id: string;
    type: string;
    type_info?: {
      title: string;
    };
  };
}

interface DataContextType {
  kpis: KPI[];
  removedKPIs: KPI[];
  clinicians: Clinician[];
  reviews: ReviewEntry[];
  reviewItems: ReviewItem[];
  assignments: Assignment[];
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  updateKPI: (kpi: KPI) => Promise<void>;
  addKPI: (kpi: Omit<KPI, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteKPI: (id: string) => Promise<void>;
  restoreKPI: (id: string) => Promise<void>;
  permanentlyDeleteKPI: (id: string) => Promise<void>;
  refreshKPIs: () => Promise<void>;
  refreshRemovedKPIs: () => Promise<void>;
  updateClinician: (clinician: Clinician) => void;
  addClinician: (clinician: Omit<Clinician, 'id'>) => void;
  deleteClinician: (id: string) => void;
  submitReview: (review: Omit<ReviewEntry, 'id'>) => Promise<void>;
  submitKPIReview: (clinicianId: string, kpiId: string, met: boolean, notes?: string, plan?: string) => Promise<void>;
  getClinicianReviews: (clinicianId: string) => ReviewEntry[];
  getClinicianScore: (clinicianId: string, month: string, year: number) => number;
  refreshReviewItems: () => Promise<void>;
  // Assignment functions
  assignClinician: (clinicianId: string, directorId: string) => Promise<void>;
  unassignClinician: (clinicianId: string, directorId: string) => Promise<void>;
  assignDirector: (subordinateDirectorId: string, supervisorDirectorId: string) => Promise<void>;
  unassignDirector: (subordinateDirectorId: string, supervisorDirectorId: string) => Promise<void>;
  getAssignedClinicians: (directorId: string) => Profile[];
  getAssignedDirectors: (directorId: string) => Profile[];
  getUnassignedClinicians: () => Profile[];
  getUnassignedDirectors: () => Profile[];
  getDirectors: () => Profile[];
  getClinicianDirector: (clinicianId: string) => Profile | null;
  getDirectorSupervisor: (directorId: string) => Profile | null;
  refreshProfiles: () => Promise<void>;
  refreshAssignments: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Enhanced mock data with more realistic examples
const mockKPIs: KPI[] = [
  {
    id: '1',
    title: 'Patient Satisfaction Score',
    description: 'Maintain patient satisfaction above 4.5/5 based on post-visit surveys',
    weight: 9,
    floor: '1st Floor',
    is_removed: false,
  },
  {
    id: '2',
    title: 'Documentation Compliance',
    description: 'Complete all required documentation within 24 hours of patient encounter',
    weight: 8,
    floor: '2nd Floor',
    is_removed: false,
  },
  {
    id: '3',
    title: 'Continuing Education',
    description: 'Complete required CE hours and attend mandatory training sessions',
    weight: 6,
    floor: '1st Floor',
    is_removed: false,
  },
  {
    id: '4',
    title: 'Team Collaboration',
    description: 'Effective collaboration with multidisciplinary team and peer feedback',
    weight: 7,
    floor: '3rd Floor',
    is_removed: false,
  },
  {
    id: '5',
    title: 'Clinical Outcomes',
    description: 'Achieve target clinical outcomes for assigned patient population',
    weight: 10,
    floor: '2nd Floor',
    is_removed: false,
  },
  {
    id: '6',
    title: 'Safety Protocols',
    description: 'Adherence to safety protocols and incident-free performance',
    weight: 9,
    floor: '1st Floor',
    is_removed: false,
  },
  {
    id: '7',
    title: 'Quality Improvement',
    description: 'Participation in quality improvement initiatives and process optimization',
    weight: 5,
    floor: '3rd Floor',
    is_removed: false,
  },
];

const mockClinicians: Clinician[] = [
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@clinic.com',
    position: 'Staff Physician',
    department: 'Internal Medicine',
    assignedDirector: '2',
    startDate: '2022-01-15',
  },
  {
    id: '4',
    name: 'Dr. James Wilson',
    email: 'james.wilson@clinic.com',
    position: 'Nurse Practitioner',
    department: 'Primary Care',
    assignedDirector: '2',
    startDate: '2023-03-10',
  },
  {
    id: '5',
    name: 'Dr. Lisa Thompson',
    email: 'lisa.thompson@clinic.com',
    position: 'Physician Assistant',
    department: 'Emergency Medicine',
    assignedDirector: '2',
    startDate: '2022-08-20',
  },
  {
    id: '6',
    name: 'Dr. Michael Chang',
    email: 'michael.chang@clinic.com',
    position: 'Staff Physician',
    department: 'Pediatrics',
    assignedDirector: '2',
    startDate: '2021-11-05',
  },
  {
    id: '7',
    name: 'Dr. Sarah Kim',
    email: 'sarah.kim@clinic.com',
    position: 'Resident',
    department: 'Internal Medicine',
    assignedDirector: '2',
    startDate: '2023-07-01',
  },
];

// Generate more comprehensive mock reviews
const generateMockReviews = (): ReviewEntry[] => {
  const reviews: ReviewEntry[] = [];
  const months = ['January', 'February', 'March', 'April', 'May', 'June'];
  
  mockClinicians.forEach(clinician => {
    months.forEach((month, monthIndex) => {
      mockKPIs.forEach(kpi => {
        // Generate realistic performance patterns
        let metProbability = 0.8; // Base 80% success rate
        
        // Adjust based on clinician experience (newer clinicians might struggle more)
        if (clinician.name.includes('Sarah Kim')) metProbability = 0.7; // Resident
        if (clinician.name.includes('Emily Rodriguez')) metProbability = 0.9; // Experienced
        
        // Adjust based on KPI difficulty
        if (kpi.weight >= 9) metProbability -= 0.1; // Harder KPIs
        
        // Add some month-to-month variation
        metProbability += (Math.random() - 0.5) * 0.2;
        
        const met = Math.random() < metProbability;
        
        reviews.push({
          id: `${clinician.id}-${kpi.id}-${monthIndex}`,
          clinicianId: clinician.id,
          kpiId: kpi.id,
          month,
          year: 2024,
          met,
          reviewDate: met ? undefined : `2024-${String(monthIndex + 2).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          notes: met ? undefined : [
            'Needs improvement in this area',
            'Discussed strategies for better performance',
            'Additional training recommended',
            'Follow-up scheduled for next month',
            'Performance below expected standards'
          ][Math.floor(Math.random() * 5)],
          plan: met ? undefined : [
            'Additional training sessions scheduled',
            'Mentorship program enrollment',
            'Weekly check-ins with supervisor',
            'Peer shadowing opportunities',
            'Performance improvement plan initiated'
          ][Math.floor(Math.random() * 5)],
        });
      });
    });
  });
  
  return reviews;
};

const mockReviews = generateMockReviews();

// Mock assignments for testing
const mockAssignments: Assignment[] = [
  {
    id: 'assign-1',
    clinician: '3', // Dr. Emily Rodriguez (clinician)
    director: '2', // Dr. Sarah Johnson (director)
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'assign-2',
    clinician: '4', // Dr. James Wilson (clinician)
    director: '2', // Dr. Sarah Johnson (director)
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'assign-3',
    clinician: '5', // Dr. Lisa Thompson (clinician)
    director: '2', // Dr. Sarah Johnson (director)
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'assign-4',
    clinician: '6', // Dr. Michael Chen (director)
    director: '2', // Dr. Sarah Johnson (director) - director supervising director
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'assign-5',
    clinician: '7', // Dr. Jennifer Martinez (director)
    director: '2', // Dr. Sarah Johnson (director) - director supervising director
    created_at: '2024-01-15T00:00:00Z'
  }
];

// Mock profiles for testing - simplified structure that matches database
const mockProfiles: Profile[] = [
  {
    id: '1',
    name: 'Admin User',
    username: 'admin',
    position: 'pos-1',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-1',
      position_title: 'System Administrator',
      role: 'super-admin'
    }
  },
  {
    id: '2',
    name: 'Dr. Sarah Johnson',
    username: 'sarah.johnson',
    position: 'pos-2',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-2',
      position_title: 'Clinical Director',
      role: 'director'
    },
    director_info: {
      id: 'dir-2',
      direction: 'General Operations'
    }
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    username: 'emily.rodriguez',
    position: 'pos-3',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-3',
      position_title: 'Staff Physician',
      role: 'clinician'
    }
  },
  {
    id: '4',
    name: 'Dr. James Wilson',
    username: 'james.wilson',
    position: 'pos-4',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-4',
      position_title: 'Nurse Practitioner',
      role: 'clinician'
    }
  },
  {
    id: '5',
    name: 'Dr. Lisa Thompson',
    username: 'lisa.thompson',
    position: 'pos-5',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-5',
      position_title: 'Physician Assistant',
      role: 'clinician'
    }
  },
  {
    id: '6',
    name: 'Dr. Michael Chen',
    username: 'michael.chen',
    position: 'pos-6',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-6',
      position_title: 'Associate Director',
      role: 'director'
    },
    director_info: {
      id: 'dir-6',
      direction: 'Emergency Medicine'
    }
  },
  {
    id: '7',
    name: 'Dr. Jennifer Martinez',
    username: 'jennifer.martinez',
    position: 'pos-7',
    accept: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    position_info: {
      id: 'pos-7',
      position_title: 'Clinical Director',
      role: 'director'
    },
    director_info: {
      id: 'dir-7',
      direction: 'Pediatrics'
    }
  }
];

// Mock review items for testing - includes both clinicians and directors
const generateMockReviewItems = (): ReviewItem[] => {
  const reviewItems: ReviewItem[] = [];
  const months = ['January', 'February', 'March', 'April', 'May', 'June'];
  
  // Get all staff members (clinicians and directors) who are assigned
  const allStaffIds = ['3', '4', '5', '6', '7']; // IDs from mockProfiles
  
  allStaffIds.forEach(staffId => {
    months.forEach((month, monthIndex) => {
      mockKPIs.forEach(kpi => {
        // Generate realistic performance patterns
        let metProbability = 0.8; // Base 80% success rate
        
        // Adjust based on staff member (directors might have slightly higher scores)
        if (['6', '7'].includes(staffId)) metProbability = 0.85; // Directors
        if (staffId === '5') metProbability = 0.75; // Dr. Lisa Thompson
        
        // Adjust based on KPI difficulty
        if (kpi.weight >= 9) metProbability -= 0.1; // Harder KPIs
        
        // Add some month-to-month variation
        metProbability += (Math.random() - 0.5) * 0.2;
        metProbability = Math.max(0.1, Math.min(0.95, metProbability)); // Keep between 10% and 95%
        
        const met = Math.random() < metProbability;
        const score = met ? kpi.weight : 0;
        
        // Create date for the review
        const reviewDate = new Date(2024, monthIndex + 1, Math.floor(Math.random() * 28) + 1);
        
        reviewItems.push({
          id: `review-${staffId}-${kpi.id}-${monthIndex}`,
          clinician: staffId,
          kpi: kpi.id,
          director: '2', // Dr. Sarah Johnson as the reviewing director
          met_check: met,
          notes: met ? undefined : [
            'Needs improvement in this area',
            'Discussed strategies for better performance',
            'Additional training recommended',
            'Follow-up scheduled for next month',
            'Performance below expected standards'
          ][Math.floor(Math.random() * 5)],
          plan: met ? undefined : [
            'Additional training sessions scheduled',
            'Mentorship program enrollment',
            'Weekly check-ins with supervisor',
            'Peer shadowing opportunities',
            'Performance improvement plan initiated'
          ][Math.floor(Math.random() * 5)],
          score: score,
          date: reviewDate.toISOString(),
          file_url: met ? undefined : (Math.random() > 0.7 ? 'https://example.com/improvement-plan.pdf' : undefined)
        });
      });
    });
  });
  
  return reviewItems;
};

const mockReviewItems = generateMockReviewItems();

// Services for database operations
const ProfileService = {
  async getAllProfiles(): Promise<Profile[]> {
    try {
      console.log('ProfileService: Attempting to fetch profiles...');
      
      // First, try the simplest possible query to test connection
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id, name')
        .limit(1);

      if (testError) {
        console.error('Basic profiles table test failed:', testError);
        throw testError;
      }

      console.log('Basic profiles table test successful, found records:', testData?.length || 0);

      // Now try with position join
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          position_info:position(
            id,
            position_title,
            role
          )
        `)
        .eq('accept', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Position join query failed, trying simple query:', error);
        // Fallback to simple query without joins
        const { data: simpleData, error: simpleError } = await supabase
          .from('profiles')
          .select('*')
          .eq('accept', true)
          .order('created_at', { ascending: false });

        if (simpleError) {
          console.error('Simple profiles query also failed:', simpleError);
          throw simpleError;
        }

        console.log('Simple profiles query successful, found records:', simpleData?.length || 0);

        // Add mock position_info for compatibility
        return (simpleData || []).map(profile => ({
          ...profile,
          position_info: {
            id: 'mock-pos-' + profile.id,
            position_title: profile.role === 'director' ? 'Clinical Director' : 
                           profile.role === 'super-admin' ? 'Administrator' : 'Clinician',
            role: profile.role || 'clinician'
          }
        }));
      }

      console.log('Position join query successful, found records:', data?.length || 0);
      return data || [];
    } catch (err) {
      console.error('Error fetching profiles:', err);
      throw err;
    }
  },

  async getDirectors(): Promise<Profile[]> {
    try {
      const allProfiles = await this.getAllProfiles();
      return allProfiles.filter(profile => 
        profile.position_info?.role === 'director' || 
        profile.role === 'director'
      );
    } catch (err) {
      console.error('Error fetching directors:', err);
      throw err;
    }
  },

  async getClinicians(): Promise<Profile[]> {
    try {
      const allProfiles = await this.getAllProfiles();
      return allProfiles.filter(profile => 
        profile.position_info?.role === 'clinician' ||
        profile.role === 'clinician' ||
        (!profile.position_info?.role && !profile.role?.includes('admin') && !profile.role?.includes('director'))
      );
    } catch (err) {
      console.error('Error fetching clinicians:', err);
      throw err;
    }
  }
};

const AssignmentService = {
  async getAllAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assign')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }

    return data || [];
  },

  async assignClinician(clinicianId: string, directorId: string): Promise<void> {
    const { error } = await supabase
      .from('assign')
      .insert({
        clinician: clinicianId,
        director: directorId
      });

    if (error) {
      console.error('Error assigning clinician:', error);
      throw error;
    }
  },

  async unassignClinician(clinicianId: string, directorId: string): Promise<void> {
    const { error } = await supabase
      .from('assign')
      .delete()
      .eq('clinician', clinicianId)
      .eq('director', directorId);

    if (error) {
      console.error('Error unassigning clinician:', error);
      throw error;
    }
  },

  async assignDirector(subordinateDirectorId: string, supervisorDirectorId: string): Promise<void> {
    const { error } = await supabase
      .from('assign')
      .insert({
        clinician: subordinateDirectorId,
        director: supervisorDirectorId
      });

    if (error) {
      console.error('Error assigning director:', error);
      throw error;
    }
  },

  async unassignDirector(subordinateDirectorId: string, supervisorDirectorId: string): Promise<void> {
    const { error } = await supabase
      .from('assign')
      .delete()
      .eq('clinician', subordinateDirectorId)
      .eq('director', supervisorDirectorId);

    if (error) {
      console.error('Error unassigning director:', error);
      throw error;
    }
  }
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [removedKPIs, setRemovedKPIs] = useState<KPI[]>([]);
  const [clinicians, setClinicians] = useState<Clinician[]>(mockClinicians);
  const [reviews, setReviews] = useState<ReviewEntry[]>(mockReviews);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(mockReviewItems);
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load KPIs from Supabase on component mount
  useEffect(() => {
    console.log('DataContext: Starting data initialization...');
    refreshKPIs();
    refreshRemovedKPIs();
    refreshProfiles();
    refreshAssignments();
    refreshReviewItems();
  }, []);

  const refreshKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedKPIs = await KPIService.getAllKPIs();
      setKPIs(fetchedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KPIs');
      // Fallback to mock data if database fails
      setKPIs(mockKPIs);
    } finally {
      setLoading(false);
    }
  };

  const refreshRemovedKPIs = async () => {
    try {
      setError(null);
      const fetchedRemovedKPIs = await KPIService.getRemovedKPIs();
      setRemovedKPIs(fetchedRemovedKPIs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load removed KPIs');
      console.error('Error fetching removed KPIs:', err);
    }
  };

  const updateKPI = async (kpi: KPI) => {
    try {
      setLoading(true);
      setError(null);
      await KPIService.updateKPI(kpi.id, {
        title: kpi.title,
        description: kpi.description,
        weight: kpi.weight,
        floor: kpi.floor,
        is_removed: kpi.is_removed,
      });
      setKPIs(prev => prev.map(k => k.id === kpi.id ? kpi : k));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update KPI');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addKPI = async (kpi: Omit<KPI, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);
      const newKPI = await KPIService.createKPI({
        title: kpi.title,
        description: kpi.description,
        weight: kpi.weight,
        floor: kpi.floor,
      });
      setKPIs(prev => [...prev, newKPI]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add KPI');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteKPI = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await KPIService.deleteKPI(id); // This is soft delete
      // Move KPI from active to removed
      const kpiToRemove = kpis.find(k => k.id === id);
      if (kpiToRemove) {
        setKPIs(prev => prev.filter(k => k.id !== id));
        setRemovedKPIs(prev => [...prev, { ...kpiToRemove, is_removed: true }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete KPI');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const restoreKPI = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const restoredKPI = await KPIService.restoreKPI(id);
      // Move KPI from removed to active
      setRemovedKPIs(prev => prev.filter(k => k.id !== id));
      setKPIs(prev => [...prev, restoredKPI]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore KPI');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeleteKPI = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await KPIService.permanentlyDeleteKPI(id);
      // Remove KPI completely from removed list
      setRemovedKPIs(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to permanently delete KPI');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateClinician = (clinician: Clinician) => {
    setClinicians(prev => prev.map(c => c.id === clinician.id ? clinician : c));
  };

  const addClinician = (clinician: Omit<Clinician, 'id'>) => {
    const newClinician = { ...clinician, id: Date.now().toString() };
    setClinicians(prev => [...prev, newClinician]);
  };

  const deleteClinician = (id: string) => {
    setClinicians(prev => prev.filter(c => c.id !== id));
  };

  const submitReview = (review: Omit<ReviewEntry, 'id'>) => {
    const newReview = { ...review, id: Date.now().toString() };
    setReviews(prev => [...prev, newReview]);
  };

  const getClinicianReviews = (clinicianId: string) => {
    // Convert ReviewItem[] to ReviewEntry[] format for backward compatibility
    return reviewItems
      .filter(r => r.clinician === clinicianId)
      .map(r => ({
        id: r.id,
        clinicianId: r.clinician,
        kpiId: r.kpi,
        month: new Date(r.date).toLocaleString('default', { month: 'long' }),
        year: new Date(r.date).getFullYear(),
        met: r.met_check,
        reviewDate: r.met_check ? undefined : r.date,
        notes: r.notes,
        plan: r.plan,
        files: r.file_url ? [r.file_url] : undefined,
      }));
  };

  // Memoized score calculation to avoid expensive recalculations
  const scoreCache = useMemo(() => new Map<string, number>(), [reviewItems, kpis, profiles]);

  const getClinicianScore = useCallback((clinicianId: string, month: string, year: number) => {
    const cacheKey = `${clinicianId}-${month}-${year}`;
    
    // Check cache first
    if (scoreCache.has(cacheKey)) {
      return scoreCache.get(cacheKey)!;
    }

    // Check if the ID belongs to a director and if they are approved
    const profile = profiles.find(p => p.id === clinicianId);
    
    // Only calculate scores for approved users
    if (!profile || !profile.accept) {
      scoreCache.set(cacheKey, 0);
      return 0;
    }
    
    // For directors, calculate their individual performance score (not team average)
    // Directors are evaluated on their own KPI performance just like clinicians
    const score = getClinicianScoreInternal(clinicianId, month, year);
    scoreCache.set(cacheKey, score);
    return score;
  }, [profiles, scoreCache]);
  
  // Memoized review data by month/year to avoid repeated filtering
  const reviewsByMonthYear = useMemo(() => {
    const grouped = new Map<string, ReviewItem[]>();
    
    reviewItems.forEach(r => {
      const reviewDate = new Date(r.date);
      const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
      const reviewYear = reviewDate.getFullYear();
      const key = `${r.clinician}-${reviewMonth}-${reviewYear}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(r);
    });
    
    return grouped;
  }, [reviewItems]);

  // Memoized KPI lookup for faster access
  const kpiMap = useMemo(() => {
    const map = new Map<string, KPIContextType>();
    kpis.forEach(kpi => map.set(kpi.id, kpi));
    return map;
  }, [kpis]);

  // Internal function to calculate individual clinician scores
  const getClinicianScoreInternal = useCallback((clinicianId: string, month: string, year: number) => {
    // Ensure the clinician is approved before calculating their score
    const profile = profiles.find(p => p.id === clinicianId);
    if (!profile || !profile.accept) {
      return 0;
    }

    // Get pre-filtered reviews for this clinician/month/year
    const reviewKey = `${clinicianId}-${month}-${year}`;
    const clinicianReviews = reviewsByMonthYear.get(reviewKey) || [];
    
    if (clinicianReviews.length === 0) return 0;
    
    let totalPossibleWeight = 0;
    let earnedWeight = 0;
    
    clinicianReviews.forEach(review => {
      const kpi = kpiMap.get(review.kpi);
      if (kpi) {
        totalPossibleWeight += kpi.weight;
        // Add the KPI weight to earned score only if met_check is true
        if (review.met_check) {
          earnedWeight += kpi.weight;
        }
        // If met_check is false, add 0 (no weight earned)
      }
    });
    
    // Calculate percentage: (earned weight / total possible weight) * 100
    return totalPossibleWeight > 0 ? Math.round((earnedWeight / totalPossibleWeight) * 100) : 0;
  }, [profiles, reviewsByMonthYear, kpiMap]);

  // Assignment functions
  const assignClinician = async (clinicianId: string, directorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await AssignmentService.assignClinician(clinicianId, directorId);
      
      // Refresh assignments after successful assignment
      await refreshAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign clinician');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unassignClinician = async (clinicianId: string, directorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await AssignmentService.unassignClinician(clinicianId, directorId);
      
      // Refresh assignments after successful unassignment
      await refreshAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign clinician');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignDirector = async (subordinateDirectorId: string, supervisorDirectorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await AssignmentService.assignDirector(subordinateDirectorId, supervisorDirectorId);
      
      // Refresh assignments after successful assignment
      await refreshAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign director');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unassignDirector = async (subordinateDirectorId: string, supervisorDirectorId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await AssignmentService.unassignDirector(subordinateDirectorId, supervisorDirectorId);
      
      // Refresh assignments after successful unassignment
      await refreshAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign director');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAssignedClinicians = (directorId: string): Profile[] => {
    const assignedClinicianIds = assignments
      .filter(a => a.director === directorId)
      .map(a => a.clinician);
    
    return profiles.filter(p => 
      assignedClinicianIds.includes(p.id) && 
      p.position_info?.role === 'clinician' && 
      p.accept === true
    );
  };

  const getAssignedDirectors = (directorId: string): Profile[] => {
    const assignedDirectorIds = assignments
      .filter(a => a.director === directorId)
      .map(a => a.clinician);
    
    return profiles.filter(p => 
      assignedDirectorIds.includes(p.id) && 
      p.position_info?.role === 'director' && 
      p.accept === true
    );
  };

  const getUnassignedClinicians = (): Profile[] => {
    const assignedClinicianIds = assignments.map(a => a.clinician);
    return profiles.filter(p => 
      !assignedClinicianIds.includes(p.id) && p.position_info?.role === 'clinician'
    );
  };

  const getUnassignedDirectors = (): Profile[] => {
    const assignedDirectorIds = assignments.map(a => a.clinician);
    return profiles.filter(p => 
      !assignedDirectorIds.includes(p.id) && p.position_info?.role === 'director'
    );
  };

  const getDirectors = (): Profile[] => {
    return profiles.filter(p => p.position_info?.role === 'director');
  };

  const getClinicianDirector = (clinicianId: string): Profile | null => {
    // Find the assignment for this clinician
    const assignment = assignments.find(a => a.clinician === clinicianId);
    if (!assignment) return null;
    
    // Find the director profile
    const director = profiles.find(p => p.id === assignment.director);
    return director || null;
  };

  const getDirectorSupervisor = (directorId: string): Profile | null => {
    // Find the assignment for this director (where the director is the "clinician" being assigned)
    const assignment = assignments.find(a => a.clinician === directorId);
    if (!assignment) return null;
    
    // Find the supervisor director profile
    const supervisor = profiles.find(p => p.id === assignment.director);
    return supervisor || null;
  };

  const refreshProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedProfiles = await ProfileService.getAllProfiles();
      setProfiles(fetchedProfiles);
      console.log('Successfully fetched profiles:', fetchedProfiles.length);
    } catch (err) {
      console.error('Error fetching profiles, using mock data:', err);
      // Always fallback to mock data to ensure app functionality
      setProfiles(mockProfiles);
      // Don't set error state to prevent dashboard crash
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAssignments = await AssignmentService.getAllAssignments();
      setAssignments(fetchedAssignments);
      console.log('Successfully fetched assignments:', fetchedAssignments.length);
    } catch (err) {
      console.error('Error fetching assignments, using mock data:', err);
      // Always fallback to mock data to ensure app functionality
      setAssignments(mockAssignments);
      // Don't set error state to prevent dashboard crash
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshReviewItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedReviewItems = await ReviewService.getAllReviewsWithKPIs();
      setReviewItems(fetchedReviewItems);
      console.log('Successfully fetched review items:', fetchedReviewItems.length);
    } catch (err) {
      console.error('Error fetching review items, using mock data:', err);
      // Always fallback to mock data to ensure app functionality
      setReviewItems(mockReviewItems);
      // Don't set error state to prevent dashboard crash
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataContext.Provider value={{
      kpis,
      removedKPIs,
      clinicians,
      reviews,
      reviewItems,
      assignments,
      profiles,
      loading,
      error,
      updateKPI,
      addKPI,
      deleteKPI,
      restoreKPI,
      permanentlyDeleteKPI,
      refreshKPIs,
      refreshRemovedKPIs,
      updateClinician,
      addClinician,
      deleteClinician,
      submitReview,
      getClinicianReviews,
      getClinicianScore,
      assignClinician,
      unassignClinician,
      assignDirector,
      unassignDirector,
      getAssignedClinicians,
      getAssignedDirectors,
      getUnassignedClinicians,
      getUnassignedDirectors,
      getDirectors,
      getClinicianDirector,
      getDirectorSupervisor,
      refreshProfiles,
      refreshAssignments,
      refreshReviewItems,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};