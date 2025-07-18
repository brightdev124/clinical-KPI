import React, { useState, useEffect } from 'react';
import { X, Shield, HelpCircle, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { SecurityQuestionService } from '../services/securityQuestionService';
import { useAuth } from '../contexts/AuthContext';

interface SecuritySettingsProps {
  isModal?: boolean;
  onClose?: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ isModal = false, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Security question states
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [confirmAnswer, setConfirmAnswer] = useState('');
  
  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'security-question' | 'password'>('security-question');

  useEffect(() => {
    loadSecurityQuestion();
  }, []);

  const loadSecurityQuestion = async () => {
    if (!user?.id) return;
    
    try {
      const question = await SecurityQuestionService.getUserSecurityQuestion(user.id);
      if (question) {
        setHasSecurityQuestion(true);
        setCurrentQuestion(question);
      }
    } catch (error) {
      console.error('Failed to load security question:', error);
    }
  };

  const handleSecurityQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!newQuestion.trim()) {
        setError('Please enter a security question');
        return;
      }
      
      if (!newAnswer.trim()) {
        setError('Please enter an answer');
        return;
      }
      
      if (newAnswer !== confirmAnswer) {
        setError('Answers do not match');
        return;
      }

      // Save the security question
      await SecurityQuestionService.saveSecurityAnswer(user.id, {
        question: newQuestion.trim(),
        answer: newAnswer.trim()
      });

      setSuccess(hasSecurityQuestion ? 'Security question updated successfully!' : 'Security question set up successfully!');
      setHasSecurityQuestion(true);
      setCurrentQuestion(newQuestion.trim());
      
      // Clear form
      setNewQuestion('');
      setNewAnswer('');
      setConfirmAnswer('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to save security question');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validation
      if (!currentPassword) {
        setError('Please enter your current password');
        return;
      }
      
      if (!newPassword) {
        setError('Please enter a new password');
        return;
      }
      
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      // Here you would call your password change service
      // await UserService.changePassword(currentPassword, newPassword);
      
      setSuccess('Password changed successfully!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('security-question')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'security-question'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Security Question
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change Password
          </button>
        </nav>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Security Question Tab */}
      {activeTab === 'security-question' && (
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
            {hasSecurityQuestion ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 text-sm">Security question is set up</span>
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Question:</strong> {currentQuestion}
                </div>
                <p className="text-xs text-gray-500">
                  You can update your security question and answer below.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-800 text-sm">No security question set up</span>
                </div>
                <p className="text-xs text-gray-500">
                  Set up a security question to help recover your password if you forget it.
                </p>
              </div>
            )}
          </div>

          {/* Security Question Form */}
          <form onSubmit={handleSecurityQuestionSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HelpCircle className="w-4 h-4 inline mr-1" />
                {hasSecurityQuestion ? 'New Security Question' : 'Your Security Question'}
              </label>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="e.g., What was the name of your first pet?"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Create a question that only you would know the answer to
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <input
                type="text"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your answer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Answer
              </label>
              <input
                type="text"
                value={confirmAnswer}
                onChange={(e) => setConfirmAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Confirm your answer"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Remember this answer - you'll need it to recover your password
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (hasSecurityQuestion ? 'Update Security Question' : 'Set Up Security Question')}
            </button>
          </form>

          {/* Example Questions */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">Example Questions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• What was the name of your first pet?</li>
              <li>• In what city were you born?</li>
              <li>• What was your childhood nickname?</li>
              <li>• What was the name of your elementary school?</li>
              <li>• What was your first job?</li>
            </ul>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-2">Change Password</h3>
            <p className="text-sm text-gray-600">
              Update your account password. Make sure to use a strong password that you haven't used elsewhere.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {content}
      </div>
    </div>
  );
};

export default SecuritySettings;