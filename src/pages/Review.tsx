import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNameFormatter } from '../utils/nameFormatter';
import { ReviewService, ReviewItem } from '../services/reviewService';
import { FileUploadService, UploadedFile } from '../services/fileUploadService';
import { KPIGroupService } from '../services/kpiGroupService';
import { Check, X, Calendar, FileText, Upload, Save, AlertCircle, Target, TrendingUp, Download, RefreshCw, File, Trash2, ExternalLink, Clock, ChevronDown, FolderOpen, ChevronUp, CheckCircle } from 'lucide-react';
import { EnhancedSelect, MonthYearPicker, WeekPicker } from '../components/UI';
import { generateReviewPDF } from '../utils/pdfGenerator';

interface ReviewFormData {
  [kpiId: string]: {
    met: boolean | null;
    reviewDate?: string;
    notes?: string;
    plan?: string;
    files?: File[];
    uploadedFiles?: UploadedFile[];
    existingFileUrl?: string; // Track existing file URL from database
    existingReviewId?: string; // Track existing review ID for updates
  };
}

type ReviewType = 'monthly' | 'weekly';

const Review: React.FC = () => {
  const { clinicianId } = useParams<{ clinicianId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profiles, kpis, loading, error } = useData();
  const { user } = useAuth();
  const formatName = useNameFormatter();
  
  // All reviews are now weekly - monthly scores are calculated from weekly averages
  const reviewType: ReviewType = 'weekly';
  
  // Determine if this is "My Reviews" mode (viewing own reviews) or reviewing someone else
  const isMyReviewsMode = !clinicianId && (location.pathname === '/my-reviews' || location.pathname === '/my-weekly-reviews');
  const targetStaffId = isMyReviewsMode ? user?.id : clinicianId;
  const clinician = profiles.find(c => c.id === targetStaffId);
  
  // Monthly review states (kept for compatibility but not used)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Weekly review states
  const getCurrentWeek = () => {
    const now = new Date();
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + (jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day));
    const diffTime = now.getTime() - firstMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return { year, week: Math.max(1, week) };
  };
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  
  // Common states
  const [reviewData, setReviewData] = useState<ReviewFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [existingReviews, setExistingReviews] = useState<ReviewItem[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  
  // State for picker dropdowns
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [mobileWeekPickerOpen, setMobileWeekPickerOpen] = useState(false);
  
  // State for expandable KPIs in My Reviews mode
  const [expandedKPIs, setExpandedKPIs] = useState<Set<string>>(new Set());
  
  // KPI Group states
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupKPIs, setGroupKPIs] = useState<string[]>([]);
  const [showAllKPIs, setShowAllKPIs] = useState(true);

  // Helper function to get week date range
  const getWeekDateRange = (year: number, week: number) => {
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + (jan1Day <= 1 ? 1 - jan1Day : 8 - jan1Day));
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  };

  // Load existing reviews for the selected period
  const loadReviewsForPeriod = async () => {
    if (!targetStaffId) return;
    
    setIsLoading(true);
    try {
      // Weekly reviews only
      const { start, end } = getWeekDateRange(selectedWeek.year, selectedWeek.week);
      const reviews = await ReviewService.getReviewsByDateRange(targetStaffId, start, end);
      
      setExistingReviews(reviews);
      
      // Load existing review data into form
      const formData: ReviewFormData = {};
      reviews.forEach(review => {
        formData[review.kpi] = {
          met: review.met_check,
          reviewDate: review.date ? new Date(review.date).toISOString().split('T')[0] : undefined,
          notes: review.notes || undefined,
          plan: review.plan || undefined,
          files: [],
          uploadedFiles: [],
          existingFileUrl: review.file_url || undefined,
          existingReviewId: review.id
        };
      });
      
      setReviewData(formData);
      setHasLoadedData(true);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setSubmitError('Failed to load existing reviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Load most recent review data as defaults
  const loadMostRecentReviews = async () => {
    if (!targetStaffId || hasLoadedData) return;
    
    setIsLoading(true);
    try {
      const allReviews = await ReviewService.getClinicianReviews(targetStaffId);
      if (allReviews.length === 0) {
        setHasLoadedData(true);
        setIsLoading(false);
        return;
      }

      // Group reviews by KPI and get the most recent for each
      const recentReviewsByKPI: { [kpiId: string]: ReviewItem } = {};
      allReviews.forEach(review => {
        if (!recentReviewsByKPI[review.kpi] || 
            new Date(review.date) > new Date(recentReviewsByKPI[review.kpi].date)) {
          recentReviewsByKPI[review.kpi] = review;
        }
      });

      // Load most recent data as defaults (without existing review IDs)
      const formData: ReviewFormData = {};
      Object.values(recentReviewsByKPI).forEach(review => {
        formData[review.kpi] = {
          met: review.met_check,
          reviewDate: review.date ? new Date(review.date).toISOString().split('T')[0] : undefined,
          notes: review.notes || undefined,
          plan: review.plan || undefined,
          files: [],
          uploadedFiles: []
          // Note: no existingReviewId since these are defaults, not current period reviews
        };
      });
      
      setReviewData(formData);
      setHasLoadedData(true);
    } catch (error) {
      console.error('Error loading recent reviews:', error);
      setSubmitError('Failed to load recent review data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load available KPI groups for the current user
  const loadKPIGroups = async () => {
    if (!user?.id) return;
    
    try {
      const groups = await KPIGroupService.getGroupTitlesByDirector(user.id);
      setAvailableGroups(groups);
    } catch (error) {
      console.error('Error loading KPI groups:', error);
    }
  };

  // Load KPIs for selected group
  const loadGroupKPIs = async (groupTitle: string) => {
    if (!user?.id || !groupTitle) return;
    
    try {
      const kpiIds = await KPIGroupService.getKPIsInGroup(user.id, groupTitle);
      setGroupKPIs(kpiIds);
    } catch (error) {
      console.error('Error loading group KPIs:', error);
      setGroupKPIs([]);
    }
  };

  // Handle group selection
  const handleGroupSelection = async (groupTitle: string) => {
    setSelectedGroup(groupTitle);
    if (groupTitle === '') {
      setShowAllKPIs(true);
      setGroupKPIs([]);
    } else {
      setShowAllKPIs(false);
      await loadGroupKPIs(groupTitle);
    }
  };

  // Toggle KPI expanded state for My Reviews mode
  const toggleKPIExpanded = (kpiId: string) => {
    setExpandedKPIs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kpiId)) {
        newSet.delete(kpiId);
      } else {
        newSet.add(kpiId);
      }
      return newSet;
    });
  };

  // Helper function to get file name from URL
  const getFileNameFromUrl = (url: string) => {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return decodeURIComponent(fileName);
    } catch {
      return 'Download File';
    }
  };

  // Load data when period changes
  useEffect(() => {
    if (targetStaffId && kpis.length > 0) {
      setHasLoadedData(false);
      setReviewData({});
      setExistingReviews([]);
      loadReviewsForPeriod();
    }
  }, [selectedWeek.week, selectedWeek.year, targetStaffId, kpis.length]);

  // Load most recent data as defaults if no existing reviews found
  useEffect(() => {
    if (hasLoadedData && existingReviews.length === 0 && Object.keys(reviewData).length === 0) {
      loadMostRecentReviews();
    }
  }, [hasLoadedData, existingReviews.length, Object.keys(reviewData).length]);

  // Load KPI groups on component mount
  useEffect(() => {
    loadKPIGroups();
  }, [user?.id]);

  // Filter KPIs based on group selection
  const filteredKPIs = useMemo(() => {
    if (showAllKPIs || groupKPIs.length === 0) {
      return kpis;
    }
    return kpis.filter(kpi => groupKPIs.includes(kpi.id));
  }, [kpis, showAllKPIs, groupKPIs]);

  // Calculate metrics
  const totalKPIs = filteredKPIs.length;
  const completedKPIs = Object.values(reviewData).filter(data => data.met !== null && data.met !== undefined).length;
  
  const score = useMemo(() => {
    let totalWeight = 0;
    let earnedWeight = 0;
    
    filteredKPIs.forEach(kpi => {
      totalWeight += kpi.weight;
      if (reviewData[kpi.id]?.met === true) {
        earnedWeight += kpi.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  }, [filteredKPIs, reviewData]);

  if (!clinician) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Member Not Found</h2>
          <p className="text-gray-600">The requested staff member could not be found.</p>
        </div>
      </div>
    );
  }

  const handleKPIChange = (kpiId: string, field: string, value: any) => {
    setReviewData(prev => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        [field]: value,
      }
    }));

    // Clear errors when user starts fixing them
    if (errors[kpiId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[kpiId];
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (kpiId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Update form data with selected files
    setReviewData(prev => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        files: fileArray,
      }
    }));

    // Start upload process
    setUploadingFiles(prev => ({ ...prev, [kpiId]: true }));
    
    try {
      if (!targetStaffId) throw new Error('Staff member ID not found');
      
      const uploadedFiles = await FileUploadService.uploadFiles(
        fileArray,
        targetStaffId,
        kpiId
      );

      // Update form data with uploaded file URLs
      setReviewData(prev => ({
        ...prev,
        [kpiId]: {
          ...prev[kpiId],
          uploadedFiles: uploadedFiles,
          files: [] // Clear the file input after successful upload
        }
      }));

    } catch (error) {
      console.error('Error uploading files:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to upload files');
      
      // Clear files on error
      setReviewData(prev => ({
        ...prev,
        [kpiId]: {
          ...prev[kpiId],
          files: []
        }
      }));
    } finally {
      setUploadingFiles(prev => ({ ...prev, [kpiId]: false }));
    }
  };

  const handleRemoveUploadedFile = async (kpiId: string, fileIndex: number) => {
    const kpiData = reviewData[kpiId];
    if (!kpiData?.uploadedFiles) return;

    const fileToRemove = kpiData.uploadedFiles[fileIndex];
    
    try {
      // Delete from Supabase Storage
      await FileUploadService.deleteFile(fileToRemove.url);
      
      // Remove from form data
      setReviewData(prev => ({
        ...prev,
        [kpiId]: {
          ...prev[kpiId],
          uploadedFiles: prev[kpiId]?.uploadedFiles?.filter((_, index) => index !== fileIndex) || []
        }
      }));
    } catch (error) {
      console.error('Error removing file:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to remove file');
    }
  };

  const handleRemoveExistingFile = async (kpiId: string) => {
    const kpiData = reviewData[kpiId];
    if (!kpiData?.existingFileUrl) return;

    try {
      // Delete from Supabase Storage
      await FileUploadService.deleteFile(kpiData.existingFileUrl);
      
      // Remove from form data
      setReviewData(prev => ({
        ...prev,
        [kpiId]: {
          ...prev[kpiId],
          existingFileUrl: undefined
        }
      }));
    } catch (error) {
      console.error('Error removing existing file:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to remove existing file');
    }
  };

  const handleDownloadPDF = () => {
    if (!clinician) {
      alert('Employee data not found');
      return;
    }

    try {
      // Map clinician profile data to match the expected Clinician interface
      const isDirector = clinician.position_info?.role === 'director';
      const clinicianData = {
        id: clinician.id,
        name: clinician.name, // Use full name without formatting
        email: clinician.username, // Use username instead of fake email
        position: clinician.position_info?.position_title || (isDirector ? 'Director' : 'Clinician'),
        department: isDirector 
          ? clinician.director_info?.direction || 'General Direction'
          : clinician.clinician_info?.type_info?.title || 'General',
        assignedDirector: '', // This would need to be fetched if needed
        startDate: clinician.created_at
      };
      
      // Convert existingReviews to ReviewData format for PDF generation
      const reviewDataForPDF: { [kpiId: string]: { met: boolean | null; reviewDate?: string; notes?: string; plan?: string; } } = {};
      
      existingReviews.forEach(review => {
        reviewDataForPDF[review.kpi] = {
          met: review.met_check,
          reviewDate: review.review_date,
          notes: review.notes,
          plan: review.plan
        };
      });

      // Add current form data for KPIs not in existing reviews
      Object.keys(reviewData).forEach(kpiId => {
        if (!reviewDataForPDF[kpiId] && reviewData[kpiId].met !== null) {
          reviewDataForPDF[kpiId] = {
            met: reviewData[kpiId].met,
            reviewDate: reviewData[kpiId].reviewDate,
            notes: reviewData[kpiId].notes,
            plan: reviewData[kpiId].plan
          };
        }
      });

      const periodLabel = reviewType === 'monthly' 
        ? `${selectedMonth} ${selectedYear}`
        : `Week ${selectedWeek.week}, ${selectedWeek.year}`;

      generateReviewPDF(
        clinicianData,
        kpis,
        reviewDataForPDF,
        periodLabel,
        reviewType === 'weekly' ? 'Weekly' : 'Monthly'
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!targetStaffId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate that all KPIs in the filtered group are reviewed
      const unreviewed = filteredKPIs.filter(kpi => {
        const kpiData = reviewData[kpi.id];
        return !kpiData || kpiData.met === null || kpiData.met === undefined;
      });

      if (unreviewed.length > 0) {
        const unreviewedTitles = unreviewed.map(kpi => kpi.title).join(', ');
        setSubmitError(
          `Please complete reviews for all KPIs in the selected group before submitting. Missing reviews for: ${unreviewedTitles}`
        );
        setIsSubmitting(false);
        return;
      }

      // Additional validation for KPIs marked as "Not Met"
      const invalidNotMetKPIs = filteredKPIs.filter(kpi => {
        const kpiData = reviewData[kpi.id];
        if (kpiData?.met === false) {
          // Check if required fields are filled for "Not Met" KPIs
          return !kpiData.reviewDate || !kpiData.notes || !kpiData.plan;
        }
        return false;
      });

      if (invalidNotMetKPIs.length > 0) {
        const invalidTitles = invalidNotMetKPIs.map(kpi => kpi.title).join(', ');
        setSubmitError(
          `For KPIs marked as "Not Met", please fill in Review Date, Performance Notes, and Improvement Plan. Missing information for: ${invalidTitles}`
        );
        setIsSubmitting(false);
        return;
      }

      const reviewItems = [];
      
      for (const kpiId of Object.keys(reviewData)) {
        const kpiData = reviewData[kpiId];
        if (kpiData.met === null || kpiData.met === undefined) continue;

        const kpi = kpis.find(k => k.id === kpiId);
        if (!kpi) continue;

        // Determine file URL to save
        let fileUrl = kpiData.existingFileUrl;
        if (kpiData.uploadedFiles && kpiData.uploadedFiles.length > 0) {
          fileUrl = kpiData.uploadedFiles[0].url; // Use the first uploaded file
        }

        const reviewItemData = {
          clinician: targetStaffId,
          kpi: kpiId,
          director: user?.id,
          met_check: kpiData.met,
          notes: kpiData.notes || null,
          plan: kpiData.plan || null,
          score: kpiData.met ? kpi.weight : 0,
          file_url: fileUrl || null,
        };

        // If we have an existing review ID, update it; otherwise create new
        if (kpiData.existingReviewId) {
          await ReviewService.updateReviewItem(kpiData.existingReviewId, {
            met_check: reviewItemData.met_check,
            notes: reviewItemData.notes,
            plan: reviewItemData.plan,
            score: reviewItemData.score,
            file_url: reviewItemData.file_url,
            director: reviewItemData.director
          });
        } else {
          // For new reviews, use date range replacement for weekly reviews
          const { start, end } = getWeekDateRange(selectedWeek.year, selectedWeek.week);
          await ReviewService.replaceReviewForDateRange(
            targetStaffId,
            kpiId,
            start,
            end,
            reviewItemData
          );
        }
      }

      // Reload the reviews to show updated data
      await loadReviewsForPeriod();
      
      // Show success message
      alert('Weekly review submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const periodLabel = `Week ${selectedWeek.week}, ${selectedWeek.year}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header - Matching original MonthlyReview */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <Clock className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
                Weekly Review
              </h1>
              <p className="mt-1 sm:mt-2 text-base sm:text-lg text-gray-600">
                {isMyReviewsMode ? 'My Reviews' : `${formatName(clinician.name)} - ${periodLabel}`}
              </p>
            </div>
          </div>
        </div>



        {/* KPI Group Selector - Only show when not in My Reviews mode */}
        {!isMyReviewsMode && availableGroups.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  KPI Group Selection
                </h2>
                <p className="text-sm text-gray-600">
                  Choose a KPI group to review specific KPIs, or review all KPIs
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={selectedGroup}
                  onChange={(e) => handleGroupSelection(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm sm:text-base min-w-[200px]"
                >
                  <option value="">All KPIs ({kpis.length})</option>
                  {availableGroups.map(group => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
                
                {!showAllKPIs && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    <FolderOpen className="w-4 h-4" />
                    <span>{filteredKPIs.length} KPIs in group</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6 sm:mb-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-3" />
              <span className="text-gray-600">Loading review data...</span>
            </div>
          </div>
        )}

        {/* KPI Reviews */}
        {!isLoading && (
          <>
            {isMyReviewsMode ? (
              /* My Reviews Mode - Card-based layout like Dashboard */
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">My KPI Performance - {periodLabel}</h3>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      {existingReviews.length} of {filteredKPIs.length} KPIs reviewed • Current Score: {score}%
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    title="Download KPI Performance Report"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {filteredKPIs.map((kpi) => {
                    const kpiData = reviewData[kpi.id] || {};
                    const hasData = kpiData.met !== null && kpiData.met !== undefined;
                    const isExpanded = expandedKPIs.has(kpi.id);
                    const score = hasData && kpiData.met ? kpi.weight : 0;
                    
                    return (
                      <div key={kpi.id} className="border border-gray-200 rounded-lg">
                        {/* KPI Header */}
                        <div className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{kpi.title}</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                Weight: {kpi.weight}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end space-x-3">
                              {hasData ? (
                                <>
                                  {kpiData.met ? (
                                    <div className="flex items-center space-x-1 text-green-600">
                                      <Check className="w-4 h-4" />
                                      <span className="text-xs sm:text-sm font-medium">Met</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-red-600">
                                      <X className="w-4 h-4" />
                                      <span className="text-xs sm:text-sm font-medium">Not Met</span>
                                    </div>
                                  )}
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                    {score}/{kpi.weight}
                                  </span>
                                </>
                              ) : (
                                <div className="flex items-center space-x-1 text-gray-400">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-xs sm:text-sm">No review</span>
                                </div>
                              )}
                              
                              {hasData && (
                                <button
                                  onClick={() => toggleKPIExpanded(kpi.id)}
                                  className="text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-gray-600 mb-3">{kpi.description}</p>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                hasData && kpiData.met ? 'bg-green-600' : hasData ? 'bg-red-600' : 'bg-gray-300'
                              }`}
                              style={{ width: hasData ? (kpiData.met ? '100%' : '0%') : '0%' }}
                            />
                          </div>
                          
                          {hasData && kpiData.reviewDate && (
                            <div className="mt-2 text-xs text-gray-500">
                              Reviewed on {new Date(kpiData.reviewDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Expandable Details */}
                        {isExpanded && hasData && (
                          <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                            {!kpiData.met && (
                              <div className="space-y-4">
                                {kpiData.notes && (
                                  <div>
                                    <div className="flex items-center space-x-1 mb-2">
                                      <FileText className="w-4 h-4 text-orange-600" />
                                      <span className="text-xs sm:text-sm font-medium text-gray-700">Notes:</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-600 bg-orange-50 p-3 rounded border-l-4 border-orange-200">
                                      {kpiData.notes}
                                    </p>
                                  </div>
                                )}
                                
                                {kpiData.plan && (
                                  <div>
                                    <div className="flex items-center space-x-1 mb-2">
                                      <TrendingUp className="w-4 h-4 text-blue-600" />
                                      <span className="text-xs sm:text-sm font-medium text-gray-700">Action Plan:</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                                      {kpiData.plan}
                                    </p>
                                  </div>
                                )}
                                
                                {(kpiData.existingFileUrl || (kpiData.uploadedFiles && kpiData.uploadedFiles.length > 0)) && (
                                  <div>
                                    <div className="flex items-center space-x-1 mb-2">
                                      <Download className="w-4 h-4 text-green-600" />
                                      <span className="text-xs sm:text-sm font-medium text-gray-700">Attached Files:</span>
                                    </div>
                                    <div className="space-y-2">
                                      {kpiData.existingFileUrl && (
                                        <div className="flex items-center space-x-2 bg-green-50 p-3 rounded border border-green-200">
                                          <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          <span className="text-xs sm:text-sm text-green-700 flex-1 truncate">
                                            {getFileNameFromUrl(kpiData.existingFileUrl)}
                                          </span>
                                          <button
                                            onClick={() => window.open(kpiData.existingFileUrl, '_blank')}
                                            className="text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1 flex-shrink-0"
                                            title="Download file"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="text-xs hidden sm:inline">Open</span>
                                          </button>
                                        </div>
                                      )}
                                      {kpiData.uploadedFiles && kpiData.uploadedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center space-x-2 bg-green-50 p-3 rounded border border-green-200">
                                          <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          <span className="text-xs sm:text-sm text-green-700 flex-1 truncate">
                                            {file.name}
                                          </span>
                                          <button
                                            onClick={() => window.open(file.url, '_blank')}
                                            className="text-green-600 hover:text-green-800 transition-colors flex items-center space-x-1 flex-shrink-0"
                                            title="Download file"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="text-xs hidden sm:inline">Open</span>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {kpiData.met && (
                              <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                                <span className="text-xs sm:text-sm font-medium">
                                  Great job! You successfully met this KPI target.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Edit Mode - Original form layout */
              <div className="space-y-6">
                {filteredKPIs.map((kpi) => {
                  const kpiData = reviewData[kpi.id] || {};
                  const isMet = kpiData.met;
                  const isUploading = uploadingFiles[kpi.id];

                  return (
                    <div key={kpi.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                      {/* KPI Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0 mb-6">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Target className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{kpi.title}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Weight: {kpi.weight}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{kpi.description}</p>
                        </div>
                      </div>

                      {/* KPI Status Selection */}
                      <div className="mb-6">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                          KPI Status *
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => handleKPIChange(kpi.id, 'met', true)}
                            className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all text-sm sm:text-base font-medium ${
                              isMet === true
                                ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Met
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKPIChange(kpi.id, 'met', false)}
                            className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all text-sm sm:text-base font-medium ${
                              isMet === false
                                ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Not Met
                          </button>
                        </div>
                      </div>

                      {/* Additional fields when KPI is not met */}
                      {isMet === false && (
                        <div className="space-y-6 pt-6 border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Review Date *
                              </label>
                              <input
                                type="date"
                                value={kpiData.reviewDate || ''}
                                onChange={(e) => handleKPIChange(kpi.id, 'reviewDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                max={new Date().toISOString().split('T')[0]}
                                required
                              />
                            </div>

                            {/* File Upload */}
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                <Upload className="w-4 h-4 inline mr-1" />
                                Supporting Documents
                              </label>
                              
                              {/* Existing File */}
                              {kpiData.existingFileUrl && (
                                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <File className="w-4 h-4 text-blue-600 mr-2" />
                                      <span className="text-sm text-blue-800">Existing file attached</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => window.open(kpiData.existingFileUrl, '_blank')}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExistingFile(kpi.id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Uploaded Files */}
                              {kpiData.uploadedFiles && kpiData.uploadedFiles.length > 0 && (
                                <div className="mb-3 space-y-2">
                                  {kpiData.uploadedFiles.map((file, index) => (
                                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <File className="w-4 h-4 text-green-600 mr-2" />
                                          <span className="text-sm text-green-800">{file.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => window.open(file.url, '_blank')}
                                            className="text-green-600 hover:text-green-800"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveUploadedFile(kpi.id, index)}
                                            className="text-red-600 hover:text-red-800"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* File Upload Input */}
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  id={`file-${kpi.id}`}
                                  onChange={(e) => handleFileUpload(kpi.id, e.target.files)}
                                  className="hidden"
                                  multiple
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />
                                <label
                                  htmlFor={`file-${kpi.id}`}
                                  className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors ${
                                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  {isUploading ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                  )}
                                  {isUploading ? 'Uploading...' : 'Upload Files'}
                                </label>
                                <span className="text-xs text-gray-500">
                                  PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                <FileText className="w-4 h-4 inline mr-1" />
                                Performance Notes *
                              </label>
                              <textarea
                                value={kpiData.notes || ''}
                                onChange={(e) => handleKPIChange(kpi.id, 'notes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Detailed notes from the performance conversation, including specific examples and context..."
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                <TrendingUp className="w-4 h-4 inline mr-1" />
                                Improvement Plan *
                              </label>
                              <textarea
                                value={kpiData.plan || ''}
                                onChange={(e) => handleKPIChange(kpi.id, 'plan', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Specific action plan for improvement, including timelines, resources, training, or support needed..."
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Success indicator for met KPIs */}
                      {isMet === true && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-green-600">
                            <Check className="w-4 sm:w-5 h-4 sm:h-5" />
                            <span className="text-sm sm:text-base font-medium">KPI successfully met - no additional action required</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* No KPIs message */}
                {filteredKPIs.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No KPIs Available</h3>
                    <p className="text-gray-600 mb-4">
                      {selectedGroup 
                        ? `The selected group "${selectedGroup}" doesn't contain any KPIs, or the KPIs have been removed.`
                        : 'No KPIs are available for review at this time.'
                      }
                    </p>
                    {selectedGroup && (
                      <button
                        onClick={() => handleGroupSelection('')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View All KPIs
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Submit Section - Matching original MonthlyReview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {isMyReviewsMode ? 'My Review Summary' : 'Review Summary'}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {isMyReviewsMode
                  ? `${existingReviews.length} of ${totalKPIs} KPIs have been reviewed • Current Score: ${score}%`
                  : `${completedKPIs} of ${totalKPIs} KPIs reviewed • Projected Score: ${score}%`
                }
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate(isMyReviewsMode ? '/' : '/clinicians')}
                className="px-4 sm:px-6 py-3 sm:py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                {isMyReviewsMode ? 'Back to Dashboard' : 'Cancel'}
              </button>
              {!isMyReviewsMode && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || completedKPIs < totalKPIs}
                  className="px-4 sm:px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              )}
              {isMyReviewsMode && (
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 sm:px-6 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  <span>Download My Reviews</span>
                </button>
              )}
            </div>
          </div>

          {submitError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-red-700">{submitError}</span>
              </div>
            </div>
          )}

          {!isMyReviewsMode && completedKPIs < totalKPIs && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-orange-700">
                  All KPIs in the selected group must be reviewed before submitting. 
                  {completedKPIs === 0 
                    ? `Please complete all ${totalKPIs} KPI reviews.`
                    : `${totalKPIs - completedKPIs} KPI${totalKPIs - completedKPIs > 1 ? 's' : ''} remaining to complete.`
                  }
                </span>
              </div>
            </div>
          )}

          {!isMyReviewsMode && completedKPIs === totalKPIs && totalKPIs > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-green-700">
                  All {totalKPIs} KPIs have been reviewed and are ready to submit.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Review;