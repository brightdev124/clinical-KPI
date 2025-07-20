import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useNameFormatter } from '../utils/nameFormatter';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { User, Mail, Calendar, MapPin, TrendingUp, ClipboardList, Target, Download } from 'lucide-react';
import { generateClinicianSummaryPDF } from '../utils/pdfGenerator';

const ClinicianProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profiles, kpis, getClinicianScore, getClinicianReviews } = useData();
  const formatName = useNameFormatter();
  
  // Find the staff member profile from the profiles array (clinician or director)
  const staffMember = profiles.find(p => p.id === id && (p.position_info?.role === 'clinician' || p.position_info?.role === 'director'));
  const reviews = getClinicianReviews(id || '');
  const isDirector = staffMember?.position_info?.role === 'director';
  
  if (!staffMember) {
    return <div>Staff member not found</div>;
  }

  // Generate performance data for the last 12 months
  const performanceData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleString('default', { month: 'short' });
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const score = getClinicianScore(staffMember.id, monthName, year);
    
    return {
      month,
      monthName,
      score,
      year,
    };
  }).reverse();

  // KPI performance breakdown
  const kpiPerformance = kpis.map(kpi => {
    const kpiReviews = reviews.filter(r => r.kpiId === kpi.id);
    const metCount = kpiReviews.filter(r => r.met).length;
    const totalCount = kpiReviews.length;
    const percentage = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;
    
    return {
      title: kpi.title,
      percentage,
      weight: kpi.weight,
      met: metCount,
      total: totalCount,
    };
  });

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const currentScore = getClinicianScore(staffMember.id, currentMonth, currentYear);

  const handleDownloadSummary = () => {
    try {
      const monthlyScores = performanceData.map(data => ({
        month: data.month,
        year: data.year,
        score: data.score
      }));
      
      // Map staffMember data to match the expected Clinician interface
      const clinicianData = {
        id: staffMember.id,
        name: staffMember.name, // Use full name without formatting
        email: staffMember.username, // Use username instead of fake email
        position: staffMember.position_info?.position_title || (isDirector ? 'Director' : 'Clinician'),
        department: isDirector 
          ? staffMember.director_info?.direction || 'General Direction'
          : staffMember.clinician_info?.type_info?.title || 'General',
        assignedDirector: '', // This would need to be fetched if needed
        startDate: staffMember.created_at
      };
      
      generateClinicianSummaryPDF(clinicianData, kpis, monthlyScores, reviews);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className={`w-20 h-20 ${isDirector ? 'bg-purple-600' : 'bg-blue-600'} rounded-full flex items-center justify-center`}>
              <span className="text-white text-2xl font-bold">
                {staffMember.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{staffMember.name}</h1>
                {isDirector && (
                  <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                    Director
                  </span>
                )}
              </div>
              <p className="text-gray-600">{staffMember.position_info?.position_title}</p>
              <p className="text-gray-600">
                {isDirector 
                  ? staffMember.director_info?.direction || 'General Direction'
                  : staffMember.clinician_info?.type_info?.title || 'General'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{currentScore}%</div>
            <div className="text-sm text-gray-600">Current Score</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Username: {staffMember.username}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Since {new Date(staffMember.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {isDirector 
                ? staffMember.director_info?.direction || 'General Direction'
                : staffMember.clinician_info?.type_info?.title || 'General'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <Link
          to={`/review/${staffMember.id}`}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <ClipboardList className="w-4 h-4" />
          <span>New Review</span>
        </Link>

        <button
          onClick={handleDownloadSummary}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Summary</span>
        </button>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">12-Month Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Performance Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">KPI Performance Breakdown</h3>
        <div className="space-y-4">
          {kpiPerformance.map((kpi, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">{kpi.title}</span>
                  <span className="text-xs text-gray-500">Weight: {kpi.weight}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{kpi.percentage}%</span>
                  <span className="text-sm text-gray-600 ml-2">({kpi.met}/{kpi.total})</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${kpi.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default ClinicianProfile;