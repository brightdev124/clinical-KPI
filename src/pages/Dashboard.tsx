import React from 'react';
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
  CheckCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { clinicians, kpis, getClinicianScore, getClinicianReviews } = useData();

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  // Filter clinicians based on user role
  const userClinicians = user?.role === 'admin' 
    ? clinicians 
    : user?.role === 'clinical_director'
    ? clinicians.filter(c => user?.assignedClinicians?.includes(c.id))
    : clinicians.filter(c => c.id === user?.id);

  // Calculate stats
  const totalClinicians = userClinicians.length;
  const totalKPIs = kpis.length;
  const avgScore = userClinicians.length > 0 
    ? Math.round(userClinicians.reduce((acc, c) => acc + getClinicianScore(c.id, currentMonth, currentYear), 0) / userClinicians.length)
    : 0;

  // Get clinicians needing attention (score < 70)
  const cliniciansNeedingAttention = userClinicians.filter(c => 
    getClinicianScore(c.id, currentMonth, currentYear) < 70
  );

  // Top performers (score >= 90)
  const topPerformers = userClinicians.filter(c => 
    getClinicianScore(c.id, currentMonth, currentYear) >= 90
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
          action: review.met ? `${kpi?.name} - Target Met` : `${kpi?.name} - Improvement Plan`,
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

  // Clinician-specific dashboard
  if (user?.role === 'clinician') {
    const myScore = getClinicianScore(user.id, currentMonth, currentYear);
    const myReviews = getClinicianReviews(user.id);
    const myData = clinicians.find(c => c.id === user.id);

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
                Your performance overview for {currentMonth} {currentYear}
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{myScore}%</div>
              <div className="text-green-100 text-sm">Your Score</div>
            </div>
          </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My KPI Performance</h3>
            <div className="space-y-4">
              {kpis.map(kpi => {
                const kpiReviews = myReviews.filter(r => r.kpiId === kpi.id);
                const metCount = kpiReviews.filter(r => r.met).length;
                const percentage = kpiReviews.length > 0 ? Math.round((metCount / kpiReviews.length) * 100) : 0;
                
                return (
                  <div key={kpi.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{kpi.name}</span>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'kpi_met' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {activity.type === 'kpi_met' ? 
                      <CheckCircle className="w-4 h-4 text-green-600" /> : 
                      <Clock className="w-4 h-4 text-yellow-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                    {activity.notes && (
                      <p className="text-xs text-gray-600 mt-1">{activity.notes}</p>
                    )}
                    {activity.plan && (
                      <p className="text-xs text-blue-600 mt-1"><strong>Plan:</strong> {activity.plan}</p>
                    )}
                  </div>
                </div>
              ))}
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
              Here's your team performance overview for {currentMonth} {currentYear}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clinicians</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalClinicians}</p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Month Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentMonth} {currentYear} Performance
                </h3>
              </div>
              <Link
                to="/analytics"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
              >
                View All Analytics
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {userClinicians.map((clinician) => {
                const score = getClinicianScore(clinician.id, currentMonth, currentYear);
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
                        <p className="text-sm text-gray-600">{clinician.position} • {clinician.department}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full ${scoreColorClass}`}>
                        <span className="text-sm font-medium">
                          {score}%
                        </span>
                      </div>
                      {score >= 90 && <Award className="w-5 h-5 text-yellow-500" />}
                      <Link
                        to={`/clinician/${clinician.id}`}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to={userClinicians.length > 0 ? `/review/${userClinicians[0].id}` : '/clinicians'}
          className="group bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold mb-2">Start Review</h4>
              <p className="text-blue-100 text-sm">Conduct monthly KPI review</p>
            </div>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/clinicians"
          className="group bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold mb-2">Manage Team</h4>
              <p className="text-green-100 text-sm">View and manage clinicians</p>
            </div>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/analytics"
          className="group bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold mb-2">View Analytics</h4>
              <p className="text-purple-100 text-sm">Performance insights</p>
            </div>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;