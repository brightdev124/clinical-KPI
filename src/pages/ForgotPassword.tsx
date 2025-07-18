import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SecurityQuestionService } from '../services/securityQuestionService';
import { Activity, User, HelpCircle, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'username' | 'question' | 'reset' | 'success'>('username');
  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await SecurityQuestionService.getUserSecurityQuestionByUsername(username);
      
      if (!result) {
        setError('Username not found');
        setLoading(false);
        return;
      }

      if (!result.hasAnswer) {
        setError('No security question is set up for this account. Please contact an administrator.');
        setLoading(false);
        return;
      }

      setSecurityQuestion(result.question);
      setStep('question');
    } catch (error: any) {
      setError(error.message || 'Failed to retrieve security question');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!answer.trim()) {
      setError('Please provide an answer');
      return;
    }

    setStep('reset');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const success = await SecurityQuestionService.resetPasswordWithSecurityAnswer({
        username,
        answer,
        newPassword
      });

      if (!success) {
        setError('Incorrect answer to security question');
        setStep('question');
        setAnswer('');
        setLoading(false);
        return;
      }

      setStep('success');
    } catch (error: any) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('username');
    setUsername('');
    setSecurityQuestion('');
    setAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-gray-600 mt-2">
            {step === 'username' && 'Enter your username to get started'}
            {step === 'question' && 'Answer your security question'}
            {step === 'reset' && 'Create a new password'}
            {step === 'success' && 'Password reset successful'}
          </p>
        </div>

        {/* Step 1: Username */}
        {step === 'username' && (
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2: Security Question */}
        {step === 'question' && (
          <form onSubmit={handleAnswerSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HelpCircle className="w-4 h-4 inline mr-1" />
                Security Question
              </label>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-gray-800 font-medium">{securityQuestion}</p>
              </div>
            </div>

            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your answer"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Answer is case-insensitive
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('username')}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('question')}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Password Reset Successful!</h3>
              <p className="text-gray-600">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors inline-block text-center"
            >
              Go to Login
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        {step !== 'success' && (
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
            {step !== 'username' && (
              <button
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Start over
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;