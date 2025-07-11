import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, UserMinus, User, Mail, Calendar, Users, X, CheckCircle } from 'lucide-react';

const AssignDirector: React.FC = () => {
  const { 
    getDirectors, 
    getAssignedClinicians, 
    getUnassignedClinicians, 
    assignClinician, 
    unassignClinician,
    loading,
    error,
    refreshProfiles,
    refreshAssignments,
    assignments
  } = useData();
  const { user } = useAuth();

  const [selectedDirector, setSelectedDirector] = useState<number | null>(null);
  const [sidebarMode, setSidebarMode] = useState<'assign' | 'unassign' | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const directors = getDirectors();
  const assignedClinicians = selectedDirector ? getAssignedClinicians(selectedDirector) : [];
  const unassignedClinicians = getUnassignedClinicians();

  const handleAssignClick = (directorId: number) => {
    setSelectedDirector(directorId);
    setSidebarMode('assign');
    setShowSidebar(true);
  };

  const handleUnassignClick = (directorId: number) => {
    setSelectedDirector(directorId);
    setSidebarMode('unassign');
    setShowSidebar(true);
  };

  const handleAssignClinician = async (clinicianId: number) => {
    if (!selectedDirector) return;
    
    try {
      await assignClinician(clinicianId, selectedDirector);
      console.log('Clinician assigned successfully');
      // Optionally close sidebar after assignment
      // setShowSidebar(false);
    } catch (error) {
      console.error('Failed to assign clinician:', error);
      alert('Failed to assign clinician. Please try again.');
    }
  };

  const handleUnassignClinician = async (clinicianId: number) => {
    if (!selectedDirector) return;
    
    try {
      await unassignClinician(clinicianId, selectedDirector);
      console.log('Clinician unassigned successfully');
      // Optionally close sidebar after unassignment
      // setShowSidebar(false);
    } catch (error) {
      console.error('Failed to unassign clinician:', error);
      alert('Failed to unassign clinician. Please try again.');
    }
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setSelectedDirector(null);
    setSidebarMode(null);
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
    console.log('Unassigned clinicians:', unassignedClinicians);
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
            <p className="text-gray-600 mt-1">Manage clinician assignments to directors</p>
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
                {directors.filter(director => getAssignedClinicians(director.id).length > 0).length}
              </div>
              <div className="text-sm text-green-700">Directors with Assignments</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {directors.reduce((sum, director) => sum + getAssignedClinicians(director.id).length, 0)}
              </div>
              <div className="text-sm text-purple-700">Total Assignments</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {unassignedClinicians.length}
              </div>
              <div className="text-sm text-orange-700">Unassigned Clinicians</div>
            </div>
          </div>
        </div>

        {/* Directors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directors.map((director) => {
            const assignedClinicians = getAssignedClinicians(director.id);
            const assignedCount = assignedClinicians.length;
            
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
                      assignedCount > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {assignedCount} clinicians
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{director.name}</h3>
                    <p className="text-sm text-gray-600">{director.position_info?.position_title || 'Clinical Director'}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{director.username}@clinic.com</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Since {new Date(director.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Assigned Clinicians List */}
                  {assignedCount > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Clinicians:</h4>
                      <div className="space-y-2">
                        {assignedClinicians.slice(0, 3).map((clinician) => (
                          <div key={clinician.id} className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {clinician.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600 truncate">{clinician.name}</span>
                          </div>
                        ))}
                        {assignedCount > 3 && (
                          <div className="text-xs text-gray-500 ml-8">
                            +{assignedCount - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {assignedCount === 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <User className="w-4 h-4" />
                        <span className="text-sm">No clinicians assigned</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAssignClick(director.id)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center"
                      disabled={unassignedClinicians.length === 0}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Assign
                    </button>
                    <button
                      onClick={() => handleUnassignClick(director.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${
                        assignedCount === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                      disabled={assignedCount === 0}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {sidebarMode === 'assign' ? 'Assign Clinicians' : 'Unassign Clinicians'}
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
            </div>

            <div className="p-6">
              {sidebarMode === 'assign' ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Available unassigned clinicians ({unassignedClinicians.length})
                  </div>
                  {unassignedClinicians.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No unassigned clinicians available</p>
                    </div>
                  ) : (
                    unassignedClinicians.map((clinician) => (
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
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Currently assigned clinicians ({assignedClinicians.length})
                  </div>
                  {assignedClinicians.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No clinicians assigned to this director</p>
                    </div>
                  ) : (
                    assignedClinicians.map((clinician) => (
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