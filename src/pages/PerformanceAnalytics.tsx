import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Target, Calendar, Filter } from 'lucide-react';
import { EnhancedSelect } from '../components/UI';

const PerformanceAnalytics: React.FC = () => {
  const { profiles, kpis, getClinicianScore, getAssignedClinicians } = useData();
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState('12months');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Filter clinicians based on user role - use profiles data (already filtered by accept: true)
  const userClinicians = user?.role === 'super-admin' 
    ? profiles.filter(p => p.position_info?.role === 'clinician')
    : user?.role === 'director'
    ? getAssignedClinicians(user.id)
    : [];

  // Get unique departments
  const departments = [...new Set(userClinicians.map(c => c.department))];

  // Filter by department
  const filteredClinicians = selectedDepartment === 'all' 
    ? userClinicians 
    : userClinicians.filter(c => c.department === selectedDepartment);

  // Generate trend data
  const generateTrendData = () => {
    const months = selectedTimeframe === '6months' ? 6 : 12;
    return Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'short' });
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      
      const scores = filteredClinicians.map(c => getClinicianScore(c.id, monthName, year));
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      
      return {
        month,
        avgScore,
        year,
      };
    }).reverse();
  };

  const trendData = generateTrendData();

  // Department performance
  const departmentPerformance = departments.map(dept => {
    const deptClinicians = userClinicians.filter(c => c.department === dept);
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    
    const scores = deptClinicians.map(c => getClinicianScore(c.id, currentMonth, currentYear));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    return {
      name: dept,
      score: avgScore,
      clinicians: deptClinicians.length,
    };
  });

  // Score distribution
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const scoreDistribution = [
    { name: 'Excellent (90-100%)', value: 0, color: '#10B981' },
    { name: 'Good (80-89%)', value: 0, color: '#3B82F6' },
    { name: 'Average (70-79%)', value: 0, color: '#F59E0B' },
    { name: 'Below Average (<70%)', value: 0, color: '#EF4444' },
  ];

  filteredClinicians.forEach(c => {
    const score = getClinicianScore(c.id, currentMonth, currentYear);
    if (score >= 90) scoreDistribution[0].value++;
    else if (score >= 80) scoreDistribution[1].value++;
    else if (score >= 70) scoreDistribution[2].value++;
    else scoreDistribution[3].value++;
  });

  // KPI performance across all clinicians
  const kpiAnalytics = kpis.map(kpi => {
    let totalReviews = 0;
    let metReviews = 0;
    
    filteredClinicians.forEach(c => {
      // Mock calculation - in real app, this would query actual reviews
      totalReviews += 3; // Assume 3 reviews per clinician per KPI
      metReviews += Math.floor(Math.random() * 4); // Random met count for demo
    });
    
    return {
      name: kpi.title,
      percentage: totalReviews > 0 ? Math.round((metReviews / totalReviews) * 100) : 0,
      weight: kpi.weight,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive performance insights and trends</p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="min-w-[200px]">
            <EnhancedSelect
              value={selectedDepartment}
              onChange={(value) => setSelectedDepartment(value as string)}
              options={[
                { value: 'all', label: 'All Departments' },
                ...departments.map(dept => ({ value: dept, label: dept }))
              ]}
              icon={<Filter className="w-4 h-4" />}
              variant="gradient"
              size="sm"
              placeholder="Select department..."
              customDropdown={true}
              searchable={true}
              clearable={true}
            />
          </div>
          <div className="min-w-[180px]">
            <EnhancedSelect
              value={selectedTimeframe}
              onChange={(value) => setSelectedTimeframe(value as string)}
              options={[
                { value: '6months', label: 'Last 6 Months' },
                { value: '12months', label: 'Last 12 Months' }
              ]}
              icon={<Calendar className="w-4 h-4" />}
              variant="filled"
              size="sm"
              placeholder="Select timeframe..."
              customDropdown={true}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold text-gray-900">{filteredClinicians.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(filteredClinicians.reduce((acc, c) => acc + getClinicianScore(c.id, currentMonth, currentYear), 0) / filteredClinicians.length || 0)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Performers</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredClinicians.filter(c => getClinicianScore(c.id, currentMonth, currentYear) >= 90).length}
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Need Attention</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredClinicians.filter(c => getClinicianScore(c.id, currentMonth, currentYear) < 70).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="avgScore" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Department Performance and Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={scoreDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {scoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* KPI Performance Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">KPI Performance Analysis</h3>
        <div className="space-y-4">
          {kpiAnalytics.map((kpi, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{kpi.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Weight: {kpi.weight}</span>
                  <span className="text-lg font-semibold text-gray-900">{kpi.percentage}%</span>
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

export default PerformanceAnalytics;