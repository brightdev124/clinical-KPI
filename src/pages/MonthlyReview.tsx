import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { ReviewService, ReviewItem } from '../services/reviewService';
import { FileUploadService, UploadedFile } from '../services/fileUploadService';
import { Check, X, Calendar, FileText, Upload, Save, AlertCircle, Target, TrendingUp, Download, RefreshCw, Edit, Plus, File, Trash2, ExternalLink } from 'lucide-react';
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

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'update' | 'create') => void;
  existingReviewsCount: number;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, existingReviewsCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Existing Reviews Found
        </h3>
        <p className="text-gray-600 mb-6">
          Found {existingReviewsCount} existing review{existingReviewsCount > 1 ? 's' : ''} for this period. 
          Would you like to update the existing review{existingReviewsCount > 1 ? 's' : ''} or create new one{existingReviewsCount > 1 ? 's' : ''}?
        </p>
        <div className="flex space-x-3">
          <button
            onClick={() => onConfirm('update')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Update Existing</span>
          </button>
          <button
            onClick={() => onConfirm('create')}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const MonthlyReview: React.FC = () => {
  const { clinicianId } = useParams<{ clinicianId: string }>();
  const navigate = useNavigate();
  const { profiles, kpis, loading, error } = useData();
  
  const clinician = profiles.find(c => c.id === clinicianId);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reviewData, setReviewData] = useState<ReviewFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [existingReviews, setExistingReviews] = useState<ReviewItem[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  // Load existing reviews for the selected period
  const loadReviewsForPeriod = async (month: string, year: number) => {
    if (!clinicianId) return;
    
    setIsLoading(true);
    try {
      const monthNumber = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;
      const reviews = await ReviewService.getReviewsByPeriod(clinicianId, monthNumber, year);
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
    if (!clinicianId || hasLoadedData) return;
    
    setIsLoading(true);
    try {
      const allReviews = await ReviewService.getClinicianReviews(clinicianId);
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
    if (clinicianId && kpis.length > 0) {
      setHasLoadedData(false);
      setReviewData({});
      setExistingReviews([]);
      loadReviewsForPeriod(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, clinicianId, kpis.length]);

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Clinician Not Found</h2>
          <p className="text-gray-600">The requested clinician could not be found.</p>
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
      if (!clinicianId) throw new Error('Clinician ID not found');
      
      const uploadedFiles = await FileUploadService.uploadFiles(
        fileArray,
        clinicianId,
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
    const score = calculateScore();
    generateReviewPDF(clinician, kpis, reviewData, selectedMonth, selectedYear, score);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Check if there are existing reviews that would conflict
    const completedKPIs = Object.entries(reviewData).filter(([_, data]) => 
      data.met !== null && data.met !== undefined
    );
    
    const existingReviewsForCompletedKPIs = completedKPIs.filter(([kpiId, data]) => 
      data.existingReviewId
    );

    // If there are existing reviews, show confirmation modal
    if (existingReviewsForCompletedKPIs.length > 0) {
      setShowConfirmModal(true);
      return;
    }

    // No existing reviews, proceed with creation
    await submitReviews('create');
  };

  const submitReviews = async (action: 'update' | 'create') => {
    setIsSubmitting(true);
    setSubmitError(null);
    setShowConfirmModal(false);
    
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
          
          if (action === 'update' && data.existingReviewId) {
            // Update existing review
            await ReviewService.updateReviewItem(data.existingReviewId, {
              met_check: data.met,
              notes: data.met ? undefined : data.notes,
              plan: data.met ? undefined : data.plan,
              score: score,
              file_url: fileUrl
            });
          } else {
            // Create new review
            await ReviewService.createReviewItem({
              clinician: clinician.id,
              kpi: kpiId,
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

  const score = calculateScore();
  const completedKPIs = Object.values(reviewData).filter(data => data.met !== null && data.met !== undefined).length;
  const totalKPIs = kpis.length;
  const hasAnyData = completedKPIs > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">Monthly KPI Review</h2>
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-600">Loading...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 mt-1">Conducting performance review for {clinician.name}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-gray-500">{clinician.position_info?.position_title || 'Clinician'}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{clinician.clinician_info?.type_info?.title || 'General'}</span>
              {existingReviews.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-green-600 font-medium">
                    {existingReviews.length} existing review{existingReviews.length > 1 ? 's' : ''} found
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* PDF Download Button */}
            {hasAnyData && (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                title="Download PDF Report"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            )}
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => 
                new Date(0, i).toLocaleString('default', { month: 'long' })
              ).map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[2023, 2024, 2025].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress and Score Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Review Progress</span>
              <span className="text-lg font-bold text-blue-600">{completedKPIs}/{totalKPIs}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedKPIs / totalKPIs) * 100}%` }}
              />
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${getScoreColor(score)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Projected Score</span>
              <span className="text-lg font-bold">{score}%</span>
            </div>
            <div className="text-sm font-medium">{getScoreLabel(score)}</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">KPIs Not Met</span>
              <span className="text-lg font-bold text-gray-900">
                {Object.values(reviewData).filter(data => data.met === false).length}
              </span>
            </div>
            <div className="text-sm text-gray-600">Require action plans</div>
          </div>
        </div>

        {/* PDF Download Info */}
        {hasAnyData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                You can download a PDF report of this review at any time using the "Download PDF" button above.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Reviews */}
      <div className="space-y-6">
        {kpis.map((kpi, index) => {
          const kpiData = reviewData[kpi.id] || {};
          const isMet = kpiData.met;
          const hasError = errors[kpi.id];
          
          return (
            <div key={kpi.id} className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="p-6">
                {/* KPI Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">{kpi.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Weight: {kpi.weight}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{kpi.description}</p>
                  </div>
                </div>

                {/* Error Message */}
                {hasError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700 font-medium">{hasError}</span>
                    </div>
                  </div>
                )}

                {/* KPI Status Selection */}
                <div className="flex items-center space-x-4 mb-6">
                  <span className="text-sm font-medium text-gray-700">KPI Status:</span>
                  <button
                    onClick={() => handleKPIChange(kpi.id, 'met', true)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isMet === true 
                        ? 'bg-green-600 text-white shadow-lg transform scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 border border-gray-200'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    <span>Met / Exceeded</span>
                  </button>
                  <button
                    onClick={() => handleKPIChange(kpi.id, 'met', false)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isMet === false 
                        ? 'bg-red-600 text-white shadow-lg transform scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200'
                    }`}
                  >
                    <X className="w-5 h-5" />
                    <span>Not Met</span>
                  </button>
                </div>

                {/* Additional fields for unmet KPIs */}
                {isMet === false && (
                  <div className="space-y-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Review Date *
                        </label>
                        <input
                          type="date"
                          value={kpiData.reviewDate || ''}
                          onChange={(e) => handleKPIChange(kpi.id, 'reviewDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          max={new Date().toISOString().split('T')[0]}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Date when this KPI was discussed with the clinician</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Upload className="w-4 h-4 inline mr-1" />
                          Supporting Files
                        </label>
                        
                        {/* File Upload Input */}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                          onChange={(e) => handleFileUpload(kpi.id, e.target.files)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          disabled={uploadingFiles[kpi.id]}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Upload PDFs, screenshots, or other supporting documents (Max 10MB per file)
                        </p>
                        
                        {/* Upload Progress */}
                        {uploadingFiles[kpi.id] && (
                          <div className="mt-2 flex items-center space-x-2">
                            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                            <span className="text-sm text-blue-600">Uploading files...</span>
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
                              <div className="flex items-center space-x-2">
                                <File className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-700">
                                  {FileUploadService.getFileInfoFromUrl(kpiData.existingFileUrl).name}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  Existing
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
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
                                  <div className="flex items-center space-x-2">
                                    <File className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-700 font-medium">{file.name}</span>
                                    <span className="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">
                                      {FileUploadService.formatFileSize(file.size)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => window.open(file.url, '_blank')}
                                      className="text-green-600 hover:text-green-800 transition-colors"
                                      title="View file"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUploadedFile(kpi.id, index)}
                                      className="text-red-600 hover:text-red-800 transition-colors"
                                      title="Remove file"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Performance Notes *
                      </label>
                      <textarea
                        value={kpiData.notes || ''}
                        onChange={(e) => handleKPIChange(kpi.id, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Detailed notes from the performance conversation, including specific examples and context..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        Improvement Plan *
                      </label>
                      <textarea
                        value={kpiData.plan || ''}
                        onChange={(e) => handleKPIChange(kpi.id, 'plan', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        placeholder="Specific action plan for improvement, including timelines, resources, training, or support needed..."
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Success indicator for met KPIs */}
                {isMet === true && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">KPI successfully met - no additional action required</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Review Summary</h3>
            <p className="text-gray-600 mt-1">
              {completedKPIs} of {totalKPIs} KPIs reviewed • Projected Score: {score}%
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/clinicians')}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || completedKPIs === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
        
        {submitError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{submitError}</span>
            </div>
          </div>
        )}
        
        {completedKPIs === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">
                Please complete at least one KPI review before saving changes.
              </span>
            </div>
          </div>
        )}
        
        {completedKPIs > 0 && completedKPIs < totalKPIs && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                You can save changes with {completedKPIs} of {totalKPIs} KPIs completed. Remaining KPIs can be completed later.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={submitReviews}
        existingReviewsCount={Object.values(reviewData).filter(data => data.existingReviewId).length}
      />
    </div>
  );
};

export default MonthlyReview;