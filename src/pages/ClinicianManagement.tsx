import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { User, Mail, Calendar, ChevronRight, ClipboardList, TrendingUp, UserCheck, Navigation } from 'lucide-react';

const ClinicianManagement: React.FC = () => {
  const { 
    getAssignedClinicians, 
    getClinicianScore, 
    loading, 
    error, 
    refreshProfiles, 
    refreshAssignments 
  } = useData();
  const { user } = useAuth();

  // Get clinicians assigned to the current director
  const assignedClinicians = user?.id ? getAssignedClinicians(user.id) : [];

  // Load data on component mount
  useEffect(() => {
    refreshProfiles();
    refreshAssignments();
  }, []);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Debug logging
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Assigned clinicians:', assignedClinicians);
  }, [user, assignedClinicians]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinician Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your assigned clinical team members and track their performance
          </p>
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

      {/* Assignment Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {assignedClinicians.length}
            </div>
            <div className="text-sm text-blue-700">Total Assigned</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {assignedClinicians.filter(c => getClinicianScore(c.id, currentMonth, currentYear) >= 90).length}
            </div>
            <div className="text-sm text-green-700">Excellent (90%+)</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {assignedClinicians.filter(c => {
                const score = getClinicianScore(c.id, currentMonth, currentYear);
                return score >= 70 && score < 90;
              }).length}
            </div>
            <div className="text-sm text-yellow-700">Good (70-89%)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {assignedClinicians.filter(c => getClinicianScore(c.id, currentMonth, currentYear) < 70).length}
            </div>
            <div className="text-sm text-red-700">Needs Attention (&lt;70%)</div>
          </div>
        </div>
      </div>

      {/* Clinician Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedClinicians.map((clinician) => {
          const currentScore = getClinicianScore(clinician.id, currentMonth, currentYear);
          const scoreColorClass = getPerformanceColor(currentScore);
          
          return (
            <div key={clinician.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {clinician.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Assigned</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{clinician.name}</h3>
                  <p className="text-sm text-gray-600">{clinician.position_info?.position_title || 'General'}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600">{clinician.clinician_info?.type_info?.title || 'General'}</p>
                </div>
                               
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Since {new Date(clinician.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Performance Score */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-gray-700">Current Score</span>
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${scoreColorClass}`}>
                    {currentScore}%
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <Link
                  to={`/clinician/${clinician.id}`}
                  className="flex items-center justify-between text-blue-600 hover:text-blue-700 font-medium text-sm w-full"
                >
                  <span>View Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                
                {user?.role === 'director' && (
                  <div className="flex space-x-2">
                    <Link
                      to={`/review/${clinician.id}`}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center"
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Review
                    </Link>

                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {assignedClinicians.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Clinicians</h3>
          <p className="text-gray-600">
            You don't have any clinicians assigned to you yet. Contact your administrator to assign clinicians to your supervision.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClinicianManagement;