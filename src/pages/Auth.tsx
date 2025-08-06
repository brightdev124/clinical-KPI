import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SecurityQuestionService } from '../services/securityQuestionService';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
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
    }
  }, [isAuthenticated, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <img src="/assets/logo_simple.png" alt="KPI Brain Logo" className="h-12 flex-shrink-0" />
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                KPI Brain
              </span>
            </div>
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
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Reset Complete!</h3>
                    <p className="text-gray-600">Your password has been successfully reset. You can now sign in with your new password.</p>
                  </div>
                  <button
                    onClick={() => {
                      setMode('login');
                      resetForgotPassword();
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Sign In
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
                    <User className="w-4 h-4 inline mr-1" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  {mode === 'login' ? 'Username or Email' : 'Username'}
                </label>
                <input
                  type="text"
                  value={mode === 'login' ? usernameOrEmail : username}
                  onChange={(e) => mode === 'login' ? setUsernameOrEmail(e.target.value) : setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder={mode === 'login' ? 'Enter username or email' : 'Enter username'}
                  required
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'director' | 'clinician')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="clinician">Employee</option>
                    <option value="director">Director</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                    placeholder="Enter password"
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

              {/* Security Question Section for Signup */}
              {mode === 'signup' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableSecurityQuestion"
                      checked={enableSecurityQuestion}
                      onChange={(e) => setEnableSecurityQuestion(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enableSecurityQuestion" className="text-sm font-medium text-gray-700">
                      Set up security question for password recovery
                    </label>
                  </div>

                  {enableSecurityQuestion && (
                    <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <HelpCircle className="w-4 h-4 inline mr-1" />
                          Security Question
                        </label>
                        <input
                          type="text"
                          value={customSecurityQuestion}
                          onChange={(e) => setCustomSecurityQuestion(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          placeholder="e.g., What was your first pet's name?"
                        />
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
                        />
                        <p className="text-xs text-gray-500 mt-1">Keep this answer safe - you'll need it to reset your password</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('forgot-password')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Forgot your password?
                </button>
                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in
                </button>
              </div>
            )}

            {mode === 'forgot-password' && forgotPasswordStep !== 'success' && (
              <div className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    resetForgotPassword();
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;