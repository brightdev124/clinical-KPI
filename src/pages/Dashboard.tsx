import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import { useNameFormatter } from '../utils/nameFormatter';
import { 
  Users, 
  Target, 
  TrendingUp, 
  AlertCircle,
  ChevronRight,
  Calendar,
  Award,
  Clock,
  BarChart3,
  Activity,
  ArrowUp,
  ArrowDown,
  FileText,
  CheckCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ExternalLink,
  Crown,
  UserPlus,
  User,
  Navigation,
  Brain,
  Loader2
} from 'lucide-react';
import { generateMonthlyDataPDF, generatePerformancePDF, generateAIAnalysisPDF } from '../utils/pdfGenerator';
import { aiAnalysisService, ClinicianAnalysisData } from '../services/aiAnalysisService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import AdminAnalytics from '../components/AdminAnalytics';
import { MonthYearPicker, WeekPicker } from '../components/UI';
import { ReviewService } from '../services/reviewService';



const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    clinicians, 
    kpis, 
    getClinicianScore, 
    getClinicianReviews, 
    profiles, 
    getAssignedClinicians, 
    getAssignedDirectors,
    getClinicianDirector, 
    getDirectorSupervisor,
    reviewItems, 
    loading, 
    error 
  } = useData();
  const formatName = useNameFormatter();

  // View toggle state
  const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');
  
  // Team data view toggle state
  const [teamDataViewType, setTeamDataViewType] = useState<'monthly' | 'weekly'>('monthly');
  
  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // Weekly selector state
  const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + (jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day));
    const diffTime = now.getTime() - firstMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return { year, week: Math.max(1, week) };
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  
  // State for current score (needed for async weekly score calculation)
  const [currentScore, setCurrentScore] = useState(0);
  
  // State for chart data (needed for async weekly data)
  const [chartData, setChartData] = useState<any[]>([]);
  
  // State for AI analysis loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State for expanded KPIs in clinician dashboard
  const [expandedKPIs, setExpandedKPIs] = useState<Set<string>>(new Set());
  
  // State for showing all performers
  const [showAllTopPerformers, setShowAllTopPerformers] = useState(false);
  const [showAllNeedingAttention, setShowAllNeedingAttention] = useState(false);
  
  // State for weekly team data calculations
  const [weeklyTeamAvgScore, setWeeklyTeamAvgScore] = useState(0);
  const [weeklyTopPerformers, setWeeklyTopPerformers] = useState<any[]>([]);
  const [weeklyNeedingAttention, setWeeklyNeedingAttention] = useState<any[]>([]);
  
  // State for weekly KPI details for individual clinicians
  const [weeklyKPIDetails, setWeeklyKPIDetails] = useState<any[]>([]);
  
  // State for weekly team chart data
  const [weeklyTeamChartData, setWeeklyTeamChartData] = useState<any[]>([]);
  
  // State for individual weekly scores lookup
  const [weeklyScoresLookup, setWeeklyScoresLookup] = useState<Map<string, number>>(new Map());

  // State for weekly KPI scores lookup for top performers
  const [weeklyKPIScoresLookup, setWeeklyKPIScoresLookup] = useState<Map<string, any[]>>(new Map());
  




  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  // Helper function to get week date range
  const getWeekDateRange = (year: number, week: number) => {
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + (jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day));
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  };

  // Helper function to get month from week
  const getMonthFromWeek = (year: number, week: number) => {
    const { start } = getWeekDateRange(year, week);
    return {
      month: start.toLocaleString('default', { month: 'long' }),
      year: start.getFullYear()
    };
  };

  // Handler for team data week selection
  const handleTeamWeekSelect = (week: { year: number; week: number }) => {
    setSelectedWeek(week);
    // Update month/year based on the selected week
    const monthData = getMonthFromWeek(week.year, week.week);
    setSelectedMonth(monthData.month);
    setSelectedYear(monthData.year);
  };

  // Weekly score calculation for individuals
  const getWeeklyScore = async (clinicianId: string, year: number, week: number): Promise<number> => {
    try {
      const { start, end } = getWeekDateRange(year, week);
      const reviews = await ReviewService.getReviewsByDateRange(clinicianId, start, end);
      
      if (reviews.length === 0) return 0;
      
      let totalWeight = 0;
      let earnedWeight = 0;
      
      reviews.forEach(review => {
        const kpi = kpis.find(k => k.id === review.kpi);
        if (kpi) {
          totalWeight += kpi.weight;
          if (review.met_check) {
            earnedWeight += kpi.weight;
          }
        }
      });
      
      return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    } catch (error) {
      console.error('Error calculating weekly score:', error);
      return 0;
    }
  };

  // Get individual KPI scores for a member for a specific week (returns only KPIs with scores >= 90%)
  const getWeeklyKPIScores = async (memberId: string, year: number, week: number): Promise<any[]> => {
    try {
      const { start, end } = getWeekDateRange(year, week);
      console.log(`Getting KPI scores for member ${memberId} for week ${week} ${year} (${start.toISOString()} to ${end.toISOString()})`);
      
      const reviews = await ReviewService.getReviewsByDateRange(memberId, start, end);
      console.log(`Found ${reviews.length} reviews for member ${memberId}`);
      
      if (reviews.length === 0) return [];
      
      const kpiScores: any[] = [];
      
      // Process each review and calculate individual KPI scores
      reviews.forEach(review => {
        const kpi = kpis.find(k => k.id === review.kpi);
        if (kpi) {
          const kpiScore = review.met_check ? 100 : 0; // KPI is either met (100%) or not met (0%)
          console.log(`KPI ${kpi.title}: met=${review.met_check}, score=${kpiScore}`);
          
          // Only include KPIs with scores >= 90% (which means only met KPIs in this case)
          if (kpiScore >= 90) {
            kpiScores.push({
              kpiId: kpi.id,
              kpiTitle: kpi.title,
              kpiWeight: kpi.weight,
              score: kpiScore,
              met: review.met_check
            });
          }
        }
      });
      
      console.log(`Returning ${kpiScores.length} KPI scores >= 90% for member ${memberId}`);
      return kpiScores;
    } catch (error) {
      console.error('Error getting weekly KPI scores:', error);
      return [];
    }
  };

  // Weekly score calculation for directors (team average)
  const getDirectorWeeklyScore = async (directorId: string, year: number, week: number, visited: Set<string> = new Set()): Promise<number> => {
    // Prevent infinite recursion
    if (visited.has(directorId)) {
      return 0;
    }
    
    const newVisited = new Set(visited);
    newVisited.add(directorId);
    
    try {
      const assignedClinicians = getAssignedClinicians(directorId);
      const assignedDirectors = getAssignedDirectors(directorId);
      const allAssignedMembers = [...assignedClinicians, ...assignedDirectors];
      
      const directorProfile = profiles.find(p => p.id === directorId);
      console.log(`Weekly calculation for Director ${directorProfile?.name} (Week ${week}, ${year}):`, {
        assignedClinicians: assignedClinicians.map(c => ({ id: c.id, name: c.name })),
        assignedDirectors: assignedDirectors.map(d => ({ id: d.id, name: d.name })),
        totalAssigned: allAssignedMembers.length
      });
      
      if (allAssignedMembers.length === 0) {
        console.log(`Director ${directorProfile?.name} has no assigned members for weekly calculation`);
        return 0;
      }
      
      const scores = await Promise.all(allAssignedMembers.map(async (member) => {
        let score;
        if (member.position_info?.role === 'director') {
          // For sub-directors, use their individual performance, not their team average
          // This prevents recursion issues and gives a more accurate representation
          score = await getWeeklyScore(member.id, year, week);
        } else {
          score = await getWeeklyScore(member.id, year, week);
        }
        console.log(`  Weekly score for ${member.name} (${member.position_info?.role}): ${score}%`);
        return score;
      }));
      
      // Include all scores, even 0s, for a true average
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = allAssignedMembers.length > 0 ? Math.round(totalScore / allAssignedMembers.length) : 0;
      
      console.log(`Director ${directorProfile?.name} weekly team average: ${averageScore}% (from ${scores.join(', ')})`);
      
      return averageScore;
    } catch (error) {
      console.error('Error calculating director weekly score:', error);
      return 0;
    }
  };

  // Memoized weekly score data generation
  const generateWeeklyScoreData = useCallback(async (userId: string, endYear?: number, endWeek?: number) => {
    const weeklyData = [];
    
    // Use selected week/year or default to current date
    const targetYear = endYear || selectedWeek.year;
    const targetWeek = endWeek || selectedWeek.week;
    
    // Determine if this user is a director
    const userProfile = profiles.find(p => p.id === userId);
    const isDirector = userProfile?.position_info?.role === 'director';
    
    // Get 12 weeks of data ending at the selected week
    for (let i = 11; i >= 0; i--) {
      const weekNum = targetWeek - i;
      let year = targetYear;
      
      // Handle week overflow/underflow
      if (weekNum <= 0) {
        year = targetYear - 1;
        // Get weeks in previous year and adjust
        const weeksInPrevYear = 52; // Simplified - could be 53 in some years
        const adjustedWeek = weeksInPrevYear + weekNum;
        const score = isDirector 
          ? await getDirectorWeeklyScore(userId, year, adjustedWeek)
          : await getWeeklyScore(userId, year, adjustedWeek);
        weeklyData.push({
          week: adjustedWeek,
          year: year,
          score: score,
          displayName: `W${adjustedWeek} ${year.toString().slice(-2)}`
        });
      } else {
        const score = isDirector
          ? await getDirectorWeeklyScore(userId, year, weekNum)
          : await getWeeklyScore(userId, year, weekNum);
        weeklyData.push({
          week: weekNum,
          year: year,
          score: score,
          displayName: `W${weekNum} ${year.toString().slice(-2)}`
        });
      }
    }
    
    return weeklyData;
  }, [selectedWeek, kpis, profiles]);

  // Memoized monthly score data generation to avoid expensive recalculations
  const generateMonthlyScoreData = useCallback((clinicianId: string, endMonth?: string, endYear?: number) => {
    const monthlyData = [];
    
    // Use selected month/year or default to current date
    const targetMonth = endMonth || new Date().toLocaleString('default', { month: 'long' });
    const targetYear = endYear || new Date().getFullYear();
    
    // Convert month name to month index
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetMonthIndex = months.indexOf(targetMonth);
    
    // Create end date from target month/year
    const endDate = new Date(targetYear, targetMonthIndex, 1);
    
    // Get 12 months of data ending at the selected month
    for (let i = 11; i >= 0; i--) {
      const date = new Date(endDate);
      date.setMonth(endDate.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      const score = getClinicianScore(clinicianId, month, year);
      
      monthlyData.push({
        month: date.toLocaleString('default', { month: 'short' }),
        fullMonth: month,
        year: year,
        score: score,
        displayName: `${date.toLocaleString('default', { month: 'short' })} ${year.toString().slice(-2)}`
      });
    }
    
    return monthlyData;
  }, [getClinicianScore]);

  // Reset "Show All" states when month/year changes
  useEffect(() => {
    setShowAllTopPerformers(false);
    setShowAllNeedingAttention(false);
  }, [selectedMonth, selectedYear]);

  // Clear weekly KPI scores when switching away from weekly view
  useEffect(() => {
    if (teamDataViewType !== 'weekly') {
      setWeeklyKPIScoresLookup(new Map());
    }
  }, [teamDataViewType]);

  // Calculate current score and chart data based on view type
  useEffect(() => {
    const calculateData = async () => {
      if (!user?.id) return;
      
      let score = 0;
      let data: any[] = [];
      
      if (viewType === 'monthly') {
        score = user.role === 'director' 
          ? getDirectorAverageScore(user.id, selectedMonth, selectedYear)
          : getClinicianScore(user.id, selectedMonth, selectedYear);
        data = generateMonthlyScoreData(user.id, selectedMonth, selectedYear);
      } else {
        score = user.role === 'director'
          ? await getDirectorWeeklyScore(user.id, selectedWeek.year, selectedWeek.week)
          : await getWeeklyScore(user.id, selectedWeek.year, selectedWeek.week);
        data = await generateWeeklyScoreData(user.id, selectedWeek.year, selectedWeek.week);
      }
      
      setCurrentScore(score);
      setChartData(data);
    };
    
    calculateData();
  }, [viewType, selectedMonth, selectedYear, selectedWeek, user?.id, kpis, generateMonthlyScoreData, generateWeeklyScoreData]);





  // Helper function to calculate director's average score with recursion protection
  const getDirectorAverageScoreInternal = (directorId: string, month: string, year: number, visited: Set<string>): number => {
    // Prevent infinite recursion by checking if we've already visited this director
    if (visited.has(directorId)) {
      return 0; // Return 0 to avoid circular references
    }
    
    // Add current director to visited set
    const newVisited = new Set(visited);
    newVisited.add(directorId);
    
    const assignedClinicians = getAssignedClinicians(directorId);
    const assignedDirectors = getAssignedDirectors(directorId);
    const allAssignedMembers = [...assignedClinicians, ...assignedDirectors];
    
    const directorProfile = profiles.find(p => p.id === directorId);
    console.log(`Director ${directorProfile?.name} (${directorId}) team calculation:`, {
      assignedClinicians: assignedClinicians.map(c => ({ id: c.id, name: c.name })),
      assignedDirectors: assignedDirectors.map(d => ({ id: d.id, name: d.name })),
      totalAssigned: allAssignedMembers.length,
      month,
      year
    });
    
    if (allAssignedMembers.length === 0) {
      console.log(`Director ${directorProfile?.name} has no assigned members`);
      return 0; // No assigned members
    }
    
    const scores = allAssignedMembers.map(member => {
      let score;
      // For sub-directors, use their individual performance, not their team average
      // This prevents recursion issues and gives a more accurate representation
      if (member.position_info?.role === 'director') {
        score = getClinicianScore(member.id, month, year);
      } else {
        score = getClinicianScore(member.id, month, year);
      }
      console.log(`  Member ${member.name} (${member.position_info?.role}): ${score}%`);
      return score;
    });
    
    // Include all scores, even 0s, for a true average
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = allAssignedMembers.length > 0 ? Math.round(totalScore / allAssignedMembers.length) : 0;
    
    console.log(`Director ${directorProfile?.name} team average: ${averageScore}% (from ${scores.join(', ')})`);
    
    return averageScore;
  };

  // Calculate director's average score based on assigned members
  const getDirectorAverageScore = (directorId: string, month: string, year: number): number => {
    return getDirectorAverageScoreInternal(directorId, month, year, new Set());
  };

  // Helper function to calculate director's weekly average score with recursion protection
  const getDirectorWeeklyAverageScoreInternal = (directorId: string, year: number, week: number, visited: Set<string>): number => {
    // Prevent infinite recursion by checking if we've already visited this director
    if (visited.has(directorId)) {
      return 0; // Return 0 to avoid circular references
    }
    
    // Add current director to visited set
    const newVisited = new Set(visited);
    newVisited.add(directorId);
    
    const assignedClinicians = getAssignedClinicians(directorId);
    const assignedDirectors = getAssignedDirectors(directorId);
    const allAssignedMembers = [...assignedClinicians, ...assignedDirectors];
    
    if (allAssignedMembers.length === 0) {
      return 0; // No assigned members
    }
    
    // For weekly scores, we need to use cached/pre-calculated values since we can't make async calls here
    // This will be populated by the useEffect that calculates weekly scores
    const scores = allAssignedMembers.map(member => {
      if (member.position_info?.role === 'director') {
        return getDirectorWeeklyAverageScoreInternal(member.id, year, week, newVisited);
      } else {
        // Look up the pre-calculated weekly score from weeklyScoresLookup
        return weeklyScoresLookup.get(member.id) || 0;
      }
    });
    
    const validScores = scores.filter(score => score > 0);
    if (validScores.length === 0) {
      return 0;
    }
    
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  };

  // Calculate director's weekly average score based on assigned members
  const getDirectorWeeklyAverageScore = (directorId: string, year: number, week: number): number => {
    return getDirectorWeeklyAverageScoreInternal(directorId, year, week, new Set());
  };

  // Filter staff based on user role - include both clinicians and directors for directors
  const userClinicians = useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'super-admin') {
      return profiles.filter(p => p.accept && (p.position_info?.role === 'clinician' || p.position_info?.role === 'director'));
    } else if (user.role === 'director') {
      return [...getAssignedClinicians(user.id).filter(p => p.accept), ...getAssignedDirectors(user.id).filter(p => p.accept)];
    } else {
      return profiles.filter(p => p.id === user.id && p.accept && p.position_info?.role === 'clinician');
    }
  }, [user, profiles, getAssignedClinicians, getAssignedDirectors]);

  // Separate directors and clinicians for admin dashboard - only approved users
  const userDirectors = useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'super-admin') {
      return profiles.filter(p => p.accept && p.position_info?.role === 'director');
    } else if (user.role === 'director') {
      return profiles.filter(p => p.id === user.id && p.accept && p.position_info?.role === 'director');
    } else {
      return [];
    }
  }, [user, profiles]);

  const userCliniciansOnly = useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'super-admin') {
      return profiles.filter(p => p.accept && p.position_info?.role === 'clinician');
    } else if (user.role === 'director') {
      return getAssignedClinicians(user.id).filter(p => p.accept && p.position_info?.role === 'clinician');
    } else {
      return profiles.filter(p => p.id === user.id && p.accept && p.position_info?.role === 'clinician');
    }
  }, [user, profiles, getAssignedClinicians]);

  // Combined assigned staff for directors (both clinicians and directors)
  const userAssignedDirectors = useMemo(() => {
    if (!user || user.role !== 'director') return [];
    return getAssignedDirectors(user.id).filter(p => p.accept);
  }, [user, getAssignedDirectors]);

  // Calculate stats for selected month
  const totalTeamMembers = useMemo(() => userClinicians.length, [userClinicians]);
  const totalKPIs = useMemo(() => kpis.length, [kpis]);

  // Calculate weekly team data when teamDataViewType is weekly
  useEffect(() => {
    const calculateWeeklyTeamData = async () => {
      // Use appropriate data source based on user role
      const targetUsers = user?.role === 'super-admin' ? userDirectors : userClinicians;
      console.log(`Weekly team calculation - User role: ${user?.role}, Target users count: ${targetUsers.length}`, targetUsers.map(u => ({ name: u.name, role: u.position_info?.role })));
      
      if (teamDataViewType !== 'weekly' || targetUsers.length === 0) return;
      
      try {
        // Calculate scores for all team members
        const scoresWithMembers = await Promise.all(targetUsers.map(async (member) => {
          let score;
          if (user?.role === 'super-admin' && member.position_info?.role === 'director') {
            // For Super Admin viewing directors: show team average score
            score = await getDirectorWeeklyScore(member.id, selectedWeek.year, selectedWeek.week);
            console.log(`Weekly team calculation result for Director ${member.name}: ${score}%`);
          } else {
            // For others: show individual performance
            score = await getWeeklyScore(member.id, selectedWeek.year, selectedWeek.week);
            console.log(`Weekly team calculation result for ${member.name} (${member.position_info?.role}): ${score}%`);
          }
          return { member, score };
        }));
        
        console.log(`All weekly scores:`, scoresWithMembers.map(s => ({ name: s.member.name, score: s.score })));
        
        // Calculate average score (include all scores, even 0s)
        const avgScore = scoresWithMembers.length > 0 
          ? Math.round(scoresWithMembers.reduce((sum, item) => sum + item.score, 0) / scoresWithMembers.length)
          : 0;
        
        console.log(`Weekly team average calculated: ${avgScore}% (from ${scoresWithMembers.map(s => s.score).join(', ')})`);
        
        // Find top performers (score >= 90)
        const topPerformers = scoresWithMembers
          .filter(item => item.score >= 90)
          .map(item => item.member);
        
        // Find those needing attention (score < 70, including those with 0 scores)
        const needingAttention = scoresWithMembers
          .filter(item => item.score < 70)
          .map(item => item.member);
        
        setWeeklyTeamAvgScore(avgScore);
        
        // For Super Admin: Calculate Top Performers and KPI Review based on clinicians (not directors)
        // This ensures consistency with monthly view for these specific sections
        let clinicianScoresWithMembers = [];
        let clinicianTopPerformers = [];
        
        if (user?.role === 'super-admin') {
          // Calculate scores for individual clinicians for Top Performers and KPI Review sections
          clinicianScoresWithMembers = await Promise.all(userCliniciansOnly.map(async (clinician) => {
            const score = await getWeeklyScore(clinician.id, selectedWeek.year, selectedWeek.week);
            return { member: clinician, score };
          }));
          
          // Find top performing clinicians (score >= 90)
          clinicianTopPerformers = clinicianScoresWithMembers
            .filter(item => item.score >= 90)
            .map(item => item.member);
          
          // Find clinicians needing attention (score < 70)
          const cliniciansNeedingAttention = clinicianScoresWithMembers
            .filter(item => item.score < 70)
            .map(item => item.member);
          
          setWeeklyTopPerformers(clinicianTopPerformers);
          setWeeklyNeedingAttention(cliniciansNeedingAttention);
        } else {
          // For Directors and Clinicians: use team-based calculations
          setWeeklyTopPerformers(topPerformers);
          setWeeklyNeedingAttention(needingAttention);
        }
        
        // Generate chart data for weekly view
        const chartData = scoresWithMembers.map(({ member, score }) => ({
          name: formatName(member.name),
          fullName: formatName(member.name),
          score: score,
          position: member.position_info?.position_title || (member.position_info?.role === 'director' ? 'Director' : 'Clinician'),
          role: member.position_info?.role || 'clinician',
          isDirector: member.position_info?.role === 'director'
        }));
        
        setWeeklyTeamChartData(chartData);
        
        // Create lookup map for individual scores
        const scoresMap = new Map();
        scoresWithMembers.forEach(({ member, score }) => {
          scoresMap.set(member.id, score);
        });
        
        // For Super Admin: Also add clinician scores to lookup for Top Performers sections
        if (user?.role === 'super-admin' && clinicianScoresWithMembers.length > 0) {
          clinicianScoresWithMembers.forEach(({ member, score }) => {
            scoresMap.set(member.id, score);
          });
        }
        
        setWeeklyScoresLookup(scoresMap);
        
        // For SuperAdmin role, get individual KPI scores for top performing clinicians
        if (user?.role === 'super-admin' && clinicianTopPerformers.length > 0) {
          console.log('Calculating KPI scores for SuperAdmin weekly view');
          console.log('Top performing clinicians:', clinicianTopPerformers.map(p => ({ name: p.name, role: p.position_info?.role })));
          
          const kpiScoresMap = new Map();
          
          // Calculate individual KPI scores for top performing clinicians
          await Promise.all(clinicianTopPerformers.map(async (member) => {
            console.log(`Getting KPI scores for ${member.name} (${member.position_info?.role})`);
            
            // Get individual KPI scores for clinicians
            const kpiScores = await getWeeklyKPIScores(member.id, selectedWeek.year, selectedWeek.week);
            
            console.log(`KPI scores for ${member.name}:`, kpiScores);
            kpiScoresMap.set(member.id, kpiScores);
          }));
          
          console.log('Final KPI scores map:', Array.from(kpiScoresMap.entries()));
          setWeeklyKPIScoresLookup(kpiScoresMap);
        }

        
      } catch (error) {
        console.error('Error calculating weekly team data:', error);
        setWeeklyTeamAvgScore(0);
        setWeeklyTopPerformers([]);
        setWeeklyNeedingAttention([]);
        setWeeklyTeamChartData([]);
        setWeeklyScoresLookup(new Map());
        setWeeklyKPIScoresLookup(new Map());
      }
    };
    
    calculateWeeklyTeamData();
  }, [teamDataViewType, selectedWeek, userClinicians, userDirectors, userCliniciansOnly, user?.role]);
  
  // Memoized calculations that depend on selectedMonth/selectedYear or selectedWeek
  const avgScore = useMemo(() => {
    // For weekly view, use the pre-calculated weekly team average score
    if (teamDataViewType === 'weekly') {
      return weeklyTeamAvgScore;
    }
    
    // For monthly view, calculate based on user role
    if (user?.role === 'super-admin') {
      // For super-admin: calculate average of team scores (directors' team averages)
      if (userDirectors.length === 0) return 0;
      const totalScore = userDirectors.reduce((acc, director) => {
        const teamAvgScore = getDirectorAverageScore(director.id, selectedMonth, selectedYear);
        return acc + teamAvgScore;
      }, 0);
      return Math.round(totalScore / userDirectors.length);
    } else {
      // For directors and clinicians: use individual scores for all assigned users
      if (userClinicians.length === 0) return 0;
      const totalScore = userClinicians.reduce((acc, c) => {
        const score = getClinicianScore(c.id, selectedMonth, selectedYear);
        return acc + score;
      }, 0);
      return Math.round(totalScore / userClinicians.length);
    }
  }, [user?.role, userDirectors, userClinicians, selectedMonth, selectedYear, teamDataViewType, weeklyTeamAvgScore, getClinicianScore, getDirectorAverageScore]);

  // Memoized staff needing attention (score < 70)
  const cliniciansNeedingAttention = useMemo(() => {
    // For weekly view, use the pre-calculated weekly needing attention list
    if (teamDataViewType === 'weekly') {
      return weeklyNeedingAttention;
    }
    
    // For monthly view, use individual scores for all users
    const targetClinicians = user?.role === 'super-admin' ? userCliniciansOnly : userClinicians;
    return targetClinicians.filter(c => {
      const score = getClinicianScore(c.id, selectedMonth, selectedYear);
      return score < 70;
    });
  }, [user?.role, userCliniciansOnly, userClinicians, selectedMonth, selectedYear, teamDataViewType, weeklyNeedingAttention, getClinicianScore]);

  // Memoized top performers (score >= 90)
  const topPerformers = useMemo(() => {
    // For weekly view, use the pre-calculated weekly top performers list
    if (teamDataViewType === 'weekly') {
      return weeklyTopPerformers;
    }
    
    // For monthly view, use individual scores for all users
    const targetClinicians = user?.role === 'super-admin' ? userCliniciansOnly : userClinicians;
    return targetClinicians.filter(c => {
      const score = getClinicianScore(c.id, selectedMonth, selectedYear);
      return score >= 90;
    });
  }, [user?.role, userCliniciansOnly, userClinicians, selectedMonth, selectedYear, teamDataViewType, weeklyTopPerformers, getClinicianScore]);

  // Helper function to filter reviews based on user role and assigned clinicians
  const filterReviewsByUserRole = (reviews: any[]) => {
    return reviews.filter(review => {
      // First, ensure the clinician is approved (accept = true)
      const clinician = profiles.find(p => p.id === review.clinician);
      if (!clinician || !clinician.accept) {
        return false;
      }

      if (user?.role === 'super-admin') {
        // Super-admin can see all reviews from approved clinicians only
        return true;
      } else if (user?.role === 'director') {
        // Directors can only see reviews for their assigned approved clinicians
        const assignedClinicianIds = userClinicians.map(c => c.id);
        return assignedClinicianIds.includes(review.clinician);
      } else {
        // Clinicians can only see their own reviews (and they must be approved)
        return review.clinician === user?.id;
      }
    });
  };

  // Helper function to filter reviews by current view type (monthly or weekly)
  const filterReviewsByViewType = (reviews: any[]) => {
    return reviews.filter(review => {
      const reviewDate = new Date(review.date);
      
      if (teamDataViewType === 'weekly') {
        // For weekly view, check if review date falls within selected week
        const { start, end } = getWeekDateRange(selectedWeek.year, selectedWeek.week);
        return reviewDate >= start && reviewDate <= end;
      } else {
        // For monthly view, check month and year
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return reviewMonth === selectedMonth && reviewYear === selectedYear;
      }
    });
  };

  // Memoized team performance trend data generation
  const generateTeamTrendData = useCallback((endMonth: string, endYear: number) => {
    const trendData = [];
    
    // Convert month name to month index
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const targetMonthIndex = months.indexOf(endMonth);
    
    // Create end date from target month/year
    const endDate = new Date(endYear, targetMonthIndex, 1);
    
    // Get 6 months of data ending at the selected month
    for (let i = 5; i >= 0; i--) {
      const date = new Date(endDate);
      date.setMonth(endDate.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      
      // Use appropriate data source and scoring method based on user role
      const targetUsers = user?.role === 'super-admin' ? userDirectors : userClinicians;
      const monthlyScores = targetUsers.map(c => {
        if (user?.role === 'super-admin' && c.position_info?.role === 'director') {
          return getDirectorAverageScore(c.id, month, year);
        } else {
          return getClinicianScore(c.id, month, year);
        }
      });
      console.log(`Trend data for ${month} ${year}:`, {
        userRole: user?.role,
        targetUsers: targetUsers.length,
        monthlyScores,
        avgScore: monthlyScores.length > 0 
          ? Math.round(monthlyScores.reduce((sum, score) => sum + score, 0) / monthlyScores.length)
          : 0
      });
      const avgScore = monthlyScores.length > 0 
        ? Math.round(monthlyScores.reduce((sum, score) => sum + score, 0) / monthlyScores.length)
        : 0;
      
      trendData.push({
        month: date.toLocaleString('default', { month: 'short' }),
        fullMonth: month,
        year: year,
        avgScore: avgScore,
        displayName: `${date.toLocaleString('default', { month: 'short' })} ${year.toString().slice(-2)}`
      });
    }
    
    return trendData;
  }, [user?.role, userDirectors, userClinicians, getClinicianScore, getDirectorAverageScore]);

  // State for weekly trend data
  const [weeklyTrendData, setWeeklyTrendData] = useState<any[]>([]);
  
  // Calculate actual weekly trend data for all 6 weeks
  useEffect(() => {
    const calculateWeeklyTrendData = async () => {
      if (teamDataViewType !== 'weekly') {
        setWeeklyTrendData([]);
        return;
      }
      
      // Use appropriate data source based on user role
      const targetUsers = user?.role === 'super-admin' ? userDirectors : userClinicians;
      if (targetUsers.length === 0) {
        setWeeklyTrendData([]);
        return;
      }
      
      console.log('Calculating weekly trend data for 6 weeks...');
      
      // Create trend data for 6 weeks with actual calculations
      const trendData = [];
      for (let i = 5; i >= 0; i--) {
        const targetYear = selectedWeek.year;
        const targetWeek = selectedWeek.week - i;
        
        // Handle week overflow/underflow
        let adjustedYear = targetYear;
        let adjustedWeek = targetWeek;
        
        if (adjustedWeek <= 0) {
          adjustedYear = targetYear - 1;
          adjustedWeek = 52 + targetWeek;
        } else if (adjustedWeek > 52) {
          adjustedYear = targetYear + 1;
          adjustedWeek = targetWeek - 52;
        }
        
        // Calculate actual average score for this specific week
        let avgScore = 0;
        if (adjustedYear === selectedWeek.year && adjustedWeek === selectedWeek.week) {
          // Current week: use the pre-calculated weekly team average
          avgScore = weeklyTeamAvgScore;
          console.log(`Week ${adjustedWeek} (current): ${avgScore}%`);
        } else {
          // Historical weeks: calculate actual weekly scores using async calls
          console.log(`Calculating historical scores for Week ${adjustedWeek}, ${adjustedYear}...`);
          
          try {
            const weeklyScorePromises = targetUsers.map(async (member) => {
              if (user?.role === 'super-admin' && member.position_info?.role === 'director') {
                // For Super Admin viewing directors: get their team's weekly average
                return await getDirectorWeeklyScore(member.id, adjustedYear, adjustedWeek);
              } else {
                // For others: get individual weekly performance
                return await getWeeklyScore(member.id, adjustedYear, adjustedWeek);
              }
            });
            
            const weeklyScores = await Promise.all(weeklyScorePromises);
            console.log(`Week ${adjustedWeek} individual scores:`, weeklyScores);
            
            avgScore = weeklyScores.length > 0 
              ? Math.round(weeklyScores.reduce((sum, score) => sum + score, 0) / weeklyScores.length)
              : 0;
              
            console.log(`Week ${adjustedWeek} average: ${avgScore}%`);
          } catch (error) {
            console.error(`Error calculating scores for Week ${adjustedWeek}:`, error);
            avgScore = 0;
          }
        }
        
        trendData.push({
          week: adjustedWeek,
          year: adjustedYear,
          avgScore: avgScore,
          displayName: `W${adjustedWeek} ${adjustedYear.toString().slice(-2)}`
        });
      }
      
      console.log('Final weekly trend data:', trendData);
      setWeeklyTrendData(trendData);
    };
    
    // Only calculate if we have the required data
    if (teamDataViewType === 'weekly' && weeklyTeamAvgScore !== undefined) {
      calculateWeeklyTrendData();
    }
  }, [teamDataViewType, selectedWeek, userClinicians, userDirectors, user?.role, weeklyTeamAvgScore]);

  // Calculate trend analysis
  const calculateTrend = (data: any[]) => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };
    
    const lastMonth = data[data.length - 1].score;
    const previousMonth = data[data.length - 2].score;
    const difference = lastMonth - previousMonth;
    
    if (Math.abs(difference) < 2) return { direction: 'stable', percentage: 0 };
    
    return {
      direction: difference > 0 ? 'up' : 'down',
      percentage: Math.abs(difference)
    };
  };



  // Toggle expanded state for KPIs in clinician dashboard
  const toggleKPIExpanded = (kpiId: string) => {
    setExpandedKPIs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kpiId)) {
        newSet.delete(kpiId);
      } else {
        newSet.add(kpiId);
      }
      return newSet;
    });
  };

  // Memoized KPI details to avoid expensive filtering and mapping
  const getClinicianKPIDetails = useCallback((clinicianId: string, month: string, year: number) => {
    // Ensure the clinician is approved before processing their reviews
    const clinician = profiles.find(p => p.id === clinicianId);
    if (!clinician || !clinician.accept) {
      return kpis.map(kpi => ({
        kpi,
        review: null,
        score: null,
        hasData: false
      }));
    }

    const monthReviews = reviewItems.filter(review => {
      const reviewDate = new Date(review.date);
      const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
      const reviewYear = reviewDate.getFullYear();
      return review.clinician === clinicianId && 
             reviewMonth === month && 
             reviewYear === year;
    });

    return kpis.map(kpi => {
      const kpiReview = monthReviews.find(review => review.kpi === kpi.id);
      return {
        kpi,
        review: kpiReview,
        score: kpiReview ? (kpiReview.met_check ? kpi.weight : 0) : null,
        hasData: !!kpiReview
      };
    });
  }, [profiles, reviewItems, kpis]);

  // Weekly KPI details for clinicians
  const getClinicianWeeklyKPIDetails = useCallback(async (clinicianId: string, year: number, week: number) => {
    // Ensure the clinician is approved before processing their reviews
    const clinician = profiles.find(p => p.id === clinicianId);
    if (!clinician || !clinician.accept) {
      return kpis.map(kpi => ({
        kpi,
        review: null,
        score: null,
        hasData: false
      }));
    }

    try {
      const { start, end } = getWeekDateRange(year, week);
      const weekReviews = await ReviewService.getReviewsByDateRange(clinicianId, start, end);

      return kpis.map(kpi => {
        const kpiReview = weekReviews.find(review => review.kpi === kpi.id);
        return {
          kpi,
          review: kpiReview,
          score: kpiReview ? (kpiReview.met_check ? kpi.weight : 0) : null,
          hasData: !!kpiReview
        };
      });
    } catch (error) {
      console.error('Error getting weekly KPI details:', error);
      return kpis.map(kpi => ({
        kpi,
        review: null,
        score: null,
        hasData: false
      }));
    }
  }, [profiles, kpis]);

  // Calculate weekly KPI details for individual clinicians
  useEffect(() => {
    const calculateWeeklyKPIDetails = async () => {
      if (viewType !== 'weekly' || !user?.id || user.role !== 'clinician') return;
      
      try {
        const details = await getClinicianWeeklyKPIDetails(user.id, selectedWeek.year, selectedWeek.week);
        setWeeklyKPIDetails(details);
      } catch (error) {
        console.error('Error calculating weekly KPI details:', error);
        setWeeklyKPIDetails([]);
      }
    };
    
    calculateWeeklyKPIDetails();
  }, [viewType, selectedWeek, user?.id, user?.role]);

  // Memoized score calculation for current user - moved to top level to avoid conditional hook calls
  const myScore = useMemo(() => {
    if (!user) return 0;
    if (user.role === 'director') {
      return getDirectorAverageScore(user.id, selectedMonth, selectedYear);
    } else if (user.role === 'clinician') {
      return getClinicianScore(user.id, selectedMonth, selectedYear);
    }
    return 0;
  }, [user, selectedMonth, selectedYear, getClinicianScore, getDirectorAverageScore]);
  


  // Helper function to get file name from URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Remove any query parameters
      return fileName.split('?')[0];
    } catch {
      return 'Download File';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Recent activity based on user role
  const getRecentActivity = () => {
    if (user?.role === 'clinician') {
      // For clinicians, show their own review history
      const myReviews = getClinicianReviews(user.id);
      return myReviews.slice(0, 5).map((review, index) => {
        const kpi = kpis.find(k => k.id === review.kpiId);
        return {
          id: index,
          type: review.met ? 'kpi_met' : 'improvement_needed',
          action: review.met ? `${kpi?.title} - Target Met` : `${kpi?.title} - Improvement Plan`,
          time: review.reviewDate ? `Reviewed ${new Date(review.reviewDate).toLocaleDateString()}` : `${review.month} ${review.year}`,
          notes: review.notes,
          plan: review.plan
        };
      });
    } else {
      // For directors and admins, show team activity based on real data
      const recentActivities: any[] = [];
      
      // Get recent reviews from all assigned clinicians
      userClinicians.forEach(clinician => {
        const reviews = getClinicianReviews(clinician.id);
        const recentReviews = reviews
          .filter(review => review.reviewDate) // Only reviews with actual review dates
          .sort((a, b) => new Date(b.reviewDate!).getTime() - new Date(a.reviewDate!).getTime())
          .slice(0, 2); // Get 2 most recent reviews per clinician
        
        recentReviews.forEach((review, index) => {
          const kpi = kpis.find(k => k.id === review.kpiId);
          const reviewDate = new Date(review.reviewDate!);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - reviewDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let timeText = '';
          if (diffDays === 1) {
            timeText = '1 day ago';
          } else if (diffDays < 7) {
            timeText = `${diffDays} days ago`;
          } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            timeText = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
          } else {
            timeText = reviewDate.toLocaleDateString();
          }
          
          recentActivities.push({
            id: `${clinician.id}-${review.id}-${index}`,
            type: review.met ? 'kpi_updated' : 'improvement_plan',
            clinician: clinician.name,
            action: review.met ? `${kpi?.title} - Target achieved` : `${kpi?.title} - Improvement plan created`,
            time: timeText,
            score: getClinicianScore(clinician.id, review.month, review.year),
            reviewDate: reviewDate
          });
        });
      });
      
      // Sort all activities by review date (most recent first) and take top 5
      return recentActivities
        .sort((a, b) => b.reviewDate.getTime() - a.reviewDate.getTime())
        .slice(0, 5);
    }
  };

  const recentActivity = getRecentActivity();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBorderColor = (score: number) => {
    if (score >= 90) return 'border-green-200';
    if (score >= 80) return 'border-blue-200';
    if (score >= 70) return 'border-yellow-200';
    return 'border-red-200';
  };

  // Helper function to handle month selection
  const handleMonthSelect = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthSelector(false);
  };

  // Helper function to handle AI analysis for clinician
  const handleAIAnalysis = async () => {
    if (!user || user.role !== 'clinician') return;
    
    setIsAnalyzing(true);
    
    try {
      // Find the current clinician's profile
      const clinicianProfile = profiles.find(p => p.id === user.id);
      if (!clinicianProfile) {
        throw new Error('Clinician profile not found');
      }

      // Get performance data for the last 12 months
      const performanceHistory = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const score = getClinicianScore(user.id, monthName, year);
        
        return {
          month: monthName,
          year,
          score
        };
      }).reverse();

      // Get KPI performance breakdown
      const reviews = getClinicianReviews(user.id);
      const kpiPerformance = kpis.map(kpi => {
        const kpiReviews = reviews.filter(r => r.kpiId === kpi.id);
        const metCount = kpiReviews.filter(r => r.met).length;
        const totalCount = kpiReviews.length;
        const percentage = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;
        
        return {
          kpiTitle: kpi.title,
          percentage,
          weight: kpi.weight,
          met: metCount,
          total: totalCount
        };
      });

      // Prepare data for AI analysis
      const analysisData: ClinicianAnalysisData = {
        clinicianId: user.id,
        clinicianName: clinicianProfile.name,
        position: clinicianProfile.position_info?.position_title || 'Clinician',
        department: clinicianProfile.clinician_info?.type_info?.title || 'General',
        currentScore,
        performanceHistory,
        kpiPerformance,
        reviewCount: reviews.length,
        startDate: clinicianProfile.created_at
      };

      // Get AI analysis
      const analysisResult = await aiAnalysisService.analyzeClinicianPerformance(analysisData);
      
      // Generate and download PDF
      generateAIAnalysisPDF(analysisData, analysisResult);
      
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      alert('Error generating AI analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to download team data as PDF (supports both monthly and weekly)
  const handleDownloadMonthlyData = () => {
    try {
      if (user?.role === 'clinician') {
        // For clinicians, respect their current view type (monthly or weekly)
        const clinician = profiles.find(p => p.id === user.id);
        
        if (clinician) {
          if (viewType === 'weekly') {
            // Generate weekly data for clinician
            const myReviews = getClinicianReviews(user.id);
            const weeklyReviews = myReviews.filter(review => {
              const reviewDate = new Date(review.date);
              const { start, end } = getWeekDateRange(selectedWeek.year, selectedWeek.week);
              return reviewDate >= start && reviewDate <= end;
            });
            
            generateMonthlyDataPDF(clinician, kpis, weeklyReviews, selectedMonth, selectedYear, currentScore, 'weekly', selectedWeek);
          } else {
            // Generate monthly data for clinician
            const myReviews = getClinicianReviews(user.id);
            const monthlyReviews = myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear);
            const score = getClinicianScore(user.id, selectedMonth, selectedYear);
            
            generateMonthlyDataPDF(clinician, kpis, monthlyReviews, selectedMonth, selectedYear, score, 'monthly');
          }
        } else {
          alert('Error: Clinician profile not found');
        }
      } else {
        // For directors/admins, check current view type
        if (teamDataViewType === 'weekly') {
          // Generate weekly team data
          const teamData = userClinicians.map(clinician => ({
            clinician,
            score: weeklyScoresLookup.get(clinician.id) || 0,
            reviews: filterReviewsByViewType(reviewItems.filter(r => r.clinician === clinician.id))
          }));
          
          generateMonthlyDataPDF(null, kpis, teamData, selectedMonth, selectedYear, weeklyTeamAvgScore, 'weekly', selectedWeek);
        } else {
          // Generate monthly team data
          const teamData = userClinicians.map(clinician => ({
            clinician,
            score: getClinicianScore(clinician.id, selectedMonth, selectedYear),
            reviews: getClinicianReviews(clinician.id).filter(r => r.month === selectedMonth && r.year === selectedYear)
          }));
          
          generateMonthlyDataPDF(null, kpis, teamData, selectedMonth, selectedYear, avgScore, 'monthly');
        }
      }
    } catch (error) {
      console.error('Error in handleDownloadMonthlyData:', error);
      alert('Error generating PDF. Please check the console for details.');
    }
  };

  // Helper function to download KPI Performance as PDF
  const handleDownloadKPIPerformance = () => {
    try {
      if (user?.role === 'clinician') {
        const clinician = profiles.find(p => p.id === user.id);
        
        if (clinician) {
          if (viewType === 'weekly') {
            // Generate weekly KPI performance for clinician
            const myReviews = getClinicianReviews(user.id);
            const weeklyReviews = myReviews.filter(review => {
              const reviewDate = new Date(review.date);
              const { start, end } = getWeekDateRange(selectedWeek.year, selectedWeek.week);
              return reviewDate >= start && reviewDate <= end;
            });
            
            generateMonthlyDataPDF(clinician, kpis, weeklyReviews, selectedMonth, selectedYear, currentScore, 'weekly', selectedWeek);
          } else {
            // Generate monthly KPI performance for clinician
            const myReviews = getClinicianReviews(user.id);
            const monthlyReviews = myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear);
            const score = getClinicianScore(user.id, selectedMonth, selectedYear);
            
            generateMonthlyDataPDF(clinician, kpis, monthlyReviews, selectedMonth, selectedYear, score, 'monthly');
          }
        } else {
          alert('Error: Clinician profile not found');
        }
      }
    } catch (error) {
      console.error('Error in handleDownloadKPIPerformance:', error);
      alert('Error generating PDF. Please check the console for details.');
    }
  };

  // Helper function to download Performance section as PDF (for admin/director dashboard)
  const handleDownloadPerformance = () => {
    try {
      // Get all reviews for the selected period (we'll filter by role inside the PDF generator)
      const periodReviews = filterReviewsByViewType(reviewItems);
      
      if (teamDataViewType === 'weekly') {
        generatePerformancePDF(
          user?.role || '',
          user?.name || '',
          kpis,
          periodReviews,
          userClinicians,
          selectedMonth,
          selectedYear,
          'weekly',
          selectedWeek
        );
      } else {
        generatePerformancePDF(
          user?.role || '',
          user?.name || '',
          kpis,
          periodReviews,
          userClinicians,
          selectedMonth,
          selectedYear,
          'monthly'
        );
      }
    } catch (error) {
      console.error('Error in handleDownloadPerformance:', error);
      alert('Error generating Performance PDF. Please try again.');
    }
  };

  // Helper functions to get all clinicians and directors sorted by highest score
  const getAllClinicians = () => {
    return profiles
      .filter(p => p.position_info?.role === 'clinician')
      .sort((a, b) => {
        const scoreA = getClinicianScore(a.id, selectedMonth, selectedYear);
        const scoreB = getClinicianScore(b.id, selectedMonth, selectedYear);
        return scoreB - scoreA; // Sort by highest score first
      });
  };

  const getAllDirectors = () => {
    return profiles
      .filter(p => p.position_info?.role === 'director')
      .sort((a, b) => {
        const scoreA = getDirectorAverageScore(a.id, selectedMonth, selectedYear);
        const scoreB = getDirectorAverageScore(b.id, selectedMonth, selectedYear);
        return scoreB - scoreA; // Sort by highest score first
      });
  };

  // Clinician-specific dashboard
  if (user?.role === 'clinician') {
    const myReviews = getClinicianReviews(user.id);
    const myData = profiles.find(p => p.id === user.id);
    const myDirector = getClinicianDirector(user.id);

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Header for Clinician */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-4 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Welcome, {user?.name || ''}! 👩‍⚕️
              </h1>
              <p className="text-green-100 text-base sm:text-lg">
                Your performance overview for {viewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-3xl sm:text-4xl font-bold">{currentScore}%</div>
              <div className="text-green-100 text-sm">Your Score</div>
            </div>
          </div>
        </div>

        {/* View Toggle and Period Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col space-y-4">
            {/* View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewType('monthly')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewType === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Monthly
                </button>
                <button
                  onClick={() => setViewType('weekly')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewType === 'weekly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Weekly
                </button>
              </div>
            </div>
            
            {/* Period Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <span className="text-sm text-gray-600">
                  View data by {viewType === 'monthly' ? 'month' : 'week'}:
                </span>
                {viewType === 'monthly' ? (
                  <MonthYearPicker
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onSelect={handleMonthSelect}
                    isOpen={showMonthSelector}
                    onToggle={() => setShowMonthSelector(!showMonthSelector)}
                  />
                ) : (
                  <WeekPicker
                    selectedWeek={selectedWeek}
                    onWeekChange={setSelectedWeek}
                    isOpen={showWeekSelector}
                    onToggle={() => setShowWeekSelector(!showWeekSelector)}
                  />
                )}
              </div>
            
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <button
                  onClick={handleDownloadMonthlyData}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    Download {viewType === 'monthly' ? selectedMonth : `Week ${selectedWeek.week}`} Data
                  </span>
                  <span className="sm:hidden">Download Data</span>
                </button>

                <button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors w-full sm:w-auto text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                  </span>
                  <span className="sm:hidden">
                    {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Trend</h3>
              <p className="text-sm text-gray-600">
                Your {viewType} performance scores over the last {viewType === 'monthly' ? '12 months' : '12 weeks'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Chart Type Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('line')}
                  className={`flex items-center justify-center space-x-1 px-3 py-2 sm:py-1 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none ${
                    chartType === 'line'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Line</span>
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`flex items-center justify-center space-x-1 px-3 py-2 sm:py-1 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none ${
                    chartType === 'bar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Bar</span>
                </button>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <span>12-Month View</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="displayName" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [`${value}%`, 'Performance Score']}
                    labelFormatter={(label) => {
                      const dataPoint = chartData.find(d => d.displayName === label);
                      if (!dataPoint) return label;
                      
                      if (viewType === 'monthly') {
                        return dataPoint.fullMonth ? `${dataPoint.fullMonth} ${dataPoint.year}` : label;
                      } else {
                        return `Week ${dataPoint.week}, ${dataPoint.year}`;
                      }
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="displayName" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: string) => [`${value}%`, 'Performance Score']}
                    labelFormatter={(label) => {
                      const dataPoint = chartData.find(d => d.displayName === label);
                      if (!dataPoint) return label;
                      
                      if (viewType === 'monthly') {
                        return dataPoint.fullMonth ? `${dataPoint.fullMonth} ${dataPoint.year}` : label;
                      } else {
                        return `Week ${dataPoint.week}, ${dataPoint.year}`;
                      }
                    }}
                  />
                  <Bar 
                    dataKey="score" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend/Summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">Current {viewType === 'monthly' ? 'Month' : 'Week'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{currentScore}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">12-{viewType === 'monthly' ? 'Month' : 'Week'} Average</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                {chartData.length > 0 ? Math.round(chartData.reduce((sum, data) => sum + data.score, 0) / chartData.length) : 0}%
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Best {viewType === 'monthly' ? 'Month' : 'Week'}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
                {chartData.length > 0 ? Math.max(...chartData.map(d => d.score)) : 0}%
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2">
                {(() => {
                  const trend = calculateTrend(chartData);
                  const TrendIcon = trend.direction === 'up' ? ArrowUp : trend.direction === 'down' ? ArrowDown : Activity;
                  const trendColor = trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-orange-600';
                  return <TrendIcon className={`w-4 h-4 ${trendColor}`} />;
                })()}
                <span className="text-xs sm:text-sm font-medium text-gray-700">{viewType === 'monthly' ? 'Monthly' : 'Weekly'} Trend</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">
                {(() => {
                  const trend = calculateTrend(chartData);
                  if (trend.direction === 'stable') return 'Stable';
                  return `${trend.direction === 'up' ? '+' : '-'}${trend.percentage.toFixed(1)}%`;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Director Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          {myDirector ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 sm:w-8 h-6 sm:h-8 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Your Director</h3>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatName(myDirector.name)}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {myDirector.position_info?.position_title || 'Clinical Director'}
                  </p>
                  {myDirector.director_info?.direction && (
                    <p className="text-xs sm:text-sm text-blue-600 mt-1">
                      {myDirector.director_info.direction}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm font-medium rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Assigned
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Contact for performance discussions
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 sm:w-8 h-6 sm:h-8 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Director Assignment</h3>
                  <p className="text-lg sm:text-xl font-medium text-gray-600">No director assigned</p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Please contact administration for assignment
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-xs sm:text-sm font-medium rounded-full">
                  <Clock className="w-4 h-4 mr-1" />
                  Pending
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Assignment needed
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Personal Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Current Score</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{currentScore}%</p>
                <p className="text-xs sm:text-sm text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Performance tracking
                </p>
              </div>
              <div className="w-12 sm:w-14 h-12 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 sm:w-7 h-6 sm:h-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Reviewed KPIs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{myReviews.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">KPIs</p>
              </div>
              <div className="w-12 sm:w-14 h-12 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 sm:w-7 h-6 sm:h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">KPIs Met</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                  {myReviews.filter(r => r.met).length}
                </p>
                <p className="text-xs sm:text-sm text-green-600 mt-1">
                  of {myReviews.length} total
                </p>
              </div>
              <div className="w-12 sm:w-14 h-12 sm:h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 sm:w-7 h-6 sm:h-7 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* My Performance and Recent Reviews */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {/* Enhanced KPI Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-2 sm:space-y-0">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  My KPI Performance - {viewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`}
                </h3>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  {viewType === 'monthly' 
                    ? `${getClinicianKPIDetails(user.id, selectedMonth, selectedYear).filter(kpi => kpi.hasData).length} of ${kpis.length} KPIs reviewed`
                    : `${weeklyKPIDetails.filter(kpi => kpi.hasData).length} of ${kpis.length} KPIs reviewed`
                  }
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                <button
                  onClick={handleDownloadKPIPerformance}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  title="Download KPI Performance Report"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate AI Performance Analysis"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span>{isAnalyzing ? 'Analyzing...' : 'AI Analysis'}</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {(viewType === 'monthly' 
                ? getClinicianKPIDetails(user.id, selectedMonth, selectedYear)
                : weeklyKPIDetails
              ).map((kpiDetail) => {
                const { kpi, review, score, hasData } = kpiDetail;
                const isExpanded = expandedKPIs.has(kpi.id);
                
                return (
                  <div key={kpi.id} className="border border-gray-200 rounded-lg">
                    {/* KPI Header */}
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{kpi.title}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                            Weight: {kpi.weight}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end space-x-3">
                          {hasData ? (
                            <>
                              {review?.met_check ? (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <Check className="w-4 h-4" />
                                  <span className="text-xs sm:text-sm font-medium">Met</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-red-600">
                                  <X className="w-4 h-4" />
                                  <span className="text-xs sm:text-sm font-medium">Not Met</span>
                                </div>
                              )}
                              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                {score}/{kpi.weight}
                              </span>
                            </>
                          ) : (
                            <div className="flex items-center space-x-1 text-gray-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">No review</span>
                            </div>
                          )}
                          
                          {hasData && (
                            <button
                              onClick={() => toggleKPIExpanded(kpi.id)}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-600 mb-3">{kpi.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            hasData && review?.met_check ? 'bg-green-600' : hasData ? 'bg-red-600' : 'bg-gray-300'
                          }`}
                          style={{ width: hasData ? (review?.met_check ? '100%' : '0%') : '0%' }}
                        />
                      </div>
                      
                      {hasData && (
                        <div className="mt-2 text-xs text-gray-500">
                          Reviewed on {new Date(review!.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && hasData && (
                      <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                        {!review?.met_check && (
                          <div className="space-y-4">
                            {review?.notes && (
                              <div>
                                <div className="flex items-center space-x-1 mb-2">
                                  <FileText className="w-4 h-4 text-orange-600" />
                                  <span className="text-xs sm:text-sm font-medium text-gray-700">Notes:</span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 bg-orange-50 p-3 rounded border-l-4 border-orange-200">
                                  {review.notes}
                                </p>
                              </div>
                            )}
                            
                            {review?.plan && (
                              <div>
                                <div className="flex items-center space-x-1 mb-2">
                                  <TrendingUp className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs sm:text-sm font-medium text-gray-700">Action Plan:</span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                                  {review.plan}
                                </p>
                              </div>
                            )}
                            
                            {review?.file_url && (
                              <div>
                                <div className="flex items-center space-x-1 mb-2">
                                  <Download className="w-4 h-4 text-green-600" />
                                  <span className="text-xs sm:text-sm font-medium text-gray-700">Attached File:</span>
                                </div>
                                <div className="flex items-center space-x-2 bg-green-50 p-3 rounded border border-green-200">
                                  <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm text-green-700 flex-1 truncate">
                                    {getFileNameFromUrl(review.file_url)}
                                  </span>
                                  <button
                                    onClick={() => window.open(review.file_url, '_blank')}
                                    className="text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1 flex-shrink-0"
                                    title="Download file"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="text-xs hidden sm:inline">Open</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {review?.met_check && (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                            <span className="text-xs sm:text-sm font-medium">
                              Great job! You successfully met this KPI target.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Review results for {viewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`}
            </h3>
            <div className="space-y-4">
              {viewType === 'monthly' ? (
                // Monthly reviews
                <>
                  {myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear).slice(0, 5).map((review) => {
                    const kpi = kpis.find(k => k.id === review.kpiId);
                    return (
                      <div key={review.id} className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          review.met ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {review.met ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> : 
                            <Clock className="w-4 h-4 text-yellow-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{kpi?.title} - {review.met ? 'Target Met' : 'Improvement Plan'}</p>
                          <p className="text-xs text-gray-500">{review.reviewDate ? `Reviewed ${new Date(review.reviewDate).toLocaleDateString()}` : `${review.month} ${review.year}`}</p>
                          {review.notes && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.notes}</p>
                          )}
                          {review.plan && (
                            <p className="text-xs text-blue-600 mt-1 line-clamp-2"><strong>Plan:</strong> {review.plan}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm sm:text-base">No reviews found for {selectedMonth} {selectedYear}</p>
                    </div>
                  )}
                </>
              ) : (
                // Weekly reviews - show KPI details with data
                <>
                  {weeklyKPIDetails.filter(kpi => kpi.hasData).slice(0, 5).map((kpiDetail) => {
                    const { kpi, review } = kpiDetail;
                    return (
                      <div key={kpi.id} className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          review?.met_check ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {review?.met_check ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> : 
                            <Clock className="w-4 h-4 text-yellow-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">{kpi.title} - {review?.met_check ? 'Target Met' : 'Improvement Plan'}</p>
                          <p className="text-xs text-gray-500">Reviewed {new Date(review?.date || '').toLocaleDateString()}</p>
                          {review?.notes && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.notes}</p>
                          )}
                          {review?.plan && (
                            <p className="text-xs text-blue-600 mt-1 line-clamp-2"><strong>Plan:</strong> {review.plan}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {weeklyKPIDetails.filter(kpi => kpi.hasData).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm sm:text-base">No reviews found for Week {selectedWeek.week}, {selectedWeek.year}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Director dashboard
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {(user?.name || '').split(' ')[0]}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Here's your team performance overview for {teamDataViewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{avgScore}%</div>
              <div className="text-blue-100 text-sm">Avg Score</div>
            </div>
            <div className="w-px h-12 bg-blue-400"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{topPerformers.length}</div>
              <div className="text-blue-100 text-sm">Top Performers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Data Selector and Download Controls for Directors/Admins */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col space-y-4">
          {/* Header and Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">View Team Data</h3>
            
              {/* View Type Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTeamDataViewType('monthly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    teamDataViewType === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setTeamDataViewType('weekly')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    teamDataViewType === 'weekly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Weekly
                </button>
                </div>
            </div>
            
            <button
              onClick={handleDownloadMonthlyData}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download {teamDataViewType === 'monthly' ? selectedMonth : `Week ${selectedWeek.week}`} Team Data</span>
              <span className="sm:hidden">Download Data</span>
            </button>
          </div>

          {/* Date Selectors */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {teamDataViewType === 'monthly' ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Select Month:</span>
                <MonthYearPicker
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onSelect={handleMonthSelect}
                  isOpen={showMonthSelector}
                  onToggle={() => setShowMonthSelector(!showMonthSelector)}
                />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Select Week:</span>
                <WeekPicker
                  selectedWeek={selectedWeek}
                  onWeekChange={handleTeamWeekSelect}
                  isOpen={showWeekSelector}
                  onToggle={() => setShowWeekSelector(!showWeekSelector)}
                />
              </div>
            )}
            
            {teamDataViewType === 'weekly' && (
              <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
                📅 Showing monthly data for {selectedMonth} {selectedYear}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                {user?.role === 'super-admin' ? 'Total Team Members' : 'Total Clinicians'}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{totalTeamMembers}</p>
              <p className="text-xs sm:text-sm text-green-600 mt-1 flex items-center">
                <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="truncate">Active team members</span>
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active KPIs</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{totalKPIs}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">Across all categories</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{avgScore}%</p>
              <p className="text-xs sm:text-sm text-green-600 mt-1 flex items-center">
                <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="truncate">Team performance</span>
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Need Attention</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{cliniciansNeedingAttention.length}</p>
              <p className="text-xs sm:text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="truncate">Requires review</span>
              </p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
              <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
            </div>
          </div>
        </div>
      </div>


      {/* Performance Charts Section */}
      {/* Team Performance Overview Chart - Full Width */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Team Performance Overview</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {user?.role === 'super-admin' ? 
                  (teamDataViewType === 'monthly' ? 'Current month performance by Director' : 'Current week performance by Director') : 
                 user?.role === 'director' ? 
                  (teamDataViewType === 'monthly' ? 'Current month performance by assigned staff (👤 Clinicians, 👑 Directors)' : 'Current week performance by assigned staff (👤 Clinicians, 👑 Directors)') :
                  (teamDataViewType === 'monthly' ? 'Current month performance' : 'Current week performance')}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>{teamDataViewType === 'monthly' ? 'Current Month' : 'Current Week'}</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(() => {
                const targetUsers = user?.role === 'super-admin' ? userDirectors : userClinicians;
                const chartData = targetUsers.map(person => ({
                  name: formatName(person.name), // Use formatted name for all roles
                  fullName: formatName(person.name),
                  score: teamDataViewType === 'weekly' 
                    ? (weeklyScoresLookup.get(person.id) || 0) // Weekly view uses lookup scores
                    : (user?.role === 'super-admin' && person.position_info?.role === 'director')
                      ? getDirectorAverageScore(person.id, selectedMonth, selectedYear) // Super Admin: Directors show team average
                      : getClinicianScore(person.id, selectedMonth, selectedYear), // Others show individual performance
                  position: person.position_info?.position_title || (person.position_info?.role === 'director' ? 'Director' : 'Clinician'),
                  role: person.position_info?.role || 'clinician',
                  isDirector: person.position_info?.role === 'director'
                }));
                
                console.log('Team Performance Chart Debug:', {
                  userRole: user?.role,
                  teamDataViewType,
                  targetUsersCount: targetUsers.length,
                  targetUsers: targetUsers.map(u => ({ id: u.id, name: u.name, role: u.position_info?.role })),
                  chartData: chartData.map(d => ({ name: d.name, score: d.score, isDirector: d.isDirector })),
                  weeklyScoresLookup: Array.from(weeklyScoresLookup.entries())
                });
                
                return chartData;
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  interval={0}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string, props: any) => [
                    `${value}%`, 
                    'Performance Score'
                  ]}
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload;
                    const roleIcon = data?.isDirector ? '👑' : '👤';
                    return data ? `${roleIcon} ${data.fullName} (${data.position})` : label;
                  }}
                />
                <Bar 
                  dataKey="score" 
                  radius={[4, 4, 0, 0]}
                >
                  {(() => {
                    const targetUsers = user?.role === 'super-admin' ? userDirectors : userClinicians;
                    return targetUsers.map((item, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={item.position_info?.role === 'director' ? '#8b5cf6' : '#3b82f6'} 
                      />
                    ));
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      

      {/* Trend Analysis Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
{/* Performance Distribution Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Performance Distribution</h3>
              <p className="text-xs sm:text-sm text-gray-600">Score ranges across your team</p>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>Distribution</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(() => {
                // Use appropriate data source based on user role
                const targetUsers = user?.role === 'super-admin' ? userDirectors : userClinicians;
                
                return [
                  {
                    range: '90-100%',
                    label: 'Excellent',
                    count: targetUsers.filter(c => {
                      const score = teamDataViewType === 'weekly'
                        ? (weeklyScoresLookup.get(c.id) || 0)
                        : user?.role === 'super-admin'
                          ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                          : getClinicianScore(c.id, selectedMonth, selectedYear);
                      return score >= 90;
                    }).length,
                    color: '#10b981'
                  },
                  {
                    range: '80-89%',
                    label: 'Good',
                    count: targetUsers.filter(c => {
                      const score = teamDataViewType === 'weekly'
                        ? (weeklyScoresLookup.get(c.id) || 0)
                        : user?.role === 'super-admin'
                          ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                          : getClinicianScore(c.id, selectedMonth, selectedYear);
                      return score >= 80 && score < 90;
                    }).length,
                    color: '#3b82f6'
                  },
                  {
                    range: '70-79%',
                    label: 'Average',
                    count: targetUsers.filter(c => {
                      const score = teamDataViewType === 'weekly'
                        ? (weeklyScoresLookup.get(c.id) || 0)
                        : user?.role === 'super-admin'
                          ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                          : getClinicianScore(c.id, selectedMonth, selectedYear);
                      return score >= 70 && score < 80;
                    }).length,
                    color: '#f59e0b'
                  },
                  {
                    range: '0-69%',
                    label: 'Needs Improvement',
                    count: targetUsers.filter(c => {
                      const score = teamDataViewType === 'weekly'
                        ? (weeklyScoresLookup.get(c.id) || 0)
                        : user?.role === 'super-admin'
                          ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                          : getClinicianScore(c.id, selectedMonth, selectedYear);
                      return score < 70;
                    }).length,
                    color: '#ef4444'
                  }
                ];
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="range" 
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string, props: any) => [
                    `${value} team${value !== 1 ? 's' : ''}`, 
                    props.payload.label
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>
        {/* Performance Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Team Performance Trend</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {teamDataViewType === 'weekly' 
                  ? `Average team performance over 6 weeks ending Week ${selectedWeek.week}, ${selectedWeek.year}`
                  : `Average team performance over 6 months ending ${selectedMonth} ${selectedYear}`
                }
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">
                {teamDataViewType === 'weekly' ? '6-Week Trend' : '6-Month Trend'}
              </span>
              <span className="sm:hidden">
                {teamDataViewType === 'weekly' ? '6W Trend' : '6M Trend'}
              </span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={teamDataViewType === 'weekly' 
                ? weeklyTrendData
                : generateTeamTrendData(selectedMonth, selectedYear)
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayName" 
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value}%`, 'Team Average']}
                  labelFormatter={(label, payload) => {
                    const dataPoint = payload?.[0]?.payload;
                    if (!dataPoint) return label;
                    
                    if (teamDataViewType === 'weekly') {
                      return `Week ${dataPoint.week}, ${dataPoint.year}`;
                    } else {
                      return `${dataPoint.fullMonth} ${dataPoint.year}`;
                    }
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

          {/* Top Performers Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Top Performers</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {user?.role === 'super-admin' 
                      ? 'Clinicians with scores ≥ 90%'
                      : 'Team members with scores ≥ 90%'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center sm:justify-end space-x-6 sm:space-x-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{topPerformers.length}</div>
                  <div className="text-xs text-gray-500">Top Performers</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {topPerformers.length > 0 
                      ? Math.round(topPerformers.reduce((acc, c) => {
                          const score = teamDataViewType === 'weekly' 
                            ? (weeklyScoresLookup.get(c.id) || 0)
                            : (user?.role === 'super-admin' && c.position_info?.role === 'director')
                              ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                              : getClinicianScore(c.id, selectedMonth, selectedYear);
                          return acc + score;
                        }, 0) / topPerformers.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Avg Score</div>
                </div>
              </div>
            </div>

            {topPerformers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(showAllTopPerformers ? topPerformers : topPerformers.slice(0, 6)).map((clinician) => {
              const score = teamDataViewType === 'weekly' 
                ? (weeklyScoresLookup.get(clinician.id) || 0)
                : (user?.role === 'super-admin' && clinician.position_info?.role === 'director')
                  ? getDirectorAverageScore(clinician.id, selectedMonth, selectedYear)
                  : getClinicianScore(clinician.id, selectedMonth, selectedYear);
              const monthlyData = generateMonthlyScoreData(clinician.id);
              const trend = calculateTrend(monthlyData);
              

              
              return (
                <div key={clinician.id} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-medium">
                        {clinician.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                      <span className="text-base sm:text-lg font-bold text-green-600">{score}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{clinician.name}</h4>
                    <p className="text-xs text-gray-600 truncate">
                      {clinician.position_info?.position_title || 'Clinician'} • 
                      {clinician.clinician_info?.type_info?.title || 'General'}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-xs">
                    {trend.direction === 'up' ? (
                      <ArrowUp className="w-3 h-3 text-green-600" />
                    ) : trend.direction === 'down' ? (
                      <ArrowDown className="w-3 h-3 text-red-600" />
                    ) : (
                      <Activity className="w-3 h-3 text-gray-600" />
                    )}
                    <span className={`font-medium truncate ${
                      trend.direction === 'up' ? 'text-green-600' : 
                      trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {trend.direction === 'stable' ? 'Stable' : `${trend.direction === 'up' ? '+' : '-'}${trend.percentage.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              );
            })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No top performers (≥90%) found for {teamDataViewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`}</p>
                <p className="text-sm mt-1">Encourage your team to reach excellence!</p>
              </div>
            )}

            {topPerformers.length > 6 && (
              <div className="mt-4 flex justify-center space-x-4">
                <button
                  onClick={() => setShowAllTopPerformers(!showAllTopPerformers)}
                  className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
                >
                  <span>{showAllTopPerformers ? 'Show Less' : `Show All (${topPerformers.length})`}</span>
                  {showAllTopPerformers ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <Link
                  to="/performance-analytics"
                  className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  <span>Analytics</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
          
          {/* Bottom Performers Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">KPI Review needed</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {user?.role === 'super-admin' ? 'Clinicians with scores < 70% requiring attention' : 'Team members with scores < 70% requiring attention'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center sm:justify-end space-x-6 sm:space-x-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{cliniciansNeedingAttention.length}</div>
                  <div className="text-xs text-gray-500">Need Attention</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {cliniciansNeedingAttention.length > 0 
                      ? Math.round(cliniciansNeedingAttention.reduce((acc, c) => {
                          const score = teamDataViewType === 'weekly' 
                            ? (weeklyScoresLookup.get(c.id) || 0)
                            : (user?.role === 'super-admin' && c.position_info?.role === 'director')
                              ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                              : getClinicianScore(c.id, selectedMonth, selectedYear);
                          return acc + score;
                        }, 0) / cliniciansNeedingAttention.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Avg Score</div>
                </div>
              </div>
            </div>

            {cliniciansNeedingAttention.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {(showAllNeedingAttention ? cliniciansNeedingAttention : cliniciansNeedingAttention.slice(0, 4)).map((clinician) => {
                const score = teamDataViewType === 'weekly' 
                  ? (weeklyScoresLookup.get(clinician.id) || 0)
                  : (user?.role === 'super-admin' && clinician.position_info?.role === 'director')
                    ? getDirectorAverageScore(clinician.id, selectedMonth, selectedYear)
                    : getClinicianScore(clinician.id, selectedMonth, selectedYear);
                const monthlyData = generateMonthlyScoreData(clinician.id);
                const trend = calculateTrend(monthlyData);
                const reviews = teamDataViewType === 'weekly' 
                  ? [] // Weekly reviews would need to be fetched differently
                  : getClinicianReviews(clinician.id).filter(r => r.month === selectedMonth && r.year === selectedYear);
                const unmetKPIs = reviews.filter(r => !r.met).length;
                const totalKPIsForMonth = kpis.length;
                
                return (
                  <div key={clinician.id} className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-3 sm:p-4 border border-red-200 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs sm:text-sm font-medium">
                          {clinician.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                        <span className="text-base sm:text-lg font-bold text-red-600">{score}%</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{clinician.name}</h4>
                      <p className="text-xs text-gray-600 truncate">
                        {clinician.position_info?.position_title || 'Clinician'} • 
                        {clinician.clinician_info?.type_info?.title || 'General'}
                      </p>
                    </div>
                    
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Unmet KPIs:</span>
                        <span className="font-medium text-red-600">{unmetKPIs} of {totalKPIsForMonth}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Trend:</span>
                        <div className="flex items-center space-x-1">
                          {trend.direction === 'up' ? (
                            <ArrowUp className="w-3 h-3 text-green-600" />
                          ) : trend.direction === 'down' ? (
                            <ArrowDown className="w-3 h-3 text-red-600" />
                          ) : (
                            <Activity className="w-3 h-3 text-gray-600" />
                          )}
                          <span className={`font-medium truncate ${
                            trend.direction === 'up' ? 'text-green-600' : 
                            trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {trend.direction === 'stable' ? 'Stable' : `${trend.direction === 'up' ? '+' : '-'}${trend.percentage.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                    

                  </div>
                );
              })}
                </div>
                
                {/* Show All button for Performance Review needed */}
                {cliniciansNeedingAttention.length > 4 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAllNeedingAttention(!showAllNeedingAttention)}
                      className="inline-flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium transition-colors bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg"
                    >
                      <span>{showAllNeedingAttention ? 'Show Less' : `Show All (${cliniciansNeedingAttention.length})`}</span>
                      {showAllNeedingAttention ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                <p className="text-lg font-medium text-gray-700">Excellent Team Performance!</p>
                <p className="text-sm mt-1">All team members are performing above 70% for {teamDataViewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`}</p>
                <div className="mt-4 inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                  <Award className="w-4 h-4" />
                  <span className="font-medium">Keep up the great work!</span>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Current Month Performance */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {teamDataViewType === 'monthly' ? `${selectedMonth} ${selectedYear}` : `Week ${selectedWeek.week}, ${selectedWeek.year}`} Performance
                </h3>
              </div>
              
              <button
                onClick={handleDownloadPerformance}
                className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                title="Download Performance Report"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download Report</span>
              </button>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {/* KPI Analysis Overview */}
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Total KPIs</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{kpis.length}</div>
                  <div className="text-xs text-gray-600">Active indicators</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Avg Met Rate</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {(() => {
                      const kpisWithReviews = kpis.filter(kpi => {
                        const kpiReviews = filterReviewsByUserRole(filterReviewsByViewType(reviewItems.filter(review => {
                          return review.kpi === kpi.id;
                        })));
                        return kpiReviews.length > 0;
                      });
                      
                      return kpisWithReviews.length > 0 ? Math.round(
                        kpisWithReviews.reduce((acc, kpi) => {
                          const kpiReviews = filterReviewsByUserRole(filterReviewsByViewType(reviewItems.filter(review => {
                            return review.kpi === kpi.id;
                          })));
                          const metCount = kpiReviews.filter(r => r.met_check).length;
                          return acc + (metCount / kpiReviews.length) * 100;
                        }, 0) / kpisWithReviews.length
                      ) : 0;
                    })()}%
                  </div>
                  <div className="text-xs text-gray-600">Across all KPIs</div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Needs Attention</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {kpis.filter(kpi => {
                      const kpiReviews = filterReviewsByUserRole(filterReviewsByViewType(reviewItems.filter(review => {
                        return review.kpi === kpi.id;
                      })));
                      // Only count KPIs that have reviews from approved clinicians
                      if (kpiReviews.length === 0) return false;
                      const metCount = kpiReviews.filter(r => r.met_check).length;
                      const metRate = (metCount / kpiReviews.length) * 100;
                      return metRate < 70;
                    }).length}
                  </div>
                  <div className="text-xs text-gray-600">KPIs below 70%</div>
                </div>
              </div>
            </div>

            {/* Individual KPI Analysis */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-3 sm:mb-4">KPI Performance Breakdown</h4>
              {kpis.map((kpi) => {
                // Get all reviews for this KPI in the selected period, filtered by user role and approved clinicians
                const kpiReviews = filterReviewsByUserRole(filterReviewsByViewType(reviewItems.filter(review => {
                  return review.kpi === kpi.id;
                })));
                
                // Skip this KPI if there are no reviews from approved clinicians
                if (kpiReviews.length === 0) {
                  return null;
                }
                
                const totalReviews = kpiReviews.length;
                const metCount = kpiReviews.filter(r => r.met_check).length;
                const notMetCount = totalReviews - metCount;
                const metPercentage = totalReviews > 0 ? Math.round((metCount / totalReviews) * 100) : 0;
                
                // Get clinicians who didn't meet this KPI
                const cliniciansNotMet = kpiReviews
                  .filter(r => !r.met_check)
                  .map(r => {
                    const clinician = userClinicians.find(c => c.id === r.clinician);
                    return clinician ? { clinician, review: r } : null;
                  })
                  .filter(Boolean);

                const performanceColor = metPercentage >= 90 ? 'green' : metPercentage >= 70 ? 'blue' : metPercentage >= 50 ? 'yellow' : 'red';
                
                return (
                  <div key={kpi.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <h5 className="font-medium text-gray-900 text-sm sm:text-base">{kpi.title}</h5>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit">
                            Weight: {kpi.weight}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2">{kpi.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end space-x-3 sm:ml-4">
                        <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                          performanceColor === 'green' ? 'bg-green-100 text-green-800' :
                          performanceColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                          performanceColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {metPercentage}%
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {metCount}/{totalReviews}
                          </div>
                          <div className="text-xs text-gray-500">met/total</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          performanceColor === 'green' ? 'bg-green-600' :
                          performanceColor === 'blue' ? 'bg-blue-600' :
                          performanceColor === 'yellow' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${metPercentage}%` }}
                      />
                    </div>
                    
                    {/* Performance Stats */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-base sm:text-lg font-bold text-green-600">{metCount}</div>
                        <div className="text-xs text-gray-600">Met</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base sm:text-lg font-bold text-red-600">{notMetCount}</div>
                        <div className="text-xs text-gray-600">Not Met</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base sm:text-lg font-bold text-gray-900">{totalReviews}</div>
                        <div className="text-xs text-gray-600">Total Reviews</div>
                      </div>
                    </div>
                    
                    {/* Clinicians who didn't meet this KPI */}
                    {cliniciansNotMet.length > 0 && (
                      <div className="mt-3 sm:mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-1 mb-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Needs Attention:</span>
                        </div>
                        <div className="space-y-2">
                          {cliniciansNotMet.slice(0, 3).map(({ clinician, review }) => (
                            <div key={clinician.id} className="flex items-center justify-between bg-orange-50 rounded-lg p-2">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-orange-800 text-xs font-medium">
                                    {clinician.name.split(' ').map(n => n[0]).join('')}
                                  </span>
                                </div>
                                <span className="text-xs sm:text-sm text-gray-900 truncate">{clinician.name}</span>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                                {review.notes && (
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-200 rounded-full flex items-center justify-center" title="Has notes">
                                    <FileText className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-blue-600" />
                                  </div>
                                )}
                                {review.plan && (
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-200 rounded-full flex items-center justify-center" title="Has action plan">
                                    <TrendingUp className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-green-600" />
                                  </div>
                                )}
                                {review.file_url && (
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-200 rounded-full flex items-center justify-center" title="Has attached file">
                                    <Download className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-purple-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {cliniciansNotMet.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{cliniciansNotMet.length - 3} more clinicians
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {totalReviews === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No reviews completed for this KPI in {teamDataViewType === 'weekly' ? `Week ${selectedWeek.week}, ${selectedWeek.year}` : `${selectedMonth} ${selectedYear}`}</p>
                      </div>
                    )}
                  </div>
                );
              }).filter(Boolean)}
              
              {/* Show message if no KPIs have reviews from approved clinicians */}
              {kpis.every(kpi => {
                const kpiReviews = filterReviewsByUserRole(filterReviewsByViewType(reviewItems.filter(review => {
                  return review.kpi === kpi.id;
                })));
                return kpiReviews.length === 0;
              }) && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-700">No KPI Reviews Available</p>
                  <p className="text-sm mt-1">No reviews from approved clinicians found for {teamDataViewType === 'weekly' ? `Week ${selectedWeek.week}, ${selectedWeek.year}` : `${selectedMonth} ${selectedYear}`}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'review_completed' ? 'bg-green-100' :
                      activity.type === 'kpi_updated' ? 'bg-blue-100' : 'bg-yellow-100'
                    }`}>
                      {activity.type === 'review_completed' && <BarChart3 className="w-4 h-4 text-green-600" />}
                      {activity.type === 'kpi_updated' && <Target className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'improvement_plan' && <Clock className="w-4 h-4 text-yellow-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.clinician}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">{activity.time}</p>
                        {activity.score && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getScoreColor(activity.score)}`}>
                            {activity.score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No recent activity found</p>
                  <p className="text-gray-400 text-xs mt-1">Activity will appear here when clinicians complete reviews</p>
                </div>
              )}
            </div>
          </div>
            </div>
          </div>



      {/* Admin Analytics Component - Only for super-admin */}
      {user?.role === 'super-admin' && (
        <AdminAnalytics className="mt-8 max-md:hidden" />
      )}

    </div>
  );
};

export default Dashboard;