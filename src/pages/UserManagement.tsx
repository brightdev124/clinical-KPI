import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, Trash2, User, Shield, Users, Link as LinkIcon, Settings } from 'lucide-react';
import { EnhancedSelect } from '../components/UI';
import { useNameFormatter } from '../utils/nameFormatter';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { clinicians, updateClinician } = useData();
  const formatName = useNameFormatter();
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedDirector, setSelectedDirector] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'clinician',
    assignedClinicians: [],
  });

  // Mock users data with enhanced relationships
  const [users, setUsers] = useState([
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      email: 'admin@clinic.com',
      role: 'admin',
      assignedClinicians: [],
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      email: 'director@clinic.com',
      role: 'clinical_director',
      assignedClinicians: ['3', '4', '5', '6', '7'],
    },
    {
      id: '8',
      name: 'Dr. Jennifer Park',
      email: 'jennifer.park@clinic.com',
      role: 'clinical_director',
      assignedClinicians: [],
    },
    {
      id: '3',
      name: 'Dr. Emily Rodriguez',
      email: 'clinician@clinic.com',
      role: 'clinician',
      assignedClinicians: [],
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...editingUser, ...formData } : u));
      setEditingUser(null);
    } else {
      const newUser = { ...formData, id: Date.now().toString() };
      setUsers(prev => [...prev, newUser]);
    }
    setFormData({ name: '', email: '', role: 'clinician', assignedClinicians: [] });
    setShowForm(false);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      assignedClinicians: user.assignedClinicians || [],
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleAssignClinicians = (director: any) => {
    setSelectedDirector(director);
    setShowAssignModal(true);
  };

  const handleClinicianAssignment = (clinicianId: string, directorId: string) => {
    // Update the clinician's assigned director
    updateClinician({
      ...clinicians.find(c => c.id === clinicianId)!,
      assignedDirector: directorId
    });

    // Update the director's assigned clinicians
    setUsers(prev => prev.map(u => {
      if (u.role === 'clinical_director') {
        const currentAssigned = u.assignedClinicians || [];
        if (u.id === directorId) {
          // Add clinician to this director
          return {
            ...u,
            assignedClinicians: [...currentAssigned.filter(id => id !== clinicianId), clinicianId]
          };
        } else {
          // Remove clinician from other directors
          return {
            ...u,
            assignedClinicians: currentAssigned.filter(id => id !== clinicianId)
          };
        }
      }
      return u;
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'clinical_director': return 'bg-blue-100 text-blue-800';
      case 'clinician': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield;
      case 'clinical_director': return Users;
      case 'clinician': return User;
      default: return User;
    }
  };

  const directors = users.filter(u => u.role === 'clinical_director');
  const unassignedClinicians = clinicians.filter(c => 
    !users.some(u => u.role === 'clinical_director' && u.assignedClinicians?.includes(c.id))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage system users and assign employees to directors</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Clinician Assignment Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Assignments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {directors.map(director => (
            <div key={director.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">{formatName(director.name)}</h4>
                <button
                  onClick={() => handleAssignClinicians(director)}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Manage
                </button>
              </div>
              <div className="text-sm text-blue-700">
                {director.assignedClinicians?.length || 0} assigned Employees
              </div>
              <div className="mt-2 space-y-1">
                {director.assignedClinicians?.map(clinicianId => {
                  const clinician = clinicians.find(c => c.id === clinicianId);
                  return clinician ? (
                    <div key={clinicianId} className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {formatName(clinician.name)}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
        
        {unassignedClinicians.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">Unassigned Employees</h4>
            <div className="space-y-1">
              {unassignedClinicians.map(clinician => (
                <div key={clinician.id} className="text-sm text-yellow-700">
                  {formatName(clinician.name)} - {clinician.department}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">System Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Employees
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{formatName(user.name)}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.role === 'clinical_director' ? (
                        <div className="flex items-center space-x-2">
                          <span>{user.assignedClinicians?.length || 0} employees</span>
                          <button
                            onClick={() => handleAssignClinicians(user)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user.id !== '1' && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedDirector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Employees to {formatName(selectedDirector.name)}
            </h3>
            <div className="space-y-4">
              {clinicians.map(clinician => {
                const isAssigned = selectedDirector.assignedClinicians?.includes(clinician.id);
                const assignedToOther = users.some(u => 
                  u.role === 'clinical_director' && 
                  u.id !== selectedDirector.id && 
                  u.assignedClinicians?.includes(clinician.id)
                );
                
                return (
                  <div key={clinician.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{formatName(clinician.name)}</div>
                      <div className="text-sm text-gray-600">{clinician.position} • {clinician.department}</div>
                      {assignedToOther && (
                        <div className="text-xs text-yellow-600">
                          Currently assigned to another director
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleClinicianAssignment(
                        clinician.id, 
                        isAssigned ? '' : selectedDirector.id
                      )}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isAssigned 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {isAssigned ? 'Unassign' : 'Assign'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
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
                <EnhancedSelect
                  value={formData.role}
                  onChange={(value) => setFormData({ ...formData, role: value as string })}
                  options={[
                    { 
                      value: 'clinician', 
                      label: 'Employee',
                      description: 'Front-line healthcare provider',
                      icon: User
                    },
                    { 
                      value: 'clinical_director', 
                      label: 'Clinical Director',
                      description: 'Department leadership role',
                      icon: Shield
                    },
                    { 
                      value: 'admin', 
                      label: 'Admin',
                      description: 'Administrative oversight',
                      icon: Settings
                    }
                  ]}
                  icon={<Shield className="w-4 h-4" />}
                  label="Role"
                  variant="filled"
                  size="md"
                  required
                  placeholder="Select a role..."
                  customDropdown={true}
                  searchable={true}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    setFormData({ name: '', email: '', role: 'clinician', assignedClinicians: [] });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingUser ? 'Update' : 'Add'} User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;