import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useNameFormatter } from '../utils/nameFormatter';
import { User, Mail, Calendar, ChevronRight, ClipboardList, TrendingUp, UserCheck, Navigation, ChevronDown, ChevronUp, Target, Check, X, FileText, Download, ExternalLink, AlertCircle, Clock } from 'lucide-react';

const ClinicianManagement: React.FC = () => {
  const { 
    getAssignedClinicians, 
    getAssignedDirectors,
    getClinicianScore, 
    getClinicianReviews,
    kpis,
    reviewItems,
    loading, 
    error, 
    refreshProfiles, 
    refreshAssignments,
    refreshReviewItems
  } = useData();
  const { user } = useAuth();
  const formatName = useNameFormatter();
  
  // State for managing expanded staff members
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());

  // Get clinicians and directors assigned to the current director
  const assignedClinicians = user?.id ? getAssignedClinicians(user.id) : [];
  const assignedDirectors = user?.id ? getAssignedDirectors(user.id) : [];
  const allAssignedStaff = [...assignedClinicians, ...assignedDirectors];

  // Load data on component mount
  useEffect(() => {
    refreshProfiles();
    refreshAssignments();
    refreshReviewItems();
  }, []);

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Helper function to calculate director's average score with recursion protection
  const getDirectorAverageScoreInternal = (directorId: string, month: string, year: number, visited: Set<string>): number => {
    // Prevent infinite recursion by checking if we've already visited this director
    if (visited.has(directorId)) {
      return 0; // Return 0 to avoid circular references
    }
    
    // Add current director to visited set
    const newVisited = new Set(visited);
    newVisited.add(directorId);
    
    const assignedClinicians = getAssignedClinicians(directorId);
    const assignedDirectors = getAssignedDirectors(directorId);
    const allAssignedMembers = [...assignedClinicians, ...assignedDirectors];
    
    if (allAssignedMembers.length === 0) {
      return 0; // No assigned members
    }
    
    const scores = allAssignedMembers.map(member => {
      // For assigned directors, get their director average score; for clinicians, get their individual score
      if (member.position_info?.role === 'director') {
        return getDirectorAverageScoreInternal(member.id, month, year, newVisited);
      } else {
        return getClinicianScore(member.id, month, year);
      }
    });
    
    const validScores = scores.filter(score => score > 0);
    if (validScores.length === 0) {
      return 0;
    }
    
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  };

  // Calculate director's average score based on assigned members
  const getDirectorAverageScore = (directorId: string, month: string, year: number): number => {
    return getDirectorAverageScoreInternal(directorId, month, year, new Set());
  };

  // Toggle expanded state for a staff member
  const toggleExpanded = (staffId: string) => {
    setExpandedStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  // Get KPI details for a staff member for the current month
  const getStaffKPIDetails = (staffId: string) => {
    const currentMonthReviews = reviewItems.filter(review => {
      const reviewDate = new Date(review.date);
      const reviewMonth = reviewDate.toLocaleString('default', { month: 'long' });
      const reviewYear = reviewDate.getFullYear();
      return review.clinician === staffId && 
             reviewMonth === currentMonth && 
             reviewYear === currentYear;
    });

    return kpis.map(kpi => {
      const kpiReview = currentMonthReviews.find(review => review.kpi === kpi.id);
      return {
        kpi,
        review: kpiReview,
        score: kpiReview ? (kpiReview.met_check ? kpi.weight : 0) : null,
        hasData: !!kpiReview
      };
    });
  };

  // Helper function to get file name from URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Remove any query parameters
      return fileName.split('?')[0];
    } catch {
      return 'Download File';
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Current user:', user);
    console.log('Assigned clinicians:', assignedClinicians);
    console.log('Assigned directors:', assignedDirectors);
    console.log('All assigned staff:', allAssignedStaff);
  }, [user, assignedClinicians, assignedDirectors, allAssignedStaff]);

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
              refreshReviewItems();
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
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your assigned team members (clinicians and directors) and track their performance
          </p>
        </div>
        <button
          onClick={() => {
            refreshProfiles();
            refreshAssignments();
            refreshReviewItems();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Assignment Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {allAssignedStaff.length}
            </div>
            <div className="text-sm text-blue-700">Total Assigned</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {assignedClinicians.length}
            </div>
            <div className="text-sm text-purple-700">Clinicians</div>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {assignedDirectors.length}
            </div>
            <div className="text-sm text-indigo-700">Directors</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {allAssignedStaff.filter(s => {
                const score = getClinicianScore(s.id, currentMonth, currentYear); // Always use individual scores for assigned staff
                return score >= 90;
              }).length}
            </div>
            <div className="text-sm text-green-700">Excellent (90%+)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {allAssignedStaff.filter(s => {
                const score = getClinicianScore(s.id, currentMonth, currentYear); // Always use individual scores for assigned staff
                return score < 70;
              }).length}
            </div>
            <div className="text-sm text-red-700">Needs Attention (&lt;70%)</div>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 gap-6">
        {allAssignedStaff.map((staffMember) => {
          const currentScore = getClinicianScore(staffMember.id, currentMonth, currentYear); // Always use individual scores for assigned staff
          const scoreColorClass = getPerformanceColor(currentScore);
          const isExpanded = expandedStaff.has(staffMember.id);
          const kpiDetails = getStaffKPIDetails(staffMember.id);
          const isDirector = staffMember.position_info?.role === 'director';
          
          return (
            <div key={staffMember.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              {/* Main Staff Member Card */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${isDirector ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-green-600 to-blue-600'} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-medium">
                        {staffMember.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">{staffMember.name}</h3>
                        {isDirector && (
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                            Director
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{staffMember.position_info?.position_title || 'General'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      <span className="text-xs text-green-700 font-medium">Assigned</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${scoreColorClass}`}>
                      {currentScore}%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {isDirector 
                        ? staffMember.director_info?.direction || 'General Direction'
                        : staffMember.clinician_info?.type_info?.title || 'General'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Since {new Date(staffMember.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {kpiDetails.filter(kpi => kpi.hasData).length}/{kpiDetails.length} KPIs reviewed
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Link
                      to={`/clinician/${staffMember.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    
                    {user?.role === 'director' && (
                      <Link
                        to={`/review/${staffMember.id}`}
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center space-x-1"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Weekly Review</span>
                      </Link>
                    )}
                  </div>
                  
                  <button
                    onClick={() => toggleExpanded(staffMember.id)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
                  >
                    <span>{isExpanded ? 'Hide' : 'Show'} KPI Details</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable KPI Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        KPI Performance - {currentMonth} {currentYear}
                      </h4>
                      <div className="text-sm text-gray-600">
                        {kpiDetails.filter(kpi => kpi.hasData).length} of {kpiDetails.length} KPIs reviewed
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {kpiDetails.map((kpiDetail) => {
                        const { kpi, review, score, hasData } = kpiDetail;
                        
                        return (
                          <div key={kpi.id} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Target className="w-4 h-4 text-blue-600" />
                                  <h5 className="font-medium text-gray-900">{kpi.title}</h5>
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    Weight: {kpi.weight}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{kpi.description}</p>
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                {hasData ? (
                                  <>
                                    {review?.met_check ? (
                                      <div className="flex items-center space-x-1 text-green-600">
                                        <Check className="w-4 h-4" />
                                        <span className="text-sm font-medium">Met</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center space-x-1 text-red-600">
                                        <X className="w-4 h-4" />
                                        <span className="text-sm font-medium">Not Met</span>
                                      </div>
                                    )}
                                    <span className="text-sm font-semibold text-gray-900">
                                      {score}/{kpi.weight}
                                    </span>
                                  </>
                                ) : (
                                  <div className="flex items-center space-x-1 text-gray-400">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">No review</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Notes and Plans */}
                            {hasData && !review?.met_check && (
                              <div className="space-y-3 pt-3 border-t border-gray-100">
                                {review?.notes && (
                                  <div>
                                    <div className="flex items-center space-x-1 mb-1">
                                      <FileText className="w-4 h-4 text-orange-600" />
                                      <span className="text-sm font-medium text-gray-700">Notes:</span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-orange-50 p-2 rounded border-l-4 border-orange-200">
                                      {review.notes}
                                    </p>
                                  </div>
                                )}
                                
                                {review?.plan && (
                                  <div>
                                    <div className="flex items-center space-x-1 mb-1">
                                      <TrendingUp className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium text-gray-700">Action Plan:</span>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-200">
                                      {review.plan}
                                    </p>
                                  </div>
                                )}
                                
                                {review?.file_url && (
                                  <div>
                                    <div className="flex items-center space-x-1 mb-2">
                                      <Download className="w-4 h-4 text-green-600" />
                                      <span className="text-sm font-medium text-gray-700">Attached File:</span>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-green-50 p-2 rounded border border-green-200">
                                      <FileText className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-700 flex-1">
                                        {getFileNameFromUrl(review.file_url)}
                                      </span>
                                      <button
                                        onClick={() => window.open(review.file_url, '_blank')}
                                        className="text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1"
                                        title="Download file"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        <span className="text-xs">Open</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {hasData && (
                              <div className="mt-3 pt-2 border-t border-gray-100">
                                <div className="text-xs text-gray-500">
                                  Reviewed on {new Date(review!.date).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {allAssignedStaff.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Staff Members</h3>
          <p className="text-gray-600">
            You don't have any staff members (clinicians or directors) assigned to you yet. Contact your administrator to assign staff to your supervision.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClinicianManagement;