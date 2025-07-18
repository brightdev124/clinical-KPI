import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { SecurityQuestionService } from '../services/securityQuestionService';
import { Activity, User, Mail, Lock, Eye, EyeOff, Building, MapPin, Calendar, Shield, HelpCircle } from 'lucide-react';

interface Position {
  id: string;
  position_title: string;
  role: string;
  created_at: string;
}

interface ClinicianType {
  id: string;
  title: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    positionId: '',
    department: '',
    startDate: '',
    directorDirection: '',
    clinicianTypeId: ''
  });
  
  const [securityQuestion, setSecurityQuestion] = useState({
    enabled: false,
    question: '',
    answer: ''
  });

  const [positions, setPositions] = useState<Position[]>([]);
  const [clinicianTypes, setClinicianTypes] = useState<ClinicianType[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, signup } = useAuth();

  useEffect(() => {
    loadPositions();
    loadClinicianTypes();
  }, []);

  useEffect(() => {
    // Update selected role when position changes
    const selectedPosition = positions.find(p => p.id === formData.positionId);
    if (selectedPosition) {
      setSelectedRole(selectedPosition.role);
    }
  }, [formData.positionId, positions]);

  const loadPositions = async () => {
    try {
      const positionsData = await UserService.getAllPositions();
      setPositions(positionsData);
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  };

  const loadClinicianTypes = async () => {
    try {
      const typesData = await UserService.getAllClinicianTypes();
      setClinicianTypes(typesData);
    } catch (error) {
      console.error('Failed to load clinician types:', error);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecurityQuestionChange = (field: string, value: string | boolean) => {
    setSecurityQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!formData.positionId) {
      setError('Please select a position');
      return false;
    }

    if (selectedRole === 'director' && !formData.directorDirection) {
      setError('Director direction is required for director positions');
      return false;
    }

    if (selectedRole === 'clinician' && !formData.clinicianTypeId) {
      setError('Clinician type is required for clinician positions');
      return false;
    }

    if (securityQuestion.enabled) {
      if (!securityQuestion.question || !securityQuestion.answer) {
        setError('Please select a security question and provide an answer');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare user data based on role
      const userData: any = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        position_id: formData.positionId,
        department: formData.department,
        start_date: formData.startDate
      };

      // Add role-specific data
      if (selectedRole === 'director') {
        userData.director_direction = formData.directorDirection;
      } else if (selectedRole === 'clinician') {
        userData.clinician_type_id = formData.clinicianTypeId;
      }

      // Register the user
      const user = await signup(userData);

      // Save security question if enabled
      if (securityQuestion.enabled && user?.id) {
        await SecurityQuestionService.saveSecurityAnswer(user.id, {
          question: securityQuestion.question,
          answer: securityQuestion.answer
        });
      }

      // Registration successful - user will be redirected by auth context
    } catch (error: any) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const securityQuestions = SecurityQuestionService.getSecurityQuestions();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">Join the KPI Brain platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Full Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Username *
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Choose a username"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password Fields */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Password *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                placeholder="Create a password"
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
              Confirm Password *
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                placeholder="Confirm your password"
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

          {/* Position Selection */}
          <div>
            <label htmlFor="positionId" className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Position *
            </label>
            <select
              id="positionId"
              name="positionId"
              value={formData.positionId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            >
              <option value="">Select a position</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.position_title} ({position.role})
                </option>
              ))}
            </select>
          </div>

          {/* Role-specific fields */}
          {selectedRole === 'director' && (
            <div>
              <label htmlFor="directorDirection" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Director Direction *
              </label>
              <input
                id="directorDirection"
                name="directorDirection"
                type="text"
                value={formData.directorDirection}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter director direction"
                required
              />
            </div>
          )}

          {selectedRole === 'clinician' && (
            <div>
              <label htmlFor="clinicianTypeId" className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-1" />
                Clinician Type *
              </label>
              <select
                id="clinicianTypeId"
                name="clinicianTypeId"
                value={formData.clinicianTypeId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              >
                <option value="">Select clinician type</option>
                {clinicianTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional fields */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Department
            </label>
            <input
              id="department"
              name="department"
              type="text"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter department (optional)"
            />
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Security Question Section */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                id="enableSecurityQuestion"
                type="checkbox"
                checked={securityQuestion.enabled}
                onChange={(e) => handleSecurityQuestionChange('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableSecurityQuestion" className="ml-2 block text-sm font-medium text-gray-700">
                <HelpCircle className="w-4 h-4 inline mr-1" />
                Set up security question (optional)
              </label>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Security questions help you recover your password if you forget it
            </p>

            {securityQuestion.enabled && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="securityQuestionSelect" className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a Security Question
                  </label>
                  <select
                    id="securityQuestionSelect"
                    value={securityQuestion.question}
                    onChange={(e) => handleSecurityQuestionChange('question', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required={securityQuestion.enabled}
                  >
                    <option value="">Select a question</option>
                    {securityQuestions.map((question, index) => (
                      <option key={index} value={question}>
                        {question}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  <input
                    id="securityAnswer"
                    type="text"
                    value={securityQuestion.answer}
                    onChange={(e) => handleSecurityQuestionChange('answer', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your answer"
                    required={securityQuestion.enabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Answer is case-insensitive and will be stored securely
                  </p>
                </div>
              </div>
            )}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;