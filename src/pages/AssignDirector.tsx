import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNameFormatter } from '../utils/nameFormatter';
import { UserPlus, UserMinus, User, Mail, Calendar, Users, X, CheckCircle, Navigation, Search, Crown } from 'lucide-react';

const AssignDirector: React.FC = () => {
  const { 
    getDirectors, 
    getAssignedClinicians, 
    getAssignedDirectors,
    getUnassignedClinicians, 
    getUnassignedDirectors,
    assignClinician, 
    unassignClinician,
    assignDirector,
    unassignDirector,
    loading,
    error,
    refreshProfiles,
    refreshAssignments,
    assignments
  } = useData();
  const { user } = useAuth();
  const formatName = useNameFormatter();

  const [selectedDirector, setSelectedDirector] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<'assign' | 'unassign' | null>(null);
  const [activeTab, setActiveTab] = useState<'clinicians' | 'directors'>('clinicians');
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const directors = getDirectors();
  const assignedClinicians = selectedDirector ? getAssignedClinicians(selectedDirector) : [];
  const assignedDirectors = selectedDirector ? getAssignedDirectors(selectedDirector) : [];
  const unassignedClinicians = getUnassignedClinicians();
  const unassignedDirectors = getUnassignedDirectors();

  // Filter clinicians based on search term
  const filteredUnassignedClinicians = unassignedClinicians.filter(clinician =>
    clinician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinician.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssignedClinicians = assignedClinicians.filter(clinician =>
    clinician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinician.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter directors based on search term and exclude the selected director
  const filteredUnassignedDirectors = unassignedDirectors.filter(director =>
    director.id !== selectedDirector && // Prevent self-assignment
    (director.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    director.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAssignedDirectors = assignedDirectors.filter(director =>
    director.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    director.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignClick = (directorId: string) => {
    setSelectedDirector(directorId);
    setSidebarMode('assign');
    setActiveTab('clinicians');
    setShowSidebar(true);
    setSearchTerm('');
  };

  const handleUnassignClick = (directorId: string) => {
    setSelectedDirector(directorId);
    setSidebarMode('unassign');
    setActiveTab('clinicians');
    setShowSidebar(true);
    setSearchTerm('');
  };

  const handleAssignClinician = async (clinicianId: string) => {
    if (!selectedDirector) return;
    
    try {
      await assignClinician(clinicianId, selectedDirector);
      console.log('Employee assigned successfully');
      // Optionally close sidebar after assignment
      // setShowSidebar(false);
    } catch (error) {
      console.error('Failed to assign Employee:', error);
      alert('Failed to assign Employee. Please try again.');
    }
  };

  const handleUnassignClinician = async (clinicianId: string) => {
    if (!selectedDirector) return;
    
    try {
      await unassignClinician(clinicianId, selectedDirector);
      console.log('Employee unassigned successfully');
      // Optionally close sidebar after unassignment
      // setShowSidebar(false);
    } catch (error) {
      console.error('Failed to unassign Employee:', error);
      alert('Failed to unassign Employee. Please try again.');
    }
  };

  const handleAssignDirector = async (directorId: string) => {
    if (!selectedDirector) return;
    
    try {
      await assignDirector(directorId, selectedDirector);
      console.log('Director assigned successfully');
      // Optionally close sidebar after assignment
      // setShowSidebar(false);
    } catch (error) {
      console.error('Failed to assign director:', error);
      alert('Failed to assign director. Please try again.');
    }
  };

  const handleUnassignDirector = async (directorId: string) => {
    if (!selectedDirector) return;
    
    try {
      await unassignDirector(directorId, selectedDirector);
      console.log('Director unassigned successfully');
      // Optionally close sidebar after unassignment
      // setShowSidebar(false);
    } catch (error) {
      console.error('Failed to unassign director:', error);
      alert('Failed to unassign director. Please try again.');
    }
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setSelectedDirector(null);
    setSidebarMode(null);
    setActiveTab('clinicians');
    setSearchTerm('');
  };

  const selectedDirectorData = directors.find(d => d.id === selectedDirector);

  // Load data on component mount
  useEffect(() => {
    refreshProfiles();
    refreshAssignments();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Directors:', directors);
    console.log('Unassigned Employees:', unassignedClinicians);
    console.log('Assignments:', assignments);
  }, [directors, unassignedClinicians, assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 font-medium mb-2">Error loading data</div>
          <div className="text-red-700">{error}</div>
          <button
            onClick={() => {
              refreshProfiles();
              refreshAssignments();
            }}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Director Assignment</h2>
            <p className="text-gray-600 mt-1">Manage Employee assignments to directors</p>
          </div>
          <button
            onClick={() => {
              refreshProfiles();
              refreshAssignments();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Directors Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {directors.length}
              </div>
              <div className="text-sm text-blue-700">Total Directors</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {directors.filter(director => 
                  getAssignedClinicians(director.id).length > 0 || 
                  getAssignedDirectors(director.id).length > 0
                ).length}
              </div>
              <div className="text-sm text-green-700">Directors with Assignments</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {directors.reduce((sum, director) => 
                  sum + getAssignedClinicians(director.id).length + getAssignedDirectors(director.id).length, 0
                )}
              </div>
              <div className="text-sm text-purple-700">Total Assignments</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {unassignedClinicians.length + unassignedDirectors.length}
              </div>
              <div className="text-sm text-orange-700">Unassigned Staff</div>
            </div>
          </div>
        </div>

        {/* Directors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directors.map((director) => {
            const assignedClinicians = getAssignedClinicians(director.id);
            const assignedDirectors = getAssignedDirectors(director.id);
            const totalAssigned = assignedClinicians.length + assignedDirectors.length;
            
            return (
              <div key={director.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {director.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      totalAssigned > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {totalAssigned} total
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{director.name}</h3>
                    <p className="text-sm text-gray-600">{director.position_info?.position_title || 'Clinical Director'}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{director.director_info?.direction || 'General'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Since {new Date(director.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Assigned Staff List */}
                  {totalAssigned > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Assigned Staff: {assignedClinicians.length} employees, {assignedDirectors.length} directors
                      </h4>
                      <div className="space-y-2">
                        {/* Show assigned directors first */}
                        {assignedDirectors.slice(0, 2).map((director) => (
                          <div key={`dir-${director.id}`} className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm text-gray-600 truncate">{director.name}</span>
                            <span className="text-xs text-purple-600 bg-purple-100 px-1 rounded">Director</span>
                          </div>
                        ))}
                        
                        {/* Show assigned clinicians */}
                        {assignedClinicians.slice(0, totalAssigned > 4 ? 1 : 3 - assignedDirectors.length).map((clinician) => (
                          <div key={`cli-${clinician.id}`} className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {clinician.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600 truncate">{clinician.name}</span>
                          </div>
                        ))}
                        
                        {totalAssigned > 3 && (
                          <div className="text-xs text-gray-500 ml-8">
                            +{totalAssigned - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {totalAssigned === 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <User className="w-4 h-4" />
                        <span className="text-sm">No staff assigned</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAssignClick(director.id)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center"
                      disabled={unassignedClinicians.length === 0 && unassignedDirectors.filter(d => d.id !== director.id).length === 0}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Assign
                    </button>
                    <button
                      onClick={() => handleUnassignClick(director.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                        totalAssigned === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                      disabled={totalAssigned === 0}
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Unassign
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {directors.length === 0 && (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Directors Found</h3>
            <p className="text-gray-600">There are no directors in the system yet.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
          <div className="flex-1" onClick={closeSidebar}></div>
          <div className="w-96 bg-white shadow-xl h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {sidebarMode === 'assign' ? 'Assign Staff' : 'Unassign Staff'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {sidebarMode === 'assign' ? 'to' : 'from'} {selectedDirectorData?.name}
                  </p>
                </div>
                <button
                  onClick={closeSidebar}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setActiveTab('clinicians');
                    setSearchTerm('');
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                    activeTab === 'clinicians'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <User className="w-4 h-4 mr-1" />
                  Employees
                </button>
                <button
                  onClick={() => {
                    setActiveTab('directors');
                    setSearchTerm('');
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                    activeTab === 'directors'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Directors
                </button>
              </div>
            </div>

            <div className="p-6">
              {sidebarMode === 'assign' ? (
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {activeTab === 'clinicians' ? (
                      <>Available unassigned employees ({filteredUnassignedClinicians.length}{searchTerm ? ` of ${unassignedClinicians.length}` : ''})</>
                    ) : (
                      <>Available unassigned directors ({filteredUnassignedDirectors.length}{searchTerm ? ` of ${unassignedDirectors.filter(d => d.id !== selectedDirector).length}` : ''})</>
                    )}
                  </div>
                  {activeTab === 'clinicians' ? (
                    filteredUnassignedClinicians.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        {searchTerm ? (
                          <div>
                            <p>No employees match your search</p>
                            <button
                              onClick={() => setSearchTerm('')}
                              className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                            >
                              Clear search
                            </button>
                          </div>
                        ) : (
                          <p>No unassigned employees available</p>
                        )}
                      </div>
                    ) : (
                      filteredUnassignedClinicians.map((clinician) => (
                        <div
                          key={clinician.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {clinician.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{clinician.name}</div>
                              <div className="text-sm text-gray-600">{clinician.username}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignClinician(clinician.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      ))
                    )
                  ) : (
                    filteredUnassignedDirectors.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Crown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        {searchTerm ? (
                          <div>
                            <p>No directors match your search</p>
                            <button
                              onClick={() => setSearchTerm('')}
                              className="text-purple-600 hover:text-purple-700 text-sm mt-2"
                            >
                              Clear search
                            </button>
                          </div>
                        ) : (
                          <p>No unassigned directors available</p>
                        )}
                      </div>
                    ) : (
                      filteredUnassignedDirectors.map((director) => (
                        <div
                          key={director.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <Crown className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{director.name}</div>
                              <div className="text-sm text-gray-600">{director.username}</div>
                              <div className="text-xs text-purple-600">{director.director_info?.direction || 'Director'}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignDirector(director.id)}
                            className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      ))
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {activeTab === 'clinicians' ? (
                      <>Currently assigned employees ({filteredAssignedClinicians.length}{searchTerm ? ` of ${assignedClinicians.length}` : ''})</>
                    ) : (
                      <>Currently assigned directors ({filteredAssignedDirectors.length}{searchTerm ? ` of ${assignedDirectors.length}` : ''})</>
                    )}
                  </div>
                  {activeTab === 'clinicians' ? (
                    filteredAssignedClinicians.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        {searchTerm ? (
                          <div>
                            <p>No employees match your search</p>
                            <button
                              onClick={() => setSearchTerm('')}
                              className="text-blue-600 hover:text-blue-700 text-sm mt-2"
                            >
                              Clear search
                            </button>
                          </div>
                        ) : (
                          <p>No employees assigned to this director</p>
                        )}
                      </div>
                    ) : (
                      filteredAssignedClinicians.map((clinician) => (
                        <div
                          key={clinician.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {clinician.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{clinician.name}</div>
                              <div className="text-sm text-gray-600">{clinician.username}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnassignClinician(clinician.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )
                  ) : (
                    filteredAssignedDirectors.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Crown className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        {searchTerm ? (
                          <div>
                            <p>No directors match your search</p>
                            <button
                              onClick={() => setSearchTerm('')}
                              className="text-purple-600 hover:text-purple-700 text-sm mt-2"
                            >
                              Clear search
                            </button>
                          </div>
                        ) : (
                          <p>No directors assigned to this director</p>
                        )}
                      </div>
                    ) : (
                      filteredAssignedDirectors.map((director) => (
                        <div
                          key={director.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <Crown className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{director.name}</div>
                              <div className="text-sm text-gray-600">{director.username}</div>
                              <div className="text-xs text-purple-600">{director.director_info?.direction || 'Director'}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnassignDirector(director.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignDirector;