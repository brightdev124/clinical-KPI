import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Plus, Check, X, UserCheck, UserX, Search, Filter, Shield, User as UserIcon, Users as UsersIcon, Briefcase, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserService, { User, Position, ClinicianType } from '../services/userService';

/**
 * PermissionManagement Component
 * 
 * Director Section Implementation:
 * - Only displays users whose role in the position table is "director"
 * - Filters by position_id from the profiles table
 * - Includes full CRUD operations (edit, delete, approve/reject)
 * - Validates that directors have valid position assignments
 * - Shows position information and ID for better tracking
 * 
 * Clinician Section Implementation:
 * - Only displays users whose role in the position table is "clinician"
 * - Filters by position_id from the profiles table (UUID-based)
 * - Includes full CRUD operations (edit, delete, approve/reject)
 * - Validates that clinicians have valid position assignments
 * - Shows position information and ID for better tracking
 * - Ensures position role matches "clinician" during edit operations
 */

interface EditUserData {
  name: string;
  username: string;
  role: 'super-admin' | 'director' | 'clinician';
  password?: string;
  position_id?: string;
  accept?: boolean;
  director_info?: {
    direction: string;
  };
  clinician_info?: {
    type_id: string;
  };
}

const PermissionManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [clinicianTypes, setClinicianTypes] = useState<ClinicianType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editData, setEditData] = useState<EditUserData>({
    name: '',
    username: '',
    role: 'clinician',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [activeTab, setActiveTab] = useState<'super-admin' | 'director' | 'clinician'>('super-admin');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userData, positionsData, clinicianTypesData] = await Promise.all([
        UserService.getAllUsers(),
        UserService.getAllPositions(),
        UserService.getAllClinicianTypes()
      ]);
      console.log('Fetched users:', userData);
      console.log('Fetched positions:', positionsData);
      console.log('Fetched clinician types:', clinicianTypesData);
      
      setUsers(userData);
      setPositions(positionsData);
      setClinicianTypes(clinicianTypesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and filter criteria
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'approved' ? user.accept : !user.accept
      );
    }

    // Apply tab filter - always filter by role tab
    // For directors, ensure they have both director role AND position_id
    if (activeTab === 'director') {
      filtered = filtered.filter(user => 
        user.role === 'director' && user.position_id
      );
    } else if (activeTab === 'clinician') {
      // For clinicians, filter by role AND ensure they have position_id
      filtered = filtered.filter(user => 
        user.role === 'clinician' && user.position_id
      );
    } else {
      filtered = filtered.filter(user => user.role === activeTab);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterStatus, activeTab]);

  const handleEdit = (user: User) => {
    console.log('Editing user:', user);
    
    const editDataObj = {
      name: user.name,
      username: user.username,
      role: user.role,
      accept: user.accept,
      position_id: user.position_id,
      director_info: user.director_info ? {
        direction: user.director_info.direction
      } : undefined,
      clinician_info: user.clinician_info ? {
        type_id: user.clinician_info.type_id
      } : undefined
    };
    
    console.log('Setting edit data:', editDataObj);
    
    setEditingUser(user);
    setEditData(editDataObj);
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingUser) return;

      // Validate role-specific requirements
      if (editData.position_id) {
        // If a position is selected, verify it exists
        const selectedPosition = positions.find(p => p.id === editData.position_id);
        if (!selectedPosition) {
          setError('Selected position does not exist');
          return;
        }
        
        // Make sure the position role matches the user role
        if (selectedPosition.role !== editData.role) {
          // Auto-correct: update the role to match the position
          console.log(`Auto-correcting role from ${editData.role} to ${selectedPosition.role}`);
          editData.role = selectedPosition.role as 'super-admin' | 'director' | 'clinician';
        }
      } else {
        // For directors and clinicians, we'll find a position in the update logic
        console.log(`No position selected for ${editData.role} role`);
      }

      // Create the update data object
      const updateData: any = {
        name: editData.name,
        username: editData.username,
        accept: editData.accept,
        role: editData.role  // Explicitly set the role
      };
      
      // Only include position_id if it's provided
      if (editData.position_id) {
        updateData.position_id = editData.position_id;
      }
      
      // For any role without position, we need to find a matching position
      if (!editData.position_id) {
        // Find a position matching the selected role
        const matchingPosition = positions.find(p => p.role === editData.role);
        if (matchingPosition) {
          console.log(`Found matching position for ${editData.role}: ${matchingPosition.position_title}`);
          updateData.position_id = matchingPosition.id;
        } else {
          setError(`No position found for ${editData.role} role. Please create one first.`);
          return;
        }
      }

      // Only include password if it's provided
      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
      }

      // Add role-specific information
      if (editData.role === 'director') {
        if (editData.director_info) {
          updateData.director_info = editData.director_info;
        } else {
          // Create default director_info if not provided
          updateData.director_info = { direction: 'General' };
        }
      } else if (editData.role === 'clinician') {
        if (editData.clinician_info && editData.clinician_info.type_id) {
          updateData.clinician_info = editData.clinician_info;
        } else {
          // For clinicians, we need a type_id
          const firstType = clinicianTypes[0];
          if (firstType) {
            updateData.clinician_info = { type_id: firstType.id };
          } else {
            setError('No clinician types found. Please create one first.');
            return;
          }
        }
      }

      console.log('Updating user with data:', updateData);
      
      try {
        const updatedUser = await UserService.updateUser(editingUser.id, updateData);
        console.log('User updated successfully:', updatedUser);
        
        setSuccess('User updated successfully');
        setShowEditModal(false);
        setEditingUser(null);
        fetchData();
      } catch (updateError: any) {
        console.error('Error in updateUser:', updateError);
        setError(updateError.message || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.message || 'Failed to update user');
    }
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      if (!userToDelete) return;

      // Prevent deleting yourself
      if (userToDelete.id === currentUser?.id) {
        setError('You cannot delete your own account');
        return;
      }

      // Additional validation for role-specific deletions
      if (userToDelete.role === 'director') {
        // You could add additional business logic here
        // For example, check if the director has any assigned clinicians
        console.log(`Deleting director: ${userToDelete.name} with position: ${userToDelete.position_name}`);
      } else if (userToDelete.role === 'clinician') {
        // You could add additional business logic here
        // For example, check if the clinician has any pending KPI reviews
        console.log(`Deleting clinician: ${userToDelete.name} with position: ${userToDelete.position_name}`);
      }

      await UserService.deleteUser(userToDelete.id);

      setSuccess(`${userToDelete.role.charAt(0).toUpperCase() + userToDelete.role.slice(1)} deleted successfully`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Failed to delete user');
    }
  };

  const toggleUserAcceptance = async (user: User) => {
    try {
      await UserService.toggleUserAcceptance(user.id, !user.accept);
      setSuccess(`User ${!user.accept ? 'approved' : 'rejected'} successfully`);
      fetchData();
    } catch (error: any) {
      console.error('Error updating user acceptance:', error);
      setError(error.message || 'Failed to update user status');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-100 text-purple-800';
      case 'director':
        return 'bg-blue-100 text-blue-800';
      case 'clinician':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (accept: boolean) => {
    return accept ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin': return Shield;
      case 'director': return UsersIcon;
      case 'clinician': return UserIcon;
      default: return UserIcon;
    }
  };

  // Get positions filtered by role
  const getPositionsByRole = (role: string) => {
    return positions.filter(position => position.role === role);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Permission Management</h1>
              <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
            </div>
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">{users.length}</span>
                <span className="text-gray-600">Total Users</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{users.filter(u => u.accept).length}</span>
                <span className="text-gray-600">Approved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{users.filter(u => !u.accept).length}</span>
                <span className="text-gray-600">Pending</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Role Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('super-admin')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'super-admin'
                  ? 'border-b-2 border-purple-500 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Super Admins
            </button>
            <button
              onClick={() => setActiveTab('director')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'director'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Directors
            </button>
            <button
              onClick={() => setActiveTab('clinician')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'clinician'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Clinicians
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Filter className="text-gray-400 w-4 h-4" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'super-admin' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No super admins found</h3>
                          <p className="text-gray-500">
                            {searchTerm || filterStatus !== 'all'
                              ? 'Try adjusting your search or filter criteria'
                              : 'No super admins have been created yet'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.position_name ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {user.position_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.accept)}`}>
                            {user.accept ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {user.accept ? 'APPROVED' : 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleUserAcceptance(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.accept
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.accept ? 'Reject User' : 'Approve User'}
                            >
                              {user.accept ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'director' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No directors found</h3>
                          <p className="text-gray-500">
                            {searchTerm || filterStatus !== 'all'
                              ? 'Try adjusting your search or filter criteria'
                              : 'No directors have been created yet'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.director_info ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              <Building className="w-3 h-3 mr-1" />
                              {user.director_info.direction}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.position_name ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {user.position_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-red-400 font-medium">⚠️ No position assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.accept)}`}>
                            {user.accept ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {user.accept ? 'APPROVED' : 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleUserAcceptance(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.accept
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.accept ? 'Reject User' : 'Approve User'}
                            >
                              {user.accept ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'clinician' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clinician Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No clinicians found</h3>
                          <p className="text-gray-500">
                            {searchTerm || filterStatus !== 'all'
                              ? 'Try adjusting your search or filter criteria'
                              : 'No clinicians have been created yet'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.clinician_info ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              <UserIcon className="w-3 h-3 mr-1" />
                              {user.clinician_info.type_title || 'Unknown Type'}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.position_name ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {user.position_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-red-400 font-medium">⚠️ No position assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.accept)}`}>
                            {user.accept ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {user.accept ? 'APPROVED' : 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleUserAcceptance(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.accept
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.accept ? 'Reject User' : 'Approve User'}
                            >
                              {user.accept ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editData.username || ''}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (leave blank to keep current)
                    </label>
                    <input
                      type="password"
                      value={editData.password || ''}
                      onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editData.role}
                      onChange={(e) => {
                        // When role changes, clear the position if it doesn't match
                        const newRole = e.target.value as 'super-admin' | 'director' | 'clinician';
                        const currentPosition = positions.find(p => p.id === editData.position_id);
                        
                        setEditData({
                          ...editData,
                          role: newRole,
                          // Clear position if it doesn't match the new role
                          position_id: currentPosition && currentPosition.role === newRole 
                            ? editData.position_id 
                            : undefined
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="super-admin">Super Admin</option>
                      <option value="director">Director</option>
                      <option value="clinician">Clinician</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <select
                      value={editData.position_id || ''}
                      onChange={(e) => {
                        setEditData({ 
                          ...editData, 
                          position_id: e.target.value || undefined
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a position</option>
                      {/* Filter positions by selected role */}
                      {positions
                        .filter(position => position.role === editData.role)
                        .map(position => (
                          <option key={position.id} value={position.id}>
                            {position.position_title}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Showing positions for {editData.role} role
                    </p>
                  </div>

                  {/* Role-specific fields */}
                  {editData.role === 'director' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Direction
                      </label>
                      <input
                        type="text"
                        value={editData.director_info?.direction || ''}
                        onChange={(e) => setEditData({ 
                          ...editData, 
                          director_info: { direction: e.target.value } 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter direction"
                      />
                    </div>
                  )}

                  {editData.role === 'clinician' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinician Type
                      </label>
                      <select
                        value={editData.clinician_info?.type_id || ''}
                        onChange={(e) => {
                          console.log('Selected clinician type:', e.target.value);
                          console.log('Available types:', clinicianTypes);
                          setEditData({ 
                            ...editData, 
                            clinician_info: { type_id: e.target.value } 
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a type</option>
                        {clinicianTypes.length > 0 ? (
                          clinicianTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {type.title}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No clinician types available</option>
                        )}
                        {/* Add debugging info */}
                        {editData.clinician_info?.type_id && !clinicianTypes.some(t => t.id === editData.clinician_info?.type_id) && (
                          <option value={editData.clinician_info.type_id}>
                            Current Type (ID: {editData.clinician_info.type_id})
                          </option>
                        )}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accept"
                      checked={editData.accept}
                      onChange={(e) => setEditData({ ...editData, accept: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="accept" className="ml-2 block text-sm text-gray-700">
                      Approved
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete user <strong>{userToDelete.name}</strong>? This action cannot be undone.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionManagement;