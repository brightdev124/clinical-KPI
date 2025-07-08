import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, User, Mail, Calendar, ChevronRight, ClipboardList, TrendingUp } from 'lucide-react';

const ClinicianManagement: React.FC = () => {
  const { clinicians, addClinician, updateClinician, deleteClinician, getClinicianScore } = useData();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingClinician, setEditingClinician] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    assignedDirector: '',
    startDate: '',
  });

  const positions = ['Staff Physician', 'Nurse Practitioner', 'Physician Assistant', 'Resident', 'Fellow'];
  const departments = ['Internal Medicine', 'Primary Care', 'Emergency Medicine', 'Pediatrics', 'Surgery'];

  // Filter clinicians based on user role - only directors can access this page
  const userClinicians = clinicians.filter(c => user?.assignedClinicians?.includes(c.id));

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClinician) {
      updateClinician({ ...editingClinician, ...formData });
      setEditingClinician(null);
    } else {
      addClinician({
        ...formData,
        assignedDirector: user?.role === 'clinical_director' ? user.id : formData.assignedDirector
      });
    }
    setFormData({ name: '', email: '', position: '', department: '', assignedDirector: '', startDate: '' });
    setShowForm(false);
  };

  const handleEdit = (clinician: any) => {
    setEditingClinician(clinician);
    setFormData({
      name: clinician.name,
      email: clinician.email,
      position: clinician.position,
      department: clinician.department,
      assignedDirector: clinician.assignedDirector,
      startDate: clinician.startDate,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this clinician?')) {
      deleteClinician(id);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinician Management</h2>
          <p className="text-gray-600 mt-1">Manage your clinical team members and track their performance</p>
        </div>
        {user?.role === 'clinical_director' && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Clinician</span>
          </button>
        )}
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {userClinicians.filter(c => getClinicianScore(c.id, currentMonth, currentYear) >= 90).length}
            </div>
            <div className="text-sm text-green-700">Excellent (90%+)</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {userClinicians.filter(c => {
                const score = getClinicianScore(c.id, currentMonth, currentYear);
                return score >= 80 && score < 90;
              }).length}
            </div>
            <div className="text-sm text-blue-700">Good (80-89%)</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {userClinicians.filter(c => {
                const score = getClinicianScore(c.id, currentMonth, currentYear);
                return score >= 70 && score < 80;
              }).length}
            </div>
            <div className="text-sm text-yellow-700">Average (70-79%)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {userClinicians.filter(c => getClinicianScore(c.id, currentMonth, currentYear) < 70).length}
            </div>
            <div className="text-sm text-red-700">Needs Attention (&lt;70%)</div>
          </div>
        </div>
      </div>

      {/* Clinician Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userClinicians.map((clinician) => {
          const currentScore = getClinicianScore(clinician.id, currentMonth, currentYear);
          const scoreColorClass = getPerformanceColor(currentScore);
          
          return (
            <div key={clinician.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {clinician.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {user?.role === 'clinical_director' && (
                    <>
                      <button
                        onClick={() => handleEdit(clinician)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{clinician.name}</h3>
                  <p className="text-sm text-gray-600">{clinician.position}</p>
                  <p className="text-sm text-gray-600">{clinician.department}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{clinician.email}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Since {new Date(clinician.startDate).toLocaleDateString()}
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
                
                {user?.role === 'clinical_director' && (
                  <div className="flex space-x-2">
                    <Link
                      to={`/review/${clinician.id}`}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center"
                    >
                      <ClipboardList className="w-4 h-4 mr-1" />
                      Review
                    </Link>
                    <Link
                      to="/analytics"
                      className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Analytics
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingClinician ? 'Edit Clinician' : 'Add New Clinician'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Position</option>
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingClinician(null);
                    setFormData({ name: '', email: '', position: '', department: '', assignedDirector: '', startDate: '' });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingClinician ? 'Update' : 'Add'} Clinician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicianManagement;