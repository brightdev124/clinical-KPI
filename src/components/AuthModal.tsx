import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Activity, Lock, User, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SecurityQuestionService } from '../services/securityQuestionService';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  mode: 'login' | 'signup' | 'forgot-password';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup' | 'forgot-password') => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitchMode }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'director' | 'clinician'>('clinician');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot password states
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'username' | 'question' | 'reset' | 'success'>('username');
  const [forgotUsername, setForgotUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Signup security question states
  const [enableSecurityQuestion, setEnableSecurityQuestion] = useState(false);
  const [customSecurityQuestion, setCustomSecurityQuestion] = useState('');
  const [signupSecurityAnswer, setSignupSecurityAnswer] = useState('');
  
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      onClose();
    }
  }, [isAuthenticated, navigate, onClose]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await login(usernameOrEmail, password);
        // Redirect handled by useEffect
      } else if (mode === 'signup') {
        // Signup mode
        if (!username || !password || !name || !role) {
          setError('All fields are required');
          return;
        }

        // Validate security question if enabled
        if (enableSecurityQuestion) {
          if (!customSecurityQuestion.trim() || !signupSecurityAnswer.trim()) {
            setError('Please enter a security question and provide an answer');
            return;
          }
        }
        
        // Create the user account
        const result = await signup(username, password, name, role);
        
        // If security question is enabled and signup was successful, save it
        if (enableSecurityQuestion && result?.id) {
          try {
            await SecurityQuestionService.saveSecurityAnswer(result.id, {
              question: customSecurityQuestion,
              answer: signupSecurityAnswer
            });
          } catch (securityError) {
            console.error('Failed to save security question:', securityError);
            // Don't fail the signup if security question save fails
          }
        }
        
        // Redirect handled by useEffect after successful signup
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (forgotPasswordStep === 'username') {
        const result = await SecurityQuestionService.getUserSecurityQuestionByUsername(forgotUsername);
        
        if (!result) {
          setError('Username not found');
          return;
        }

        if (!result.hasAnswer) {
          setError('No security question is set up for this account. Please contact an administrator.');
          return;
        }

        setSecurityQuestion(result.question);
        setForgotPasswordStep('question');
      } else if (forgotPasswordStep === 'question') {
        if (!securityAnswer.trim()) {
          setError('Please provide an answer');
          return;
        }
        setForgotPasswordStep('reset');
      } else if (forgotPasswordStep === 'reset') {
        if (newPassword.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }

        if (newPassword !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const success = await SecurityQuestionService.resetPasswordWithSecurityAnswer({
          username: forgotUsername,
          answer: securityAnswer,
          newPassword
        });

        if (!success) {
          setError('Incorrect answer to security question');
          setForgotPasswordStep('question');
          setSecurityAnswer('');
          return;
        }

        setForgotPasswordStep('success');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setForgotPasswordStep('username');
    setForgotUsername('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

 
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <img src="/assets/logo_simple.png" alt="KPI Brain Logo" className="h-10 flex-shrink-0" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                KPI Brain
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'login' ? 'Welcome Back' : 
               mode === 'signup' ? 'Get Started' : 
               'Reset Password'}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' ? 'Sign in to your KPI Brain account' : 
               mode === 'signup' ? 'Create your KPI Brain account' :
               forgotPasswordStep === 'username' ? 'Enter your username to get started' :
               forgotPasswordStep === 'question' ? 'Answer your security question' :
               forgotPasswordStep === 'reset' ? 'Create a new password' :
               'Password reset successful'}
            </p>
          </div>

        

          {/* Form */}
          {mode === 'forgot-password' ? (
            // Forgot Password Form
            <div className="space-y-6">
              {forgotPasswordStep === 'username' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Username
                    </label>
                    <input
                      type="text"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter your username"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? 'Checking...' : 'Continue'}
                  </button>
                </form>
              )}

              {forgotPasswordStep === 'question' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <HelpCircle className="w-4 h-4 inline mr-1" />
                      Security Question
                    </label>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-gray-800 font-medium">{securityQuestion}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Answer
                    </label>
                    <input
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter your answer"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Answer is case-insensitive</p>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
                      {error}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordStep('username')}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              )}

              {forgotPasswordStep === 'reset' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="w-4 h-4 inline mr-1" />
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                        placeholder="Enter new password"
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                        placeholder="Confirm new password"
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

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
                      {error}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setForgotPasswordStep('question')}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              )}

              {forgotPasswordStep === 'success' && (
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Password Reset Successful!</h3>
                    <p className="text-gray-600">
                      Your password has been successfully reset. You can now log in with your new password.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetForgotPassword();
                      onSwitchMode('login');
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Go to Login
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Login/Signup Form
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Role
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        id="admin"
                        name="role"
                        type="radio"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'director' | 'clinician')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="admin" className="ml-3 block text-sm font-medium text-gray-700">
                        Administrator
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="director"
                        name="role"
                        type="radio"
                        value="director"
                        checked={role === 'director'}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'director' | 'clinician')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="director" className="ml-3 block text-sm font-medium text-gray-700">
                        Director
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="clinician"
                        name="role"
                        type="radio"
                        value="clinician"
                        checked={role === 'clinician'}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'director' | 'clinician')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="clinician" className="ml-3 block text-sm font-medium text-gray-700">
                        Employee
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Security Question (Optional)</h4>
                      <p className="text-xs text-gray-500">Set up a security question to help recover your password</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableSecurityQuestion}
                        onChange={(e) => setEnableSecurityQuestion(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {enableSecurityQuestion && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <HelpCircle className="w-4 h-4 inline mr-1" />
                          Your Security Question
                        </label>
                        <input
                          type="text"
                          value={customSecurityQuestion}
                          onChange={(e) => setCustomSecurityQuestion(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="e.g., What was the name of your first pet?"
                          required={enableSecurityQuestion}
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
                          value={signupSecurityAnswer}
                          onChange={(e) => setSignupSecurityAnswer(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="Enter your answer"
                          required={enableSecurityQuestion}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Remember this answer - you'll need it to recover your password
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'login' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>
          )}

          {/* Switch Mode */}
          {mode !== 'forgot-password' && (
            <div className="mt-8 text-center space-y-3">
              <p className="text-gray-600">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
              
              {mode === 'login' && (
                <p className="text-gray-600">
                  <button
                    onClick={() => {
                      resetForgotPassword();
                      onSwitchMode('forgot-password');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot your password?
                  </button>
                </p>
              )}
            </div>
          )}

          {mode === 'forgot-password' && forgotPasswordStep !== 'success' && (
            <div className="mt-8 text-center space-y-2">
              <p className="text-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => {
                    resetForgotPassword();
                    onSwitchMode('login');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Sign in here
                </button>
              </p>
              {forgotPasswordStep !== 'username' && (
                <button
                  onClick={resetForgotPassword}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Start over
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;