import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { 
  Users, 
  UserCheck, 
  Calendar,
  Table,
  BarChart3,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AdminAnalyticsProps {
  className?: string;
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ className = '' }) => {
  const { profiles, getClinicianScore, getAssignedClinicians, loading } = useData();

  // State for controls
  const [userType, setUserType] = useState<'director' | 'clinician'>('clinician');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [showSidebar, setShowSidebar] = useState(true);
  
  // State for sidebar
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedDirectors, setExpandedDirectors] = useState<Set<string>>(new Set());

  // Initialize months
  useEffect(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
    const startMonthValue = threeMonthsAgo.toISOString().slice(0, 7);
    
    setStartMonth(startMonthValue);
    setEndMonth(currentMonth);
  }, []);

  // Generate available months (last 12 months)
  const generateAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(currentDate.getMonth() - i);
      months.push({
        value: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      });
    }
    
    return months;
  };

  const availableMonths = generateAvailableMonths();

  // Get filtered users based on type
  const getFilteredUsers = () => {
    if (userType === 'director') {
      return profiles.filter(p => p.position_info?.role === 'director');
    } else {
      return profiles.filter(p => p.position_info?.role === 'clinician');
    }
  };

  // Get directors for clinician grouping
  const getDirectors = () => {
    return profiles.filter(p => p.position_info?.role === 'director');
  };

  // Group clinicians by director
  const getCliniciansByDirector = () => {
    const directors = getDirectors();
    const clinicians = profiles.filter(p => p.position_info?.role === 'clinician');
    
    return directors.map(director => ({
      director,
      clinicians: getAssignedClinicians(director.id)
    }));
  };

  // Filter users based on search term
  const filterUsers = (users: any[]) => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    const filtered = filterUsers(filteredUsers);
    
    if (selectedUsers.size === filtered.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filtered.map(user => user.id)));
    }
  };

  // Handle director expansion
  const handleDirectorExpand = (directorId: string) => {
    const newExpanded = new Set(expandedDirectors);
    if (newExpanded.has(directorId)) {
      newExpanded.delete(directorId);
    } else {
      newExpanded.add(directorId);
    }
    setExpandedDirectors(newExpanded);
  };

  // Handle director selection (select all clinicians under director)
  const handleDirectorSelect = (directorId: string) => {
    const clinicians = getAssignedClinicians(directorId);
    const newSelected = new Set(selectedUsers);
    
    const allSelected = clinicians.every(c => newSelected.has(c.id));
    
    if (allSelected) {
      // Deselect all clinicians under this director
      clinicians.forEach(c => newSelected.delete(c.id));
    } else {
      // Select all clinicians under this director
      clinicians.forEach(c => newSelected.add(c.id));
    }
    
    setSelectedUsers(newSelected);
  };

  // Generate chart data for selected users
  const generateChartData = () => {
    if (!startMonth || !endMonth || selectedUsers.size === 0) return [];

    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    const data = [];

    // Generate monthly data points
    const current = new Date(start);
    while (current <= end) {
      const monthStr = current.toLocaleDateString('en-US', { month: 'long' });
      const year = current.getFullYear();
      
      const monthData: any = {
        month: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        fullMonth: monthStr,
        year: year
      };

      // Calculate scores for selected users
      Array.from(selectedUsers).forEach(userId => {
        const user = profiles.find(p => p.id === userId);
        if (user) {
          const score = getClinicianScore(userId, monthStr, year);
          monthData[user.name] = score;
        }
      });

      data.push(monthData);
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  };

  // Generate table data for selected users
  const generateTableData = () => {
    if (!startMonth || !endMonth || selectedUsers.size === 0) return [];

    const selectedUserProfiles = Array.from(selectedUsers)
      .map(id => profiles.find(p => p.id === id))
      .filter(Boolean);

    return selectedUserProfiles.map(user => {
      const start = new Date(startMonth + '-01');
      const end = new Date(endMonth + '-01');
      const monthlyScores: any = { user };

      const current = new Date(start);
      while (current <= end) {
        const monthStr = current.toLocaleDateString('en-US', { month: 'long' });
        const year = current.getFullYear();
        const monthKey = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        monthlyScores[monthKey] = getClinicianScore(user!.id, monthStr, year);
        current.setMonth(current.getMonth() + 1);
      }

      return monthlyScores;
    });
  };

  const chartData = generateChartData();
  const tableData = generateTableData();

  // Generate colors for chart lines
  const getLineColor = (index: number) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Control Bar */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* User Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setUserType('director')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userType === 'director'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserCheck className="w-4 h-4 inline mr-2" />
              Director
            </button>
            <button
              onClick={() => setUserType('clinician')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userType === 'clinician'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Clinician
            </button>
          </div>

          {/* Month Selectors */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Start Month</option>
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <span className="text-gray-500">to</span>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">End Month</option>
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table className="w-4 h-4 inline mr-2" />
              Table View
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewType === 'chart'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Chart View
            </button>
          </div>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="ml-auto px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showSidebar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-gray-100 p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-50 rounded-lg mb-4"
            >
              {selectedUsers.size === filterUsers(getFilteredUsers()).length && filterUsers(getFilteredUsers()).length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium">Select All</span>
            </button>

            {/* User List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {userType === 'clinician' ? (
                // Clinician view grouped by director
                getCliniciansByDirector().map(({ director, clinicians }) => (
                  <div key={director.id} className="space-y-1">
                    {/* Director Header */}
                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                      <button
                        onClick={() => handleDirectorExpand(director.id)}
                        className="flex-shrink-0"
                      >
                        {expandedDirectors.has(director.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDirectorSelect(director.id)}
                        className="flex-shrink-0"
                      >
                        {clinicians.every(c => selectedUsers.has(c.id)) && clinicians.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {director.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Director • {clinicians.length} clinicians
                        </div>
                      </div>
                    </div>

                    {/* Clinicians under director */}
                    {expandedDirectors.has(director.id) && (
                      <div className="ml-6 space-y-1">
                        {filterUsers(clinicians).map(clinician => (
                          <button
                            key={clinician.id}
                            onClick={() => handleUserSelect(clinician.id)}
                            className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-50 rounded-lg"
                          >
                            {selectedUsers.has(clinician.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {clinician.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {clinician.username}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Director view
                filterUsers(getFilteredUsers()).map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-50 rounded-lg"
                  >
                    {selectedUsers.has(user.id) ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.username} • Director
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Data Display */}
        <div className="flex-1 p-6">
          {selectedUsers.size === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select users from the sidebar to view their performance data</p>
              </div>
            </div>
          ) : !startMonth || !endMonth ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Please select start and end months to view data</p>
              </div>
            </div>
          ) : viewType === 'table' ? (
            // Table View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    {chartData.map(monthData => (
                      <th key={monthData.month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {monthData.month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, index) => (
                    <tr key={row.user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.user.name}</div>
                        <div className="text-sm text-gray-500">{row.user.username}</div>
                      </td>
                      {chartData.map(monthData => {
                        const score = row[monthData.month] || 0;
                        return (
                          <td key={monthData.month} className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              score >= 90 ? 'bg-green-100 text-green-800' :
                              score >= 80 ? 'bg-blue-100 text-blue-800' :
                              score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {score}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Chart View
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [`${value}%`, name]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  {Array.from(selectedUsers).map((userId, index) => {
                    const user = profiles.find(p => p.id === userId);
                    if (!user) return null;
                    
                    return (
                      <Line
                        key={userId}
                        type="monotone"
                        dataKey={user.name}
                        stroke={getLineColor(index)}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;