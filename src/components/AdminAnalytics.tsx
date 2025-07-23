import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useNameFormatter } from '../utils/nameFormatter';
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
  EyeOff,
  ChevronLeft,
  ChevronUp,
  ArrowUpDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { MonthYearPicker } from './UI';

interface AdminAnalyticsProps {
  className?: string;
}

const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ className = '' }) => {
  const { profiles, getClinicianScore, getAssignedClinicians, getAssignedDirectors, loading } = useData();
  const formatName = useNameFormatter();

  // State for controls
  const [userType, setUserType] = useState<'director' | 'clinician'>('clinician');
  const [startMonth, setStartMonth] = useState<string>('');
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<string>('');
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [viewType, setViewType] = useState<'table' | 'chart'>('table');
  const [showSidebar, setShowSidebar] = useState(true);
  
  // State for MonthYearPicker dropdowns
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  
  // State for sidebar
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedDirectors, setExpandedDirectors] = useState<Set<string>>(new Set());
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // State for sorting
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Initialize months
  useEffect(() => {
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(currentDate.getMonth() - 3);
    const startMonthName = threeMonthsAgo.toLocaleDateString('en-US', { month: 'long' });
    const startYearValue = threeMonthsAgo.getFullYear();
    
    setStartMonth(startMonthName);
    setStartYear(startYearValue);
    setEndMonth(currentMonthName);
    setEndYear(currentYear);
  }, []);

  // Calculate director's average score based on assigned members
  const getDirectorAverageScore = (directorId: string, month: string, year: number): number => {
    const assignedClinicians = getAssignedClinicians(directorId);
    const assignedDirectors = getAssignedDirectors(directorId);
    const allAssignedMembers = [...assignedClinicians, ...assignedDirectors];
    
    if (allAssignedMembers.length === 0) {
      return 0; // No assigned members
    }
    
    const scores = allAssignedMembers.map(member => {
      // For both assigned directors and clinicians, get their individual clinician score
      return getClinicianScore(member.id, month, year);
    });
    
    const validScores = scores.filter(score => score > 0);
    if (validScores.length === 0) {
      return 0;
    }
    
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  };

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

  // Group clinicians and directors by director
  const getCliniciansByDirector = () => {
    const directors = getDirectors();
    
    return directors.map(director => ({
      director,
      clinicians: [...getAssignedClinicians(director.id), ...getAssignedDirectors(director.id)]
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

  // Handle director selection (select all clinicians and directors under director)
  const handleDirectorSelect = (directorId: string) => {
    const assignedUsers = [...getAssignedClinicians(directorId), ...getAssignedDirectors(directorId)];
    const newSelected = new Set(selectedUsers);
    
    const allSelected = assignedUsers.every(u => newSelected.has(u.id));
    
    if (allSelected) {
      // Deselect all users under this director
      assignedUsers.forEach(u => newSelected.delete(u.id));
    } else {
      // Select all users under this director
      assignedUsers.forEach(u => newSelected.add(u.id));
    }
    
    setSelectedUsers(newSelected);
  };

  // Generate chart data for selected users
  const generateChartData = () => {
    if (!startMonth || !endMonth || selectedUsers.size === 0) return [];

    const data = [];
    
    // Convert month names to numbers
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const startMonthNum = months.indexOf(startMonth) + 1;
    const endMonthNum = months.indexOf(endMonth) + 1;
    
    // Create current date starting from start month
    let currentYear = startYear;
    let currentMonth = startMonthNum;
    
    // Generate monthly data points - include both start and end months
    while (
      currentYear < endYear || 
      (currentYear === endYear && currentMonth <= endMonthNum)
    ) {
      // Create date object for current iteration
      const current = new Date(currentYear, currentMonth - 1, 1); // month is 0-indexed in Date constructor
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
          let score;
          if (userType === 'director' && user.position_info?.role === 'director') {
            score = getDirectorAverageScore(userId, monthStr, year);
          } else {
            score = getClinicianScore(userId, monthStr, year);
          }
          console.log(`Score for ${user.name} in ${monthStr} ${year}:`, score);
          monthData[user.name] = score;
        }
      });

      data.push(monthData);
      
      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    console.log('Generated chart data:', data);
    return data;
  };

  // Sort table data
  const sortTableData = (data: any[]) => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      let aValue, bValue;

      if (sortColumn === 'user') {
        aValue = a.user.name.toLowerCase();
        bValue = b.user.name.toLowerCase();
      } else {
        // Sorting by month column
        aValue = a[sortColumn] || 0;
        bValue = b[sortColumn] || 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Generate table data for selected users
  const generateTableData = () => {
    if (!startMonth || !endMonth || selectedUsers.size === 0) return [];

    const selectedUserProfiles = Array.from(selectedUsers)
      .map(id => profiles.find(p => p.id === id))
      .filter(Boolean);

    return selectedUserProfiles.map(user => {
      const monthlyScores: any = { user };
      
      // Convert month names to numbers
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const startMonthNum = months.indexOf(startMonth) + 1;
      const endMonthNum = months.indexOf(endMonth) + 1;
      
      // Create current date starting from start month
      let currentYear = startYear;
      let currentMonth = startMonthNum;
      
      // Generate monthly data points - include both start and end months
      while (
        currentYear < endYear || 
        (currentYear === endYear && currentMonth <= endMonthNum)
      ) {
        // Create date object for current iteration
        const current = new Date(currentYear, currentMonth - 1, 1); // month is 0-indexed in Date constructor
        const monthStr = current.toLocaleDateString('en-US', { month: 'long' });
        const year = current.getFullYear();
        const monthKey = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        if (userType === 'director' && user!.position_info?.role === 'director') {
          monthlyScores[monthKey] = getDirectorAverageScore(user!.id, monthStr, year);
        } else {
          monthlyScores[monthKey] = getClinicianScore(user!.id, monthStr, year);
        }
        
        // Move to next month
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }

      return monthlyScores;
    });
  };

  const chartData = generateChartData();
  const tableData = generateTableData();
  const sortedTableData = sortTableData(tableData);

  // Pagination logic
  const totalItems = sortedTableData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTableData = sortedTableData.slice(startIndex, endIndex);

  // Reset to first page and clear sorting when data changes
  useEffect(() => {
    setCurrentPage(1);
    setSortColumn('');
    setSortDirection('asc');
  }, [selectedUsers, startMonth, startYear, endMonth, endYear]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Sorting handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // MonthYearPicker handlers
  const handleStartMonthSelect = (month: string, year: number) => {
    setStartMonth(month);
    setStartYear(year);
    setStartPickerOpen(false);
  };

  const handleEndMonthSelect = (month: string, year: number) => {
    setEndMonth(month);
    setEndYear(year);
    setEndPickerOpen(false);
  };

  // Generate colors for chart lines
  const getLineColor = (index: number) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  // Render sort icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
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
            <MonthYearPicker
              selectedMonth={startMonth}
              selectedYear={startYear}
              onSelect={handleStartMonthSelect}
              isOpen={startPickerOpen}
              onToggle={() => setStartPickerOpen(!startPickerOpen)}
            />
            <span className="text-gray-500">to</span>
            <MonthYearPicker
              selectedMonth={endMonth}
              selectedYear={endYear}
              onSelect={handleEndMonthSelect}
              isOpen={endPickerOpen}
              onToggle={() => setEndPickerOpen(!endPickerOpen)}
            />
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
                          {formatName(director.name)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Director • {clinicians.length} assigned users
                        </div>
                      </div>
                    </div>

                    {/* Assigned users under director */}
                    {expandedDirectors.has(director.id) && (
                      <div className="ml-6 space-y-1">
                        {filterUsers(clinicians).map(user => (
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
                                {formatName(user.name)}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {user.username} • {user.position_info?.role === 'director' ? 'Director' : 'Clinician'}
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
                        {formatName(user.name)}
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
            <div className="space-y-4">
              {/* Table Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                  </span>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <label className="text-sm text-gray-700">entries</label>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('user')}
                          className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                        >
                          <span>User</span>
                          {renderSortIcon('user')}
                        </button>
                      </th>
                      {chartData.map(monthData => (
                        <th key={monthData.month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort(monthData.month)}
                            className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                          >
                            <span>{monthData.month}</span>
                            {renderSortIcon(monthData.month)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedTableData.map((row, index) => (
                      <tr key={row.user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatName(row.user.name)}</div>
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Show first page, last page, current page, and pages around current page
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1);
                      
                      if (!showPage) {
                        // Show ellipsis for gaps
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-3 py-2 text-sm text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
                    formatter={(value: any, name: string) => [`${value}%`, formatName(name)]}
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