import React, { createContext, useContext, useState } from 'react';

interface KPI {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
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

interface DataContextType {
  kpis: KPI[];
  clinicians: Clinician[];
  reviews: ReviewEntry[];
  updateKPI: (kpi: KPI) => void;
  addKPI: (kpi: Omit<KPI, 'id'>) => void;
  deleteKPI: (id: string) => void;
  updateClinician: (clinician: Clinician) => void;
  addClinician: (clinician: Omit<Clinician, 'id'>) => void;
  deleteClinician: (id: string) => void;
  submitReview: (review: Omit<ReviewEntry, 'id'>) => void;
  getClinicianReviews: (clinicianId: string) => ReviewEntry[];
  getClinicianScore: (clinicianId: string, month: string, year: number) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Enhanced mock data with more realistic examples
const mockKPIs: KPI[] = [
  {
    id: '1',
    name: 'Patient Satisfaction Score',
    description: 'Maintain patient satisfaction above 4.5/5 based on post-visit surveys',
    weight: 9,
    category: 'Patient Care',
  },
  {
    id: '2',
    name: 'Documentation Compliance',
    description: 'Complete all required documentation within 24 hours of patient encounter',
    weight: 8,
    category: 'Administration',
  },
  {
    id: '3',
    name: 'Continuing Education',
    description: 'Complete required CE hours and attend mandatory training sessions',
    weight: 6,
    category: 'Professional Development',
  },
  {
    id: '4',
    name: 'Team Collaboration',
    description: 'Effective collaboration with multidisciplinary team and peer feedback',
    weight: 7,
    category: 'Teamwork',
  },
  {
    id: '5',
    name: 'Clinical Outcomes',
    description: 'Achieve target clinical outcomes for assigned patient population',
    weight: 10,
    category: 'Patient Care',
  },
  {
    id: '6',
    name: 'Safety Protocols',
    description: 'Adherence to safety protocols and incident-free performance',
    weight: 9,
    category: 'Patient Safety',
  },
  {
    id: '7',
    name: 'Quality Improvement',
    description: 'Participation in quality improvement initiatives and process optimization',
    weight: 5,
    category: 'Quality Improvement',
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [kpis, setKPIs] = useState<KPI[]>(mockKPIs);
  const [clinicians, setClinicians] = useState<Clinician[]>(mockClinicians);
  const [reviews, setReviews] = useState<ReviewEntry[]>(mockReviews);

  const updateKPI = (kpi: KPI) => {
    setKPIs(prev => prev.map(k => k.id === kpi.id ? kpi : k));
  };

  const addKPI = (kpi: Omit<KPI, 'id'>) => {
    const newKPI = { ...kpi, id: Date.now().toString() };
    setKPIs(prev => [...prev, newKPI]);
  };

  const deleteKPI = (id: string) => {
    setKPIs(prev => prev.filter(k => k.id !== id));
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
    return reviews.filter(r => r.clinicianId === clinicianId);
  };

  const getClinicianScore = (clinicianId: string, month: string, year: number) => {
    const clinicianReviews = reviews.filter(
      r => r.clinicianId === clinicianId && r.month === month && r.year === year
    );
    
    if (clinicianReviews.length === 0) return 0;
    
    let totalWeight = 0;
    let earnedWeight = 0;
    
    clinicianReviews.forEach(review => {
      const kpi = kpis.find(k => k.id === review.kpiId);
      if (kpi) {
        totalWeight += kpi.weight;
        if (review.met) {
          earnedWeight += kpi.weight;
        }
      }
    });
    
    return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  };

  return (
    <DataContext.Provider value={{
      kpis,
      clinicians,
      reviews,
      updateKPI,
      addKPI,
      deleteKPI,
      updateClinician,
      addClinician,
      deleteClinician,
      submitReview,
      getClinicianReviews,
      getClinicianScore,
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