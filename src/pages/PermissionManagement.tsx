import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Plus, Check, X, UserCheck, UserX, Search, Filter, Shield, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserService, { User } from '../services/userService';



interface EditUserData {
  name: string;
  username: string;
  role: 'director' | 'clinician';
  accept: boolean;
  password?: string;
}

const PermissionManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
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
    accept: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'super-admin' | 'director' | 'clinician'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

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

    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'approved' ? user.accept : !user.accept
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterRole, filterStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await UserService.getAllUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    // Prevent editing super-admin users
    if (user.role === 'super-admin') {
      setError('Super Admin users cannot be edited');
      return;
    }
    
    setEditingUser(user);
    setEditData({
      name: user.name,
      username: user.username,
      role: user.role,
      accept: user.accept,
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingUser) return;

      // Double-check to prevent editing super-admin users
      if (editingUser.role === 'super-admin') {
        setError('Super Admin users cannot be edited');
        setShowEditModal(false);
        return;
      }

      const updateData: any = {
        name: editData.name,
        username: editData.username,
        role: editData.role,
        accept: editData.accept,
      };

      // Only include password if it's provided
      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
      }

      await UserService.updateUser(editingUser.id, updateData);

      setSuccess('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
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

      // Prevent deleting superadmin users
      if (userToDelete.role === 'super-admin') {
        setError('Super Admin users cannot be deleted');
        setShowDeleteModal(false);
        return;
      }

      await UserService.deleteUser(userToDelete.id);

      setSuccess('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError(error.message || 'Failed to delete user');
    }
  };

  const toggleUserAcceptance = async (user: User) => {
    try {
      // Prevent changing super-admin status
      if (user.role === 'super-admin') {
        setError('Super Admin status cannot be changed');
        return;
      }
      
      await UserService.toggleUserAcceptance(user.id, !user.accept);
      setSuccess(`User ${!user.accept ? 'approved' : 'rejected'} successfully`);
      fetchUsers();
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
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="text-gray-400 w-4 h-4" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="director">Director</option>
                  <option value="clinician">Clinician</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500">
                          {searchTerm || filterRole !== 'all' || filterStatus !== 'all' 
                            ? 'Try adjusting your search or filter criteria'
                            : 'No users have been created yet'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {React.createElement(getRoleIcon(user.role), { className: "w-3 h-3 mr-1" })}
                          {user.role.replace('-', ' ').toUpperCase()}
                        </span>
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
                              user.role === 'super-admin'
                                ? 'text-gray-400 cursor-not-allowed'
                                : user.accept
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={
                              user.role === 'super-admin'
                                ? 'Super Admin status cannot be changed'
                                : user.accept ? 'Reject User' : 'Approve User'
                            }
                            disabled={user.role === 'super-admin'}
                          >
                            {user.accept ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.role === 'super-admin' 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title={user.role === 'super-admin' ? 'Super Admin users cannot be edited' : 'Edit User'}
                            disabled={user.role === 'super-admin'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.role !== 'super-admin' && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                      value={editData.username}
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
                      onChange={(e) => setEditData({ ...editData, role: e.target.value as 'director' | 'clinician' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="director">Director</option>
                      <option value="clinician">Clinician</option>
                    </select>
                  </div>

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