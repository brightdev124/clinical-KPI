import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNameFormatter } from '../utils/nameFormatter';
import { ReviewService, ReviewItem } from '../services/reviewService';
import { FileUploadService, UploadedFile } from '../services/fileUploadService';
import { Check, X, Calendar, FileText, Upload, Save, AlertCircle, Target, TrendingUp, Download, RefreshCw, File, Trash2, ExternalLink } from 'lucide-react';
import { EnhancedSelect, MonthYearPicker } from '../components/UI';
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



const MonthlyReview: React.FC = () => {
  const { clinicianId } = useParams<{ clinicianId: string }>();
  const navigate = useNavigate();
  const { profiles, kpis, loading, error } = useData();
  const { user } = useAuth();
  const formatName = useNameFormatter();
  
  // Determine if this is "My Reviews" mode (viewing own reviews) or reviewing someone else
  const isMyReviewsMode = !clinicianId && window.location.pathname === '/my-reviews';
  const targetStaffId = isMyReviewsMode ? user?.id : clinicianId;
  const clinician = profiles.find(c => c.id === targetStaffId);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reviewData, setReviewData] = useState<ReviewFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [existingReviews, setExistingReviews] = useState<ReviewItem[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  
  // State for MonthYearPicker dropdowns
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [mobileMonthPickerOpen, setMobileMonthPickerOpen] = useState(false);

  // Load existing reviews for the selected period
  const loadReviewsForPeriod = async (month: string, year: number) => {
    if (!targetStaffId) return;
    
    setIsLoading(true);
    try {
      const monthNumber = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;
      const reviews = await ReviewService.getReviewsByPeriod(targetStaffId, monthNumber, year);
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

  // Load data when month/year changes
  useEffect(() => {
    if (targetStaffId && kpis.length > 0) {
      setHasLoadedData(false);
      setReviewData({});
      setExistingReviews([]);
      loadReviewsForPeriod(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, targetStaffId, kpis.length]);

  // Load most recent data as defaults if no existing reviews found
  useEffect(() => {
    if (hasLoadedData && existingReviews.length === 0 && Object.keys(reviewData).length === 0) {
      loadMostRecentReviews();
    }
  }, [hasLoadedData, existingReviews.length, Object.keys(reviewData).length]);

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];
    let completedKPIsCount = 0;

    kpis.forEach(kpi => {
      const kpiData = reviewData[kpi.id];
      
      // Count completed KPIs
      if (kpiData?.met !== null && kpiData?.met !== undefined) {
        completedKPIsCount++;
      }

      // If KPI status is selected, validate additional fields
      if (kpiData?.met !== null && kpiData?.met !== undefined) {
        // If KPI was not met, validate required fields
        if (kpiData.met === false) {
          if (!kpiData.reviewDate) {
            newErrors[kpi.id] = 'Review date is required when KPI is not met';
          } else if (kpiData.reviewDate > today) {
            newErrors[kpi.id] = 'Review date cannot be in the future';
          }

          if (!kpiData.notes?.trim()) {
            newErrors[kpi.id] = 'Performance notes are required when KPI is not met';
          }

          if (!kpiData.plan?.trim()) {
            newErrors[kpi.id] = 'Improvement plan is required when KPI is not met';
          }
        }
      }
    });

    // Check if at least one KPI is completed
    if (completedKPIsCount === 0) {
      setSubmitError('Please complete at least one KPI review before saving');
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    setSubmitError(null);
    return Object.keys(newErrors).length === 0;
  };

  const calculateScore = () => {
    let totalWeight = 0;
    let earnedWeight = 0;
    
    kpis.forEach(kpi => {
      totalWeight += kpi.weight;
      if (reviewData[kpi.id]?.met === true) {
        earnedWeight += kpi.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Average';
    return 'Needs Improvement';
  };

  const handleDownloadPDF = () => {
    if (!clinician) {
      alert('Clinician data not found');
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
      
      // Calculate score based on existing reviews
      const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
      const earnedWeight = existingReviews.reduce((sum, review) => {
        const kpi = kpis.find(k => k.id === review.kpi);
        return sum + (kpi && review.met_check ? kpi.weight : 0);
      }, 0);
      const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
      
      generateReviewPDF(clinicianData, kpis, reviewDataForPDF, selectedMonth, selectedYear, score);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Automatically handle existing reviews - replace them for the same month/year/KPI
    await submitReviews('auto');
  };

  const submitReviews = async (action: 'update' | 'create' | 'auto') => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Submit each completed KPI review
      for (const [kpiId, data] of Object.entries(reviewData)) {
        if (data.met !== null && data.met !== undefined) {
          const kpi = kpis.find(k => k.id === kpiId);
          if (!kpi) continue;
          
          const score = data.met ? kpi.weight : 0;
          
          // Determine file URL to save
          let fileUrl: string | undefined;
          if (!data.met) { // Only save file URL if KPI was not met
            if (data.uploadedFiles && data.uploadedFiles.length > 0) {
              // Use the first uploaded file URL (you could modify this to handle multiple files)
              fileUrl = data.uploadedFiles[0].url;
            } else if (data.existingFileUrl) {
              // Keep existing file URL if no new files uploaded
              fileUrl = data.existingFileUrl;
            }
          }
          
          if (action === 'auto') {
            // Auto mode: Replace existing review for this month/year/KPI combination
            const monthNumber = new Date(Date.parse(selectedMonth + " 1, 2000")).getMonth() + 1;
            
            await ReviewService.replaceReviewForPeriod(
              clinician.id,
              kpiId,
              monthNumber,
              selectedYear,
              {
                clinician: clinician.id,
                kpi: kpiId,
                director: user?.id,
                met_check: data.met,
                notes: data.met ? undefined : data.notes,
                plan: data.met ? undefined : data.plan,
                score: score,
                file_url: fileUrl
              }
            );
          } else if (action === 'update' && data.existingReviewId) {
            // Update existing review
            await ReviewService.updateReviewItem(data.existingReviewId, {
              met_check: data.met,
              notes: data.met ? undefined : data.notes,
              plan: data.met ? undefined : data.plan,
              score: score,
              file_url: fileUrl,
              director: user?.id // Add director ID when updating
            });
          } else {
            // Create new review
            await ReviewService.createReviewItem({
              clinician: clinician.id,
              kpi: kpiId,
              director: user?.id, // Add director ID when creating
              met_check: data.met,
              notes: data.met ? undefined : data.notes,
              plan: data.met ? undefined : data.plan,
              score: score,
              file_url: fileUrl
            });
          }
        }
      }
      
      // Navigate back to clinician management page
      navigate('/clinicians');
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // MonthYearPicker handlers
  const handleMonthYearSelect = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setMonthPickerOpen(false);
  };

  const handleMobileMonthYearSelect = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setMobileMonthPickerOpen(false);
  };

  const score = calculateScore();
  const completedKPIs = Object.values(reviewData).filter(data => data.met !== null && data.met !== undefined).length;
  const totalKPIs = kpis.length;
  const hasAnyData = completedKPIs > 0;

  // If in "My Reviews" mode, render a profile-like view
  if (isMyReviewsMode) {
    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className={`w-20 h-20 ${clinician.position_info?.role === 'director' ? 'bg-purple-600' : 'bg-blue-600'} rounded-full flex items-center justify-center`}>
                <span className="text-white text-2xl font-bold">
                  {clinician.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{clinician.name}</h1>
                  {clinician.position_info?.role === 'director' && (
                    <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                      Director
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{clinician.position_info?.position_title}</p>
                <p className="text-gray-600">
                  {clinician.position_info?.role === 'director' 
                    ? clinician.director_info?.direction || 'General Direction'
                    : clinician.clinician_info?.type_info?.title || 'General'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4 mb-2">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Username</div>
                  <div className="font-medium">{clinician.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Start Date</div>
                  <div className="font-medium">{new Date(clinician.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Month/Year Selection and Performance Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
            <div className="flex items-center space-x-4">
              <MonthYearPicker
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onSelect={handleMonthYearSelect}
                isOpen={monthPickerOpen}
                onToggle={() => setMonthPickerOpen(!monthPickerOpen)}
              />
              <button
                onClick={handleDownloadPDF}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Summary</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Review Progress for {selectedMonth} {selectedYear}</span>
                <p className="text-xs text-gray-500 mt-1">Track your KPI review completion status</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">{kpis.length > 0 ? Math.round((existingReviews.length / kpis.length) * 100) : 0}%</span>
                <p className="text-xs text-gray-600">{existingReviews.length}/{kpis.length} completed</p>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-4 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-4 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${kpis.length > 0 ? (existingReviews.length / kpis.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
                {existingReviews.length} reviewed
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
                {kpis.length - existingReviews.length} pending
              </span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{calculateScore()}%</div>
              <div className="text-sm text-blue-700">Current Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {existingReviews.filter(r => {
                  const kpi = kpis.find(k => k.id === r.kpi);
                  return kpi && r.met_check;
                }).length}
              </div>
              <div className="text-sm text-green-700">KPIs Met</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {existingReviews.filter(r => {
                  const kpi = kpis.find(k => k.id === r.kpi);
                  return kpi && !r.met_check;
                }).length}
              </div>
              <div className="text-sm text-red-700">KPIs Not Met</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{existingReviews.length}</div>
              <div className="text-sm text-gray-700">Total Reviewed</div>
            </div>
          </div>
        </div>

        {/* KPI Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">KPI Details - {selectedMonth} {selectedYear}</h3>
            {existingReviews.length === kpis.length && kpis.length > 0 && (
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>All Reviews Complete</span>
              </span>
            )}
          </div>
          {existingReviews.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Reviews Found</h4>
              <p className="text-gray-600 mb-4">
                No KPI reviews have been conducted for {selectedMonth} {selectedYear}.
              </p>
              <p className="text-sm text-gray-500">
                Try selecting a different month or contact your supervisor if you believe this is an error.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {kpis.map((kpi) => {
              const review = existingReviews.find(r => r.kpi === kpi.id);
              const isMet = review?.met_check;
              
              return (
                <div key={kpi.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Status Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        review ? (isMet ? 'bg-green-100' : 'bg-red-100') : 'bg-gray-100'
                      }`}>
                        {review ? (
                          isMet ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{kpi.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Weight: {kpi.weight}%</span>
                      {review ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isMet ? 'Met' : 'Not Met'}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                          Not Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual KPI Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          review ? (isMet ? 'bg-green-600' : 'bg-red-600') : 'bg-gray-300'
                        }`}
                        style={{ width: review ? (isMet ? '100%' : '0%') : '0%' }}
                      />
                    </div>
                  </div>
                  
                  {review && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      {review.review_date && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Review Date: </span>
                          <span className="text-sm text-gray-600">{new Date(review.review_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {review.notes && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Notes: </span>
                          <p className="text-sm text-gray-600 mt-1">{review.notes}</p>
                        </div>
                      )}
                      {review.plan && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Improvement Plan: </span>
                          <p className="text-sm text-gray-600 mt-1">{review.plan}</p>
                        </div>
                      )}
                      {review.file_url && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Supporting File: </span>
                          <a
                            href={review.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline ml-1"
                          >
                            View File
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isMyReviewsMode ? 'My Reviews' : 'Monthly KPI Review'}
              </h2>
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-600">Loading...</span>
                </div>
              )}
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {isMyReviewsMode 
                ? `Viewing your performance reviews and uploading supporting documentation`
                : `Conducting performance review for ${formatName(clinician.name)}`
              }
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 space-y-1 sm:space-y-0">
              <span className="text-xs sm:text-sm text-gray-500">
                {clinician.position_info?.position_title || 'Staff Member'}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
              <span className="text-xs sm:text-sm text-gray-500">
                {clinician.position_info?.role === 'director' 
                  ? clinician.director_info?.direction || 'General Direction'
                  : clinician.clinician_info?.type_info?.title || 'General'
                }
              </span>
              {existingReviews.length > 0 && (
                <>
                  <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">•</span>
                  <span className="text-xs sm:text-sm text-green-600 font-medium">
                    {existingReviews.length} existing review{existingReviews.length > 1 ? 's' : ''} found
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* PDF Download Button */}
            {hasAnyData && (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm sm:text-base"
                title="Download PDF Report"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            )}
            
            <div className="flex justify-center">
              <MonthYearPicker
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onSelect={handleMobileMonthYearSelect}
                isOpen={mobileMonthPickerOpen}
                onToggle={() => setMobileMonthPickerOpen(!mobileMonthPickerOpen)}
              />
            </div>
          </div>
        </div>

        {/* Progress and Score Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-blue-900">Review Progress</span>
              <span className="text-base sm:text-lg font-bold text-blue-600">{completedKPIs}/{totalKPIs}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedKPIs / totalKPIs) * 100}%` }}
              />
            </div>
          </div>

          <div className={`rounded-lg p-3 sm:p-4 border ${getScoreColor(score)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium">Projected Score</span>
              <span className="text-base sm:text-lg font-bold">{score}%</span>
            </div>
            <div className="text-xs sm:text-sm font-medium">{getScoreLabel(score)}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">KPIs Not Met</span>
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {Object.values(reviewData).filter(data => data.met === false).length}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Require action plans</div>
          </div>
        </div>

        {/* PDF Download Info */}
        {hasAnyData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Download className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-green-700">
                You can download a PDF report of this review at any time using the "Download PDF" button above.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Reviews */}
      <div className="space-y-4 sm:space-y-6">
        {kpis.map((kpi, index) => {
          const kpiData = reviewData[kpi.id] || {};
          const isMet = kpiData.met;
          const hasError = errors[kpi.id];
          
          return (
            <div key={kpi.id} className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="p-4 sm:p-6">
                {/* KPI Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 space-y-4 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-3 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{kpi.title}</h3>
                      </div>
                      <div className="flex items-center space-x-2 ml-11 sm:ml-0">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Weight: {kpi.weight}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{kpi.description}</p>
                  </div>
                </div>

                {/* Error Message */}
                {hasError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-red-700 font-medium">{hasError}</span>
                    </div>
                  </div>
                )}

                {/* KPI Status Selection */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                  <span className="text-sm font-medium text-gray-700">
                    KPI Status:
                    {isMyReviewsMode && (
                      <span className="text-xs text-gray-500 ml-2">(Set by your supervisor)</span>
                    )}
                  </span>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      onClick={isMyReviewsMode ? undefined : () => handleKPIChange(kpi.id, 'met', true)}
                      disabled={isMyReviewsMode}
                      className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                        isMet === true 
                          ? 'bg-green-600 text-white shadow-lg' + (isMyReviewsMode ? '' : ' transform scale-105')
                          : isMyReviewsMode 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 border border-gray-200'
                      }`}
                    >
                      <Check className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span>Met / Exceeded</span>
                    </button>
                    <button
                      onClick={isMyReviewsMode ? undefined : () => handleKPIChange(kpi.id, 'met', false)}
                      disabled={isMyReviewsMode}
                      className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                        isMet === false 
                          ? 'bg-red-600 text-white shadow-lg' + (isMyReviewsMode ? '' : ' transform scale-105')
                          : isMyReviewsMode 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200'
                      }`}
                    >
                      <X className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span>Not Met</span>
                    </button>
                  </div>
                </div>

                {/* Additional fields for unmet KPIs */}
                {isMet === false && (
                  <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Review Date {!isMyReviewsMode && '*'}
                          {isMyReviewsMode && (
                            <span className="text-xs text-gray-500 ml-2">(Set by supervisor)</span>
                          )}
                        </label>
                        <input
                          type="date"
                          value={kpiData.reviewDate || ''}
                          onChange={isMyReviewsMode ? undefined : (e) => handleKPIChange(kpi.id, 'reviewDate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm sm:text-base ${
                            isMyReviewsMode 
                              ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                          }`}
                          max={new Date().toISOString().split('T')[0]}
                          required={!isMyReviewsMode}
                          disabled={isMyReviewsMode}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {isMyReviewsMode 
                            ? 'Date when this KPI was discussed with you'
                            : 'Date when this KPI was discussed with the clinician'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          <Upload className="w-4 h-4 inline mr-1" />
                          {isMyReviewsMode ? 'Your Supporting Files' : 'Supporting Files'}
                        </label>
                        
                        {/* File Upload Input */}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                          onChange={isMyReviewsMode ? undefined : (e) => handleFileUpload(kpi.id, e.target.files)}
                          className={`w-full px-3 py-2 border rounded-lg file:mr-2 sm:file:mr-4 file:py-1 file:px-2 sm:file:px-3 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-medium ${
                            isMyReviewsMode 
                              ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed file:bg-gray-100 file:text-gray-400'
                              : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
                          }`}
                          disabled={isMyReviewsMode || uploadingFiles[kpi.id]}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {isMyReviewsMode 
                            ? 'Upload your supporting documents, evidence, or explanations (Max 10MB per file)'
                            : 'Upload PDFs, screenshots, or other supporting documents (Max 10MB per file)'
                          }
                        </p>
                        
                        {/* Upload Progress */}
                        {uploadingFiles[kpi.id] && (
                          <div className="mt-2 flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                            <span className="text-xs sm:text-sm text-blue-600">Uploading files...</span>
                          </div>
                        )}
                        
                        {/* Selected Files (before upload) */}
                        {kpiData.files && kpiData.files.length > 0 && !uploadingFiles[kpi.id] && (
                          <div className="mt-2">
                            <p className="text-xs text-blue-600">{kpiData.files.length} file(s) selected for upload</p>
                          </div>
                        )}
                        
                        {/* Existing File from Database */}
                        {kpiData.existingFileUrl && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <File className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-gray-700 truncate">
                                  {FileUploadService.getFileInfoFromUrl(kpiData.existingFileUrl).name}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded flex-shrink-0">
                                  Existing
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => window.open(kpiData.existingFileUrl, '_blank')}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="View file"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingFile(kpi.id)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="Remove file"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Uploaded Files */}
                        {kpiData.uploadedFiles && kpiData.uploadedFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {kpiData.uploadedFiles.map((file, index) => (
                              <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    <File className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-green-700 font-medium truncate">{file.name}</span>
                                    <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded flex-shrink-0">
                                      {FileUploadService.formatFileSize(file.size)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => window.open(file.url, '_blank')}
                                      className="text-green-600 hover:text-green-800 transition-colors"
                                      title="View file"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    {!isMyReviewsMode && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveUploadedFile(kpi.id, index)}
                                        className="text-red-600 hover:text-red-800 transition-colors"
                                        title="Remove file"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        {isMyReviewsMode ? 'Performance Notes' : 'Performance Notes *'}
                        {isMyReviewsMode && (
                          <span className="text-xs text-gray-500 ml-2">(From your supervisor)</span>
                        )}
                      </label>
                      <textarea
                        value={kpiData.notes || ''}
                        onChange={isMyReviewsMode ? undefined : (e) => handleKPIChange(kpi.id, 'notes', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm sm:text-base ${
                          isMyReviewsMode 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        }`}
                        rows={4}
                        placeholder={isMyReviewsMode 
                          ? "Notes from your supervisor about this KPI performance..."
                          : "Detailed notes from the performance conversation, including specific examples and context..."
                        }
                        required={!isMyReviewsMode}
                        disabled={isMyReviewsMode}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        {isMyReviewsMode ? 'Improvement Plan' : 'Improvement Plan *'}
                        {isMyReviewsMode && (
                          <span className="text-xs text-gray-500 ml-2">(From your supervisor)</span>
                        )}
                      </label>
                      <textarea
                        value={kpiData.plan || ''}
                        onChange={isMyReviewsMode ? undefined : (e) => handleKPIChange(kpi.id, 'plan', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm sm:text-base ${
                          isMyReviewsMode 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        }`}
                        rows={4}
                        placeholder={isMyReviewsMode 
                          ? "Improvement plan provided by your supervisor..."
                          : "Specific action plan for improvement, including timelines, resources, training, or support needed..."
                        }
                        required={!isMyReviewsMode}
                        disabled={isMyReviewsMode}
                      />
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
            </div>
          );
        })}
      </div>

      {/* Submit Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
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
                disabled={isSubmitting || completedKPIs === 0}
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
        
        {completedKPIs === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-yellow-700">
                Please complete at least one KPI review before saving changes.
              </span>
            </div>
          </div>
        )}
        
        {completedKPIs > 0 && completedKPIs < totalKPIs && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-blue-700">
                You can save changes with {completedKPIs} of {totalKPIs} KPIs completed. Remaining KPIs can be completed later.
              </span>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default MonthlyReview;