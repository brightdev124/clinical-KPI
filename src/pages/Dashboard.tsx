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
  Navigation
} from 'lucide-react';
import { generateMonthlyDataPDF, generatePerformancePDF } from '../utils/pdfGenerator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import AdminAnalytics from '../components/AdminAnalytics';
import { MonthYearPicker } from '../components/UI';

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

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // State for expanded KPIs in clinician dashboard
  const [expandedKPIs, setExpandedKPIs] = useState<Set<string>>(new Set());
  
  // State for showing all performers
  const [showAllTopPerformers, setShowAllTopPerformers] = useState(false);
  const [showAllNeedingAttention, setShowAllNeedingAttention] = useState(false);



  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();



  // Reset "Show All" states when month/year changes
  useEffect(() => {
    setShowAllTopPerformers(false);
    setShowAllNeedingAttention(false);
  }, [selectedMonth, selectedYear]);

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

  // Calculate director's average score based on assigned members
  const getDirectorAverageScore = (directorId: string, month: string, year: number): number => {
    const assignedClinicians = getAssignedClinicians(directorId);
    const assignedDirectors = getAssignedDirectors(directorId);
    const allAssignedMembers = [...assignedClinicians, ...assignedDirectors];
    
    if (allAssignedMembers.length === 0) {
      return 0; // No assigned members
    }
    
    const scores = allAssignedMembers.map(member => {
      // For assigned directors, get their director average score; for clinicians, get their individual score
      if (member.position_info?.role === 'director') {
        return getDirectorAverageScore(member.id, month, year);
      } else {
        return getClinicianScore(member.id, month, year);
      }
    });
    
    const validScores = scores.filter(score => score > 0);
    if (validScores.length === 0) {
      return 0;
    }
    
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
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

  // Filter staff based on user role - include both clinicians and directors for directors
  const userClinicians = user?.role === 'super-admin' 
    ? profiles.filter(p => p.accept && (p.position_info?.role === 'clinician' || p.position_info?.role === 'director'))
    : user?.role === 'director'
    ? [...getAssignedClinicians(user.id).filter(p => p.accept), ...getAssignedDirectors(user.id).filter(p => p.accept)]
    : profiles.filter(p => p.id === user?.id && p.accept && p.position_info?.role === 'clinician');

  // Separate directors and clinicians for admin dashboard - only approved users
  const userDirectors = user?.role === 'super-admin' 
    ? profiles.filter(p => p.accept && p.position_info?.role === 'director')
    : user?.role === 'director'
    ? profiles.filter(p => p.id === user?.id && p.accept && p.position_info?.role === 'director')
    : [];

  const userCliniciansOnly = user?.role === 'super-admin' 
    ? profiles.filter(p => p.accept && p.position_info?.role === 'clinician')
    : user?.role === 'director'
    ? getAssignedClinicians(user.id).filter(p => p.accept && p.position_info?.role === 'clinician')
    : profiles.filter(p => p.id === user?.id && p.accept && p.position_info?.role === 'clinician');

  // Combined assigned staff for directors (both clinicians and directors)
  const userAssignedDirectors = user?.role === 'director' ? getAssignedDirectors(user.id).filter(p => p.accept) : [];

  // Calculate stats for selected month
  const totalTeamMembers = userClinicians.length;
  const totalKPIs = kpis.length;
  
  // Memoized calculations that depend on selectedMonth and selectedYear
  const avgScore = useMemo(() => {
    if (userClinicians.length === 0) return 0;
    
    const totalScore = userClinicians.reduce((acc, c) => {
      const score = c.position_info?.role === 'director' 
        ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
        : getClinicianScore(c.id, selectedMonth, selectedYear);
      return acc + score;
    }, 0);
    
    return Math.round(totalScore / userClinicians.length);
  }, [userClinicians, selectedMonth, selectedYear, getDirectorAverageScore, getClinicianScore]);

  // Memoized staff needing attention (score < 70)
  const cliniciansNeedingAttention = useMemo(() => {
    const targetClinicians = user?.role === 'super-admin' ? userCliniciansOnly : userClinicians;
    return targetClinicians.filter(c => {
      const score = c.position_info?.role === 'director' 
        ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
        : getClinicianScore(c.id, selectedMonth, selectedYear);
      return score < 70;
    });
  }, [user?.role, userCliniciansOnly, userClinicians, selectedMonth, selectedYear, getDirectorAverageScore, getClinicianScore]);

  // Memoized top performers (score >= 90)
  const topPerformers = useMemo(() => {
    const targetClinicians = user?.role === 'super-admin' ? userCliniciansOnly : userClinicians;
    return targetClinicians.filter(c => {
      const score = c.position_info?.role === 'director' 
        ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
        : getClinicianScore(c.id, selectedMonth, selectedYear);
      return score >= 90;
    });
  }, [user?.role, userCliniciansOnly, userClinicians, selectedMonth, selectedYear, getDirectorAverageScore, getClinicianScore]);

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

  // Helper function to download monthly data as PDF
  const handleDownloadMonthlyData = () => {
    try {
      if (user?.role === 'clinician') {
        const myReviews = getClinicianReviews(user.id);
        const monthlyReviews = myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear);
        const clinician = profiles.find(p => p.id === user.id);
        const score = getClinicianScore(user.id, selectedMonth, selectedYear);
        
        if (clinician) {
          generateMonthlyDataPDF(clinician, kpis, monthlyReviews, selectedMonth, selectedYear, score);
        } else {
          alert('Error: Clinician profile not found');
        }
      } else {
        // For directors/admins, generate team summary
        const teamData = userClinicians.map(clinician => ({
          clinician,
          score: getClinicianScore(clinician.id, selectedMonth, selectedYear),
          reviews: getClinicianReviews(clinician.id).filter(r => r.month === selectedMonth && r.year === selectedYear)
        }));
        
        generateMonthlyDataPDF(null, kpis, teamData, selectedMonth, selectedYear, avgScore);
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
        const myReviews = getClinicianReviews(user.id);
        const monthlyReviews = myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear);
        const clinician = profiles.find(p => p.id === user.id);
        const score = getClinicianScore(user.id, selectedMonth, selectedYear);
        
        if (clinician) {
          generateMonthlyDataPDF(clinician, kpis, monthlyReviews, selectedMonth, selectedYear, score);
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
      // Get all reviews for the selected month/year (we'll filter by role inside the PDF generator)
      const monthlyReviews = reviewItems.filter(review => {
        const reviewDate = new Date(review.date);
        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
        const reviewYear = reviewDate.getFullYear();
        return reviewMonth === selectedMonth && reviewYear === selectedYear;
      });
      
      generatePerformancePDF(
        user?.role || '',
        user?.name || '',
        kpis,
        monthlyReviews,
        userClinicians,
        selectedMonth,
        selectedYear
      );
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
        const scoreA = getClinicianScore(a.id, selectedMonth, selectedYear);
        const scoreB = getClinicianScore(b.id, selectedMonth, selectedYear);
        return scoreB - scoreA; // Sort by highest score first
      });
  };

  // Clinician-specific dashboard
  if (user?.role === 'clinician') {
    // Memoized clinician score calculation
    const myScore = useMemo(() => 
      getClinicianScore(user.id, selectedMonth, selectedYear), 
      [user.id, selectedMonth, selectedYear, getClinicianScore]
    );
    
    // Memoized chart data to avoid expensive recalculation
    const chartData = useMemo(() => 
      generateMonthlyScoreData(user.id, selectedMonth, selectedYear), 
      [user.id, selectedMonth, selectedYear, generateMonthlyScoreData]
    );
    
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
                Your performance overview for {selectedMonth} {selectedYear}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-3xl sm:text-4xl font-bold">{myScore}%</div>
              <div className="text-green-100 text-sm">Your Score</div>
            </div>
          </div>
        </div>

        {/* Month Selector and Download Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">View Data By Month</h3>
              <MonthYearPicker
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onSelect={handleMonthSelect}
                isOpen={showMonthSelector}
                onToggle={() => setShowMonthSelector(!showMonthSelector)}
              />
            </div>
            
            <button
              onClick={handleDownloadMonthlyData}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download {selectedMonth} Data</span>
              <span className="sm:hidden">Download Data</span>
            </button>
          </div>
        </div>

        {/* Monthly Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Trend</h3>
              <p className="text-sm text-gray-600">Your monthly performance scores over the last 12 months</p>
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
                      return dataPoint ? `${dataPoint.fullMonth} ${dataPoint.year}` : label;
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
                      return dataPoint ? `${dataPoint.fullMonth} ${dataPoint.year}` : label;
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
                <span className="text-xs sm:text-sm font-medium text-gray-700">Current Month</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{myScore}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">12-Month Average</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                {Math.round(chartData.reduce((sum, data) => sum + data.score, 0) / 12)}%
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Best Month</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
                {Math.max(...chartData.map(d => d.score))}%
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
                <span className="text-xs sm:text-sm font-medium text-gray-700">Monthly Trend</span>
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
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{myScore}%</p>
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
                <h3 className="text-lg font-semibold text-gray-900">My KPI Performance - {selectedMonth} {selectedYear}</h3>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  {getClinicianKPIDetails(user.id, selectedMonth, selectedYear).filter(kpi => kpi.hasData).length} of {kpis.length} KPIs reviewed
                </div>
              </div>
              <button
                onClick={handleDownloadKPIPerformance}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                title="Download KPI Performance Report"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {getClinicianKPIDetails(user.id, selectedMonth, selectedYear).map((kpiDetail) => {
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review results for {selectedMonth} {selectedYear}</h3>
            <div className="space-y-4">
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
              Here's your team performance overview for {selectedMonth} {selectedYear}
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

      {/* Month Selector and Download Controls for Directors/Admins */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">View Team Data By Month</h3>
            <MonthYearPicker
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onSelect={handleMonthSelect}
              isOpen={showMonthSelector}
              onToggle={() => setShowMonthSelector(!showMonthSelector)}
            />
          </div>
          
          <button
            onClick={handleDownloadMonthlyData}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download {selectedMonth} Team Data</span>
            <span className="sm:hidden">Download Data</span>
          </button>
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
                {user?.role === 'super-admin' ? 'Current month performance by Director' : 
                 user?.role === 'director' ? 'Current month performance by assigned staff (👤 Clinicians, 👑 Directors)' :
                 'Current month performance'}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>Current Month</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(user?.role === 'super-admin' ? userDirectors : userClinicians).map(person => ({
                name: formatName(person.name), // Use formatted name for all roles
                fullName: formatName(person.name),
                score: person.position_info?.role === 'director' 
                  ? getDirectorAverageScore(person.id, selectedMonth, selectedYear)
                  : getClinicianScore(person.id, selectedMonth, selectedYear),
                position: person.position_info?.position_title || (person.position_info?.role === 'director' ? 'Director' : 'Clinician'),
                role: person.position_info?.role || 'clinician',
                isDirector: person.position_info?.role === 'director'
              }))}>
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
                  {(user?.role === 'super-admin' ? userDirectors : userClinicians).map((person, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={person.position_info?.role === 'director' ? '#8b5cf6' : '#3b82f6'} 
                    />
                  ))}
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
              <BarChart data={[
                {
                  range: '90-100%',
                  label: 'Excellent',
                  count: userClinicians.filter(c => {
                    const score = c.position_info?.role === 'director' 
                      ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                      : getClinicianScore(c.id, selectedMonth, selectedYear);
                    return score >= 90;
                  }).length,
                  color: '#10b981'
                },
                {
                  range: '80-89%',
                  label: 'Good',
                  count: userClinicians.filter(c => {
                    const score = c.position_info?.role === 'director' 
                      ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                      : getClinicianScore(c.id, selectedMonth, selectedYear);
                    return score >= 80 && score < 90;
                  }).length,
                  color: '#3b82f6'
                },
                {
                  range: '70-79%',
                  label: 'Average',
                  count: userClinicians.filter(c => {
                    const score = c.position_info?.role === 'director' 
                      ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                      : getClinicianScore(c.id, selectedMonth, selectedYear);
                    return score >= 70 && score < 80;
                  }).length,
                  color: '#f59e0b'
                },
                {
                  range: '0-69%',
                  label: 'Needs Improvement',
                  count: userClinicians.filter(c => {
                    const score = c.position_info?.role === 'director' 
                      ? getDirectorAverageScore(c.id, selectedMonth, selectedYear)
                      : getClinicianScore(c.id, selectedMonth, selectedYear);
                    return score < 70;
                  }).length,
                  color: '#ef4444'
                }
              ]}>
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
                    `${value} staff member${value !== 1 ? 's' : ''}`, 
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
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Team Performance Trend</h3>
              <p className="text-xs sm:text-sm text-gray-600">Average team performance over last 6 months</p>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">6-Month Trend</span>
              <span className="sm:hidden">6M Trend</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(() => {
                const trendData = [];
                const currentDate = new Date();
                
                for (let i = 5; i >= 0; i--) {
                  const date = new Date();
                  date.setMonth(currentDate.getMonth() - i);
                  const month = date.toLocaleString('default', { month: 'long' });
                  const year = date.getFullYear();
                  
                  const monthlyScores = userClinicians.map(c => 
                    c.position_info?.role === 'director' 
                      ? getDirectorAverageScore(c.id, month, year)
                      : getClinicianScore(c.id, month, year)
                  );
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
              })()}>
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
                    return dataPoint ? `${dataPoint.fullMonth} ${dataPoint.year}` : label;
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
                    {user?.role === 'super-admin' ? 'Clinicians with scores ≥ 90%' : 'Team members with scores ≥ 90%'}
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
                      ? Math.round(topPerformers.reduce((acc, c) => acc + getClinicianScore(c.id, selectedMonth, selectedYear), 0) / topPerformers.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Avg Score</div>
                </div>
              </div>
            </div>

            {topPerformers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(showAllTopPerformers ? topPerformers : topPerformers.slice(0, 6)).map((clinician) => {
              const score = getClinicianScore(clinician.id, selectedMonth, selectedYear);
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
                <p>No top performers (≥90%) found for {selectedMonth} {selectedYear}</p>
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
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Performance Review needed</h3>
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
                      ? Math.round(cliniciansNeedingAttention.reduce((acc, c) => acc + getClinicianScore(c.id, selectedMonth, selectedYear), 0) / cliniciansNeedingAttention.length)
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
                const score = getClinicianScore(clinician.id, selectedMonth, selectedYear);
                const monthlyData = generateMonthlyScoreData(clinician.id);
                const trend = calculateTrend(monthlyData);
                const reviews = getClinicianReviews(clinician.id).filter(r => r.month === selectedMonth && r.year === selectedYear);
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
                <p className="text-sm mt-1">All team members are performing above 70% for {selectedMonth} {selectedYear}</p>
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
                  {selectedMonth} {selectedYear} Performance
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
                        const kpiReviews = filterReviewsByUserRole(reviewItems.filter(review => {
                          const reviewDate = new Date(review.date);
                          const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
                          const reviewYear = reviewDate.getFullYear();
                          return review.kpi === kpi.id && 
                                 reviewMonth === selectedMonth && 
                                 reviewYear === selectedYear;
                        }));
                        return kpiReviews.length > 0;
                      });
                      
                      return kpisWithReviews.length > 0 ? Math.round(
                        kpisWithReviews.reduce((acc, kpi) => {
                          const kpiReviews = filterReviewsByUserRole(reviewItems.filter(review => {
                            const reviewDate = new Date(review.date);
                            const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
                            const reviewYear = reviewDate.getFullYear();
                            return review.kpi === kpi.id && 
                                   reviewMonth === selectedMonth && 
                                   reviewYear === selectedYear;
                          }));
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
                      const kpiReviews = filterReviewsByUserRole(reviewItems.filter(review => {
                        const reviewDate = new Date(review.date);
                        const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
                        const reviewYear = reviewDate.getFullYear();
                        return review.kpi === kpi.id && 
                               reviewMonth === selectedMonth && 
                               reviewYear === selectedYear;
                      }));
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
                // Get all reviews for this KPI in the selected month, filtered by user role and approved clinicians
                const kpiReviews = filterReviewsByUserRole(reviewItems.filter(review => {
                  const reviewDate = new Date(review.date);
                  const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
                  const reviewYear = reviewDate.getFullYear();
                  return review.kpi === kpi.id && 
                         reviewMonth === selectedMonth && 
                         reviewYear === selectedYear;
                }));
                
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
                        <p className="text-sm">No reviews completed for this KPI in {selectedMonth} {selectedYear}</p>
                      </div>
                    )}
                  </div>
                );
              }).filter(Boolean)}
              
              {/* Show message if no KPIs have reviews from approved clinicians */}
              {kpis.every(kpi => {
                const kpiReviews = filterReviewsByUserRole(reviewItems.filter(review => {
                  const reviewDate = new Date(review.date);
                  const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
                  const reviewYear = reviewDate.getFullYear();
                  return review.kpi === kpi.id && 
                         reviewMonth === selectedMonth && 
                         reviewYear === selectedYear;
                }));
                return kpiReviews.length === 0;
              }) && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-700">No KPI Reviews Available</p>
                  <p className="text-sm mt-1">No reviews from approved clinicians found for {selectedMonth} {selectedYear}</p>
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