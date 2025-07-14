import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { generateMonthlyDataPDF } from '../utils/pdfGenerator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { clinicians, kpis, getClinicianScore, getClinicianReviews, profiles, getAssignedClinicians, getClinicianDirector, loading, error } = useData();

  // Month selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const monthSelectorRef = useRef<HTMLDivElement>(null);

  // View mode state for admin dashboard
  const [viewMode, setViewMode] = useState<'overview' | 'all-clinicians' | 'all-directors'>('overview');

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  // Generate available months (last 12 months)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: date.toLocaleString('default', { month: 'long' }),
      year: date.getFullYear(),
      value: `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`
    };
  });

  // Click outside handler for month selector
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(event.target as Node)) {
        setShowMonthSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate monthly score data for charts
  const generateMonthlyScoreData = (clinicianId: string) => {
    const monthlyData = [];
    const currentDate = new Date();
    
    // Get last 12 months of data
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
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
  };

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

  // Filter clinicians based on user role - use profiles data instead of mock clinicians
  const userClinicians = user?.role === 'super-admin' 
    ? profiles.filter(p => p.position_info?.role === 'clinician' || p.position_info?.role === 'director')
    : user?.role === 'director'
    ? getAssignedClinicians(user.id)
    : profiles.filter(p => p.id === user?.id && p.position_info?.role === 'clinician');

  // Calculate stats for selected month
  const totalTeamMembers = userClinicians.length;
  const totalKPIs = kpis.length;
  const avgScore = userClinicians.length > 0 
    ? Math.round(userClinicians.reduce((acc, c) => acc + getClinicianScore(c.id, selectedMonth, selectedYear), 0) / userClinicians.length)
    : 0;

  // Get clinicians needing attention (score < 70)
  const cliniciansNeedingAttention = userClinicians.filter(c => 
    getClinicianScore(c.id, selectedMonth, selectedYear) < 70
  );

  // Top performers (score >= 90)
  const topPerformers = userClinicians.filter(c => 
    getClinicianScore(c.id, selectedMonth, selectedYear) >= 90
  );

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
      // For directors and admins, show team activity
      return [
        {
          id: 1,
          type: 'review_completed',
          clinician: 'Dr. Emily Rodriguez',
          action: 'Monthly review completed',
          time: '2 hours ago',
          score: 85
        },
        {
          id: 2,
          type: 'kpi_updated',
          clinician: 'Dr. James Wilson',
          action: 'KPI target achieved',
          time: '4 hours ago',
          score: 92
        },
        {
          id: 3,
          type: 'improvement_plan',
          clinician: 'Dr. Lisa Thompson',
          action: 'Improvement plan created',
          time: '1 day ago',
          score: 68
        }
      ];
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

  // Helper functions to get all clinicians and directors
  const getAllClinicians = () => {
    return profiles.filter(p => p.position_info?.role === 'clinician');
  };

  const getAllDirectors = () => {
    return profiles.filter(p => p.position_info?.role === 'director');
  };

  // Clinician-specific dashboard
  if (user?.role === 'clinician') {
    const myScore = getClinicianScore(user.id, selectedMonth, selectedYear);
    const myReviews = getClinicianReviews(user.id);
    const myData = profiles.find(p => p.id === user.id);
    const myDirector = getClinicianDirector(user.id);

    return (
      <div className="space-y-8">
        {/* Welcome Header for Clinician */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome, {user?.name?.split(' ')[0]}! 👩‍⚕️
              </h1>
              <p className="text-green-100 text-lg">
                Your performance overview for {selectedMonth} {selectedYear}
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{myScore}%</div>
              <div className="text-green-100 text-sm">Your Score</div>
            </div>
          </div>
        </div>

        {/* Month Selector and Download Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">View Data By Month</h3>
              <div className="relative" ref={monthSelectorRef}>
                <button
                  onClick={() => setShowMonthSelector(!showMonthSelector)}
                  className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{selectedMonth} {selectedYear}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showMonthSelector && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {availableMonths.map((monthData, index) => (
                        <button
                          key={index}
                          onClick={() => handleMonthSelect(monthData.month, monthData.year)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                            selectedMonth === monthData.month && selectedYear === monthData.year
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {monthData.value}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleDownloadMonthlyData}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download {selectedMonth} Data</span>
            </button>
          </div>
        </div>

        {/* Monthly Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Trend</h3>
              <p className="text-sm text-gray-600">Your monthly performance scores over the last 12 months</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Chart Type Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('line')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
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
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartType === 'bar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Bar</span>
                </button>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>12-Month View</span>
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={generateMonthlyScoreData(user.id)}>
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
                      const dataPoint = generateMonthlyScoreData(user.id).find(d => d.displayName === label);
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
                <BarChart data={generateMonthlyScoreData(user.id)}>
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
                      const dataPoint = generateMonthlyScoreData(user.id).find(d => d.displayName === label);
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
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Current Month</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{myScore}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">12-Month Average</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {Math.round(generateMonthlyScoreData(user.id).reduce((sum, data) => sum + data.score, 0) / 12)}%
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Best Month</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {Math.max(...generateMonthlyScoreData(user.id).map(d => d.score))}%
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                {(() => {
                  const trend = calculateTrend(generateMonthlyScoreData(user.id));
                  const TrendIcon = trend.direction === 'up' ? ArrowUp : trend.direction === 'down' ? ArrowDown : Activity;
                  const trendColor = trend.direction === 'up' ? 'text-green-600' : trend.direction === 'down' ? 'text-red-600' : 'text-orange-600';
                  return <TrendIcon className={`w-4 h-4 ${trendColor}`} />;
                })()}
                <span className="text-sm font-medium text-gray-700">Monthly Trend</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {(() => {
                  const trend = calculateTrend(generateMonthlyScoreData(user.id));
                  if (trend.direction === 'stable') return 'Stable';
                  return `${trend.direction === 'up' ? '+' : '-'}${trend.percentage.toFixed(1)}%`;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Director Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {myDirector ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Director</h3>
                  <p className="text-2xl font-bold text-gray-900">{myDirector.name}</p>
                  <p className="text-sm text-gray-600">
                    {myDirector.position_info?.position_title || 'Clinical Director'}
                  </p>
                  {myDirector.director_info?.direction && (
                    <p className="text-sm text-blue-600 mt-1">
                      {myDirector.director_info.direction}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Assigned
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Contact for performance discussions
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Director Assignment</h3>
                  <p className="text-xl font-medium text-gray-600">No director assigned</p>
                  <p className="text-sm text-gray-500">
                    Please contact administration for assignment
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{myScore}%</p>
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Performance tracking
                </p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reviews Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{myReviews.length}</p>
                <p className="text-sm text-gray-500 mt-1">Total reviews</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">KPIs Met</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {myReviews.filter(r => r.met).length}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  of {myReviews.length} total
                </p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* My Performance and Recent Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KPI Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My KPI Performance - {selectedMonth} {selectedYear}</h3>
            <div className="space-y-4">
              {kpis.map(kpi => {
                const kpiReviews = myReviews.filter(r => r.kpiId === kpi.id && r.month === selectedMonth && r.year === selectedYear);
                const metCount = kpiReviews.filter(r => r.met).length;
                const percentage = kpiReviews.length > 0 ? Math.round((metCount / kpiReviews.length) * 100) : 0;
                
                return (
                  <div key={kpi.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{kpi.title}</span>
                      <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reviews for {selectedMonth} {selectedYear}</h3>
            <div className="space-y-4">
              {myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear).slice(0, 5).map((review) => {
                const kpi = kpis.find(k => k.id === review.kpiId);
                return (
                  <div key={review.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      review.met ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {review.met ? 
                        <CheckCircle className="w-4 h-4 text-green-600" /> : 
                        <Clock className="w-4 h-4 text-yellow-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{kpi?.title} - {review.met ? 'Target Met' : 'Improvement Plan'}</p>
                      <p className="text-xs text-gray-500">{review.reviewDate ? `Reviewed ${new Date(review.reviewDate).toLocaleDateString()}` : `${review.month} ${review.year}`}</p>
                      {review.notes && (
                        <p className="text-xs text-gray-600 mt-1">{review.notes}</p>
                      )}
                      {review.plan && (
                        <p className="text-xs text-blue-600 mt-1"><strong>Plan:</strong> {review.plan}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {myReviews.filter(r => r.month === selectedMonth && r.year === selectedYear).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No reviews found for {selectedMonth} {selectedYear}</p>
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
              Welcome back, {user?.name?.split(' ')[0]}! 👋
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">View Team Data By Month</h3>
            <div className="relative" ref={monthSelectorRef}>
              <button
                onClick={() => setShowMonthSelector(!showMonthSelector)}
                className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>{selectedMonth} {selectedYear}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showMonthSelector && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {availableMonths.map((monthData, index) => (
                      <button
                        key={index}
                        onClick={() => handleMonthSelect(monthData.month, monthData.year)}
                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                          selectedMonth === monthData.month && selectedYear === monthData.year
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {monthData.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={handleDownloadMonthlyData}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download {selectedMonth} Team Data</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {user?.role === 'super-admin' ? 'Total Team Members' : 'Total Clinicians'}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalTeamMembers}</p>
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                Active team members
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active KPIs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalKPIs}</p>
              <p className="text-sm text-gray-500 mt-1">Across all categories</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
              <Target className="w-7 h-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{avgScore}%</p>
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                Team performance
              </p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Need Attention</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{cliniciansNeedingAttention.length}</p>
              <p className="text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Requires review
              </p>
            </div>
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* View All Buttons - Only show for super-admin */}
      {user?.role === 'super-admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">View All Users</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>Admin Controls</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setViewMode(viewMode === 'all-clinicians' ? 'overview' : 'all-clinicians')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'all-clinicians'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>
                {viewMode === 'all-clinicians' ? 'Hide All Clinicians' : 'View All Clinicians'}
              </span>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                {getAllClinicians().length}
              </span>
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'all-directors' ? 'overview' : 'all-directors')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'all-directors'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Target className="w-5 h-5" />
              <span>
                {viewMode === 'all-directors' ? 'Hide All Directors' : 'View All Directors'}
              </span>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                {getAllDirectors().length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* All Clinicians View */}
      {viewMode === 'all-clinicians' && user?.role === 'super-admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">All Clinicians</h3>
                <p className="text-sm text-gray-600">Performance scores for {selectedMonth} {selectedYear}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getAllClinicians().length}</div>
              <div className="text-xs text-gray-500">Total Clinicians</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAllClinicians().map((clinician) => {
              const score = getClinicianScore(clinician.id, selectedMonth, selectedYear);
              const scoreColorClass = getScoreColor(score);
              const borderColorClass = getScoreBorderColor(score);
              const monthlyData = generateMonthlyScoreData(clinician.id);
              const trend = calculateTrend(monthlyData);
              
              return (
                <div key={clinician.id} className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border ${borderColorClass} hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {clinician.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${scoreColorClass}`}>
                      <span className="text-sm font-medium">{score}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{clinician.name}</h4>
                    <p className="text-xs text-gray-600">
                      {clinician.position_info?.position_title || 'Clinician'} • 
                      {clinician.clinician_info?.type_info?.title || 'General'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      {trend.direction === 'up' ? (
                        <ArrowUp className="w-3 h-3 text-green-600" />
                      ) : trend.direction === 'down' ? (
                        <ArrowDown className="w-3 h-3 text-red-600" />
                      ) : (
                        <Activity className="w-3 h-3 text-gray-600" />
                      )}
                      <span className={`font-medium ${
                        trend.direction === 'up' ? 'text-green-600' : 
                        trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {trend.direction === 'stable' ? 'Stable' : `${trend.direction === 'up' ? '+' : '-'}${trend.percentage.toFixed(1)}%`}
                      </span>
                    </div>
                    {score >= 90 && <Award className="w-4 h-4 text-yellow-500" />}
                  </div>
                </div>
              );
            })}
          </div>
          
          {getAllClinicians().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No clinicians found in the system</p>
            </div>
          )}
        </div>
      )}

      {/* All Directors View */}
      {viewMode === 'all-directors' && user?.role === 'super-admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">All Directors</h3>
                <p className="text-sm text-gray-600">Performance scores for {selectedMonth} {selectedYear}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{getAllDirectors().length}</div>
              <div className="text-xs text-gray-500">Total Directors</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAllDirectors().map((director) => {
              const score = getClinicianScore(director.id, selectedMonth, selectedYear);
              const scoreColorClass = getScoreColor(score);
              const borderColorClass = getScoreBorderColor(score);
              const monthlyData = generateMonthlyScoreData(director.id);
              const trend = calculateTrend(monthlyData);
              const assignedClinicians = getAssignedClinicians(director.id);
              
              return (
                <div key={director.id} className={`bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border ${borderColorClass} hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-violet-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {director.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${scoreColorClass}`}>
                      <span className="text-sm font-medium">{score}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{director.name}</h4>
                    <p className="text-xs text-gray-600">
                      {director.position_info?.position_title || 'Director'}
                    </p>
                    {director.director_info?.direction && (
                      <p className="text-xs text-purple-600 mt-1">
                        {director.director_info.direction}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      {trend.direction === 'up' ? (
                        <ArrowUp className="w-3 h-3 text-green-600" />
                      ) : trend.direction === 'down' ? (
                        <ArrowDown className="w-3 h-3 text-red-600" />
                      ) : (
                        <Activity className="w-3 h-3 text-gray-600" />
                      )}
                      <span className={`font-medium ${
                        trend.direction === 'up' ? 'text-green-600' : 
                        trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {trend.direction === 'stable' ? 'Stable' : `${trend.direction === 'up' ? '+' : '-'}${trend.percentage.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">{assignedClinicians.length}</span>
                      {score >= 90 && <Award className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {getAllDirectors().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No directors found in the system</p>
            </div>
          )}
        </div>
      )}

      {/* Performance Charts Section - Only show in overview mode */}
      {viewMode === 'overview' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Team Performance Overview Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Team Performance Overview</h3>
              <p className="text-sm text-gray-600">Current month performance by clinician</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>Current Month</span>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userClinicians.map(clinician => ({
                name: clinician.name.split(' ')[0], // First name only for space
                fullName: clinician.name,
                score: getClinicianScore(clinician.id, selectedMonth, selectedYear),
                position: clinician.position_info?.position_title || 'Clinician'
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                  formatter={(value: any, name: string, props: any) => [
                    `${value}%`, 
                    'Performance Score'
                  ]}
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload;
                    return data ? `${data.fullName} (${data.position})` : label;
                  }}
                />
                <Bar 
                  dataKey="score" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Distribution</h3>
              <p className="text-sm text-gray-600">Score ranges across your team</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              <span>Distribution</span>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  range: '90-100%',
                  label: 'Excellent',
                  count: userClinicians.filter(c => getClinicianScore(c.id, selectedMonth, selectedYear) >= 90).length,
                  color: '#10b981'
                },
                {
                  range: '80-89%',
                  label: 'Good',
                  count: userClinicians.filter(c => {
                    const score = getClinicianScore(c.id, selectedMonth, selectedYear);
                    return score >= 80 && score < 90;
                  }).length,
                  color: '#3b82f6'
                },
                {
                  range: '70-79%',
                  label: 'Average',
                  count: userClinicians.filter(c => {
                    const score = getClinicianScore(c.id, selectedMonth, selectedYear);
                    return score >= 70 && score < 80;
                  }).length,
                  color: '#f59e0b'
                },
                {
                  range: '0-69%',
                  label: 'Needs Improvement',
                  count: userClinicians.filter(c => getClinicianScore(c.id, selectedMonth, selectedYear) < 70).length,
                  color: '#ef4444'
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="range" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: any, name: string, props: any) => [
                    `${value} clinician${value !== 1 ? 's' : ''}`, 
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
      </div>

      {/* Trend Analysis Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Monthly Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Team Performance Trend</h3>
              <p className="text-sm text-gray-600">Average team performance over last 6 months</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>6-Month Trend</span>
            </div>
          </div>
          
          <div className="h-80">
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
                    getClinicianScore(c.id, month, year)
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
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
            </div>
          </div>

          {/* Top Performers Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Top Performers</h3>
                  <p className="text-sm text-gray-600">Clinicians and Directors with scores ≥ 90%</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{topPerformers.length}</div>
                  <div className="text-xs text-gray-500">Top Performers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {topPerformers.length > 0 
                      ? Math.round(topPerformers.reduce((acc, c) => acc + getClinicianScore(c.id, selectedMonth, selectedYear), 0) / topPerformers.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Avg Score</div>
                </div>
              </div>
            </div>

            {topPerformers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPerformers.slice(0, 6).map((clinician) => {
              const score = getClinicianScore(clinician.id, selectedMonth, selectedYear);
              const monthlyData = generateMonthlyScoreData(clinician.id);
              const trend = calculateTrend(monthlyData);
              
              return (
                <div key={clinician.id} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {clinician.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-lg font-bold text-green-600">{score}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{clinician.name}</h4>
                    <p className="text-xs text-gray-600">
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
                    <span className={`font-medium ${
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
              <div className="mt-4 text-center">
                <Link
                  to="/performance-analytics"
                  className="inline-flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  <span>View All Top Performers</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Month Performance */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedMonth} {selectedYear} Performance
                </h3>
              </div>

            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {userClinicians.map((clinician) => {
                const score = getClinicianScore(clinician.id, selectedMonth, selectedYear);
                const scoreColorClass = getScoreColor(score);
                const borderColorClass = getScoreBorderColor(score);
                
                return (
                  <div key={clinician.id} className={`flex items-center justify-between p-4 bg-gray-50 rounded-xl border ${borderColorClass} hover:shadow-sm transition-all`}>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {clinician.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{clinician.name}</p>
                        <p className="text-sm text-gray-600">
                          {clinician.position_info?.position_title || 'Clinician'} • 
                          {clinician.clinician_info?.type_info?.title || 'General'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full ${scoreColorClass}`}>
                        <span className="text-sm font-medium">
                          {score}%
                        </span>
                      </div>
                      {score >= 90 && <Award className="w-5 h-5 text-yellow-500" />}
                    </div>
                  </div>
                );
              })}
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
              {recentActivity.map((activity) => (
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
              ))}
            </div>
          </div>
            </div>
          </div>

          {/* Bottom Performers Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Performance Improvement Needed</h3>
                  <p className="text-sm text-gray-600">Clinicians and Directors with scores &lt; 70% requiring attention</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{cliniciansNeedingAttention.length}</div>
                  <div className="text-xs text-gray-500">Need Attention</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cliniciansNeedingAttention.slice(0, 4).map((clinician) => {
                const score = getClinicianScore(clinician.id, selectedMonth, selectedYear);
                const monthlyData = generateMonthlyScoreData(clinician.id);
                const trend = calculateTrend(monthlyData);
                const reviews = getClinicianReviews(clinician.id).filter(r => r.month === selectedMonth && r.year === selectedYear);
                const unmetKPIs = reviews.filter(r => !r.met).length;
                const totalKPIsForMonth = kpis.length;
                
                return (
                  <div key={clinician.id} className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {clinician.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-lg font-bold text-red-600">{score}%</span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{clinician.name}</h4>
                      <p className="text-xs text-gray-600">
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
                          <span className={`font-medium ${
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
        </>
      )}

    </div>
  );
};

export default Dashboard;