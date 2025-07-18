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
  
  // Find the clinician profile from the profiles array
  const clinician = profiles.find(p => p.id === id && p.position_info?.role === 'clinician');
  const reviews = getClinicianReviews(id || '');
  
  if (!clinician) {
    return <div>Clinician not found</div>;
  }

  // Generate performance data for the last 12 months
  const performanceData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleString('default', { month: 'short' });
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const score = getClinicianScore(clinician.id, monthName, year);
    
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
  const currentScore = getClinicianScore(clinician.id, currentMonth, currentYear);

  const handleDownloadSummary = () => {
    const monthlyScores = performanceData.map(data => ({
      month: data.month,
      year: data.year,
      score: data.score
    }));
    
    generateClinicianSummaryPDF(clinician, kpis, monthlyScores, reviews);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {formatName(clinician.name).split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formatName(clinician.name)}</h1>
              <p className="text-gray-600">{clinician.position}</p>
              <p className="text-gray-600">{clinician.department}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{currentScore}%</div>
            <div className="text-sm text-gray-600">Current Score</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{clinician.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Since {new Date(clinician.startDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{clinician.department}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <Link
          to={`/review/${clinician.id}`}
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

      {/* Recent Reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
        <div className="space-y-4">
          {reviews.slice(0, 5).map((review) => {
            const kpi = kpis.find(k => k.id === review.kpiId);
            return (
              <div key={review.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{kpi?.title}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{review.month} {review.year}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      review.met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {review.met ? 'Met' : 'Not Met'}
                    </span>
                  </div>
                </div>
                {review.notes && (
                  <p className="text-sm text-gray-600 mt-2">{review.notes}</p>
                )}
                {review.plan && (
                  <p className="text-sm text-blue-600 mt-2"><strong>Plan:</strong> {review.plan}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClinicianProfile;