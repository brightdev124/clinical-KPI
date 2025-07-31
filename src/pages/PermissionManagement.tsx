import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Plus, Check, X, UserCheck, UserX, Search, Filter, Shield, User as UserIcon, Users as UsersIcon, Briefcase, Building, Eye, EyeOff, Loader2, Upload, FileText, AlertCircle } from 'lucide-react';
import { EnhancedSelect } from '../components/UI';
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState<EditUserData>({
    name: '',
    username: '',
    role: 'clinician',
    password: '',
    accept: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // CSV Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  const [importResults, setImportResults] = useState<{success: number, failed: number, errors: string[]}>({success: 0, failed: 0, errors: []});

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

    // Exclude specific username from display
    filtered = filtered.filter(user => user.username !== 'JohnMinahan');

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

  const fetchCurrentPassword = async () => {
    if (!editingUser) return;
    
    try {
      setIsLoadingPassword(true);
      const password = await UserService.getUserPassword(editingUser.id);
      setCurrentPassword(password);
      setEditData({ ...editData, password: password });
    } catch (error: any) {
      console.error('Error fetching current password:', error);
      setError(error.message || 'Failed to fetch current password');
    } finally {
      setIsLoadingPassword(false);
    }
  };

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
    setShowPassword(false); // Reset password visibility
    setCurrentPassword(''); // Reset current password
    setError('');
    setSuccess('');
  };

  const handleSaveEdit = async () => {
    try {
      if (!editingUser) return;
      
      // Set updating state to true to show spinner and disable button
      setIsUpdating(true);

      // Validate role-specific requirements
      if (editData.position_id) {
        // If a position is selected, verify it exists
        const selectedPosition = positions.find(p => p.id === editData.position_id);
        if (!selectedPosition) {
          setError('Selected position does not exist');
          setIsUpdating(false);
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
          setIsUpdating(false);
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
            setIsUpdating(false);
            return;
          }
        }
      }

      console.log('Updating user with data:', updateData);
      console.log('Current editing user:', editingUser);
      
      try {
        const updatedUser = await UserService.updateUser(editingUser.id, updateData);
        console.log('User updated successfully:', updatedUser);
        
        setSuccess('User updated successfully');
        setShowEditModal(false);
        setEditingUser(null);
        await fetchData(); // Make sure to wait for data refresh
      } catch (updateError: any) {
        console.error('Error in updateUser:', updateError);
        console.error('Update error details:', updateError);
        setError(updateError.message || 'Failed to update user');
      } finally {
        // Reset updating state regardless of success or failure
        setIsUpdating(false);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError(error.message || 'Failed to update user');
      setIsUpdating(false);
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

  const handleAddUser = () => {
    setNewUserData({
      name: '',
      username: '',
      role: activeTab === 'super-admin' ? 'super-admin' : activeTab === 'director' ? 'director' : 'clinician',
      password: '',
      accept: false,
    });
    setShowAddModal(true);
    setError('');
    setSuccess('');
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserData.name || !newUserData.username || !newUserData.password) {
        setError('Please fill in all required fields');
        return;
      }

      setIsCreating(true);

      // Validate role-specific requirements
      let position_id = newUserData.position_id;
      
      if (!position_id) {
        // Find a position matching the selected role
        const matchingPosition = positions.find(p => p.role === newUserData.role);
        if (matchingPosition) {
          position_id = matchingPosition.id;
        } else {
          setError(`No position found for ${newUserData.role} role. Please create one first.`);
          setIsCreating(false);
          return;
        }
      }

      // Create the user data object
      const createData: any = {
        name: newUserData.name,
        username: newUserData.username,
        password: newUserData.password,
        role: newUserData.role,
        position_id: position_id,
        accept: newUserData.accept,
      };

      // Add role-specific information
      if (newUserData.role === 'director') {
        if (newUserData.director_info) {
          createData.director_info = newUserData.director_info;
        } else {
          createData.director_info = { direction: 'General' };
        }
      } else if (newUserData.role === 'clinician') {
        if (newUserData.clinician_info && newUserData.clinician_info.type_id) {
          createData.clinician_info = newUserData.clinician_info;
        } else {
          const firstType = clinicianTypes[0];
          if (firstType) {
            createData.clinician_info = { type_id: firstType.id };
          } else {
            setError('No clinician types found. Please create one first.');
            setIsCreating(false);
            return;
          }
        }
      }

      console.log('Creating user with data:', createData);
      
      await UserService.createUser(createData);
      
      setSuccess('User created successfully');
      setShowAddModal(false);
      setNewUserData({
        name: '',
        username: '',
        role: 'clinician',
        password: '',
        accept: false,
      });
      await fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError(error.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
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

  // CSV Import Functions
  const handleImportCSV = () => {
    setCsvFile(null);
    setCsvData([]);
    setImportResults({success: 0, failed: 0, errors: []});
    setShowImportModal(true);
    setError('');
    setSuccess('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCsvFile(file);
    }
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          row.rowNumber = index + 2; // Add row number for error reporting
          return row;
        });
      
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const mapCsvFieldsToDatabase = async (csvRow: any) => {
    // Map CSV fields to database structure
    const fullName = csvRow.Full_Name || csvRow.full_name || csvRow.name || '';
    const username = csvRow.Username || csvRow.username || '';
    const password = csvRow.Password || csvRow.password || '';
    const roleText = csvRow.Role || csvRow.role || '';
    const positionText = csvRow.Position || csvRow.position || '';
    const clinicianTypeText = csvRow.Clinician_Type || csvRow.clinician_type || '';

    if (!fullName || !username || !password) {
      throw new Error('Missing required fields: Full_Name, Username, or Password');
    }

    // Map role text to role enum
    let role: 'super-admin' | 'director' | 'clinician' = 'clinician';
    const roleTextLower = roleText.toLowerCase();
    if (roleTextLower.includes('admin') || roleTextLower.includes('super')) {
      role = 'super-admin';
    } else if (roleTextLower.includes('director')) {
      role = 'director';
    } else {
      role = 'clinician';
    }

    // Find position ID based on position text
    let positionId: string | undefined;
    if (positionText) {
      const matchingPosition = positions.find(p => 
        p.position_title.toLowerCase().includes(positionText.toLowerCase()) ||
        positionText.toLowerCase().includes(p.position_title.toLowerCase())
      );
      if (matchingPosition) {
        positionId = matchingPosition.id;
        // Update role to match position role
        role = matchingPosition.role as 'super-admin' | 'director' | 'clinician';
      }
    }

    // If no position found, find first position matching the role
    if (!positionId) {
      const matchingPosition = positions.find(p => p.role === role);
      if (matchingPosition) {
        positionId = matchingPosition.id;
      }
    }

    // Prepare user data
    const userData: any = {
      name: fullName,
      username: username,
      password: password,
      role: role,
      position_id: positionId,
      accept: false, // Default to not accepted
    };

    // Add role-specific information
    if (role === 'director') {
      userData.director_info = {
        direction: positionText || 'General'
      };
    } else if (role === 'clinician') {
      // Find clinician type ID
      let clinicianTypeId: string | undefined;
      if (clinicianTypeText) {
        const matchingType = clinicianTypes.find(t => 
          t.title.toLowerCase().includes(clinicianTypeText.toLowerCase()) ||
          clinicianTypeText.toLowerCase().includes(t.title.toLowerCase())
        );
        if (matchingType) {
          clinicianTypeId = matchingType.id;
        }
      }

      // If no type found, use first available type
      if (!clinicianTypeId && clinicianTypes.length > 0) {
        clinicianTypeId = clinicianTypes[0].id;
      }

      if (clinicianTypeId) {
        userData.clinician_info = {
          type_id: clinicianTypeId
        };
      }
    }

    return userData;
  };

  const handleImportUsers = async () => {
    if (!csvData || csvData.length === 0) {
      setError('No data to import');
      return;
    }

    setIsImporting(true);
    setImportProgress({current: 0, total: csvData.length});
    const results = {success: 0, failed: 0, errors: []};

    for (let i = 0; i < csvData.length; i++) {
      const csvRow = csvData[i];
      setImportProgress({current: i + 1, total: csvData.length});

      try {
        const userData = await mapCsvFieldsToDatabase(csvRow);
        await UserService.createUser(userData);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${csvRow.rowNumber}: ${error.message}`);
      }
    }

    setImportResults(results);
    setIsImporting(false);
    
    if (results.success > 0) {
      setSuccess(`Successfully imported ${results.success} users`);
      await fetchData(); // Refresh the user list
    }
    
    if (results.failed > 0) {
      setError(`Failed to import ${results.failed} users. Check the details below.`);
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Permission Management</h1>
              <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-8">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={handleAddUser}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-sm lg:text-base">Add New User</span>
                </button>
                <button
                  onClick={handleImportCSV}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-sm lg:text-base">Import from CSV</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:space-x-4 lg:space-x-8">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                  <div className="flex items-center justify-center sm:justify-start">
                    <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 mr-1 sm:mr-0" />
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="text-xl lg:text-2xl font-bold text-gray-900 block">{users.length}</span>
                    <span className="text-xs lg:text-sm text-gray-600">Total Users</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                  <div className="flex items-center justify-center sm:justify-start">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="text-xl lg:text-2xl font-bold text-gray-900 block">{users.filter(u => u.accept).length}</span>
                    <span className="text-xs lg:text-sm text-gray-600">Approved</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                  <div className="flex items-center justify-center sm:justify-start">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-600" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="text-xl lg:text-2xl font-bold text-gray-900 block">{users.filter(u => !u.accept).length}</span>
                    <span className="text-xs lg:text-sm text-gray-600">Pending</span>
                  </div>
                </div>
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
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('super-admin')}
              className={`px-3 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'super-admin'
                  ? 'border-b-2 border-purple-500 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Super Admins
            </button>
            <button
              onClick={() => setActiveTab('director')}
              className={`px-3 py-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'director'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Directors
            </button>
            <button
              onClick={() => setActiveTab('clinician')}
              className={`px-3 py-2 font-medium text-sm whitespace-nowrap ${
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
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 lg:w-5 lg:h-5" />
                <input
                  type="text"
                  placeholder="Search users by name or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 lg:pl-10 pr-4 py-2 text-sm lg:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="min-w-[120px] lg:min-w-[140px]">
                <EnhancedSelect
                  value={filterStatus}
                  onChange={(value) => setFilterStatus(value as any)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'pending', label: 'Pending' }
                  ]}
                  icon={<Filter className="w-4 h-4" />}
                  variant="filled"
                  size="sm"
                  placeholder="Filter by status..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {activeTab === 'super-admin' && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
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
              </div>
              
              {/* Mobile Cards */}
              <div className="lg:hidden">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No super admins found</h3>
                    <p className="text-gray-500">
                      {searchTerm || filterStatus !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'No super admins have been created yet'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.accept)}`}>
                            {user.accept ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {user.accept ? 'APPROVED' : 'PENDING'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center text-sm text-gray-500">
                            <Briefcase className="w-4 h-4 mr-2" />
                            {user.position_name ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {user.position_name}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'director' && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
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
                        Division
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
              </div>
              
              {/* Mobile Cards */}
              <div className="lg:hidden">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No directors found</h3>
                    <p className="text-gray-500">
                      {searchTerm || filterStatus !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'No directors have been created yet'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.accept)}`}>
                            {user.accept ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {user.accept ? 'APPROVED' : 'PENDING'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center text-sm text-gray-500">
                            <Building className="w-4 h-4 mr-2" />
                            {user.director_info ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {user.director_info.direction}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Briefcase className="w-4 h-4 mr-2" />
                            {user.position_name ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {user.position_name}
                              </span>
                            ) : (
                              <span className="text-red-400 font-medium">⚠️ No position assigned</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'clinician' && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
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
              </div>
              
              {/* Mobile Cards */}
              <div className="lg:hidden">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-12 h-12 text-gray-400 mb-4 mx-auto" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No clinicians found</h3>
                    <p className="text-gray-500">
                      {searchTerm || filterStatus !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'No clinicians have been created yet'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.accept)}`}>
                            {user.accept ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {user.accept ? 'APPROVED' : 'PENDING'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center text-sm text-gray-500">
                            <UserIcon className="w-4 h-4 mr-2" />
                            {user.clinician_info ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                {user.clinician_info.type_title || 'Unknown Type'}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Briefcase className="w-4 h-4 mr-2" />
                            {user.position_name ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {user.position_name}
                              </span>
                            ) : (
                              <span className="text-red-400 font-medium">⚠️ No position assigned</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Edit Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={fetchCurrentPassword}
                        disabled={isLoadingPassword}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {isLoadingPassword ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Show current password'
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={editData.password || ''}
                        onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new password or click 'Show current password'"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank to keep current password, or click "Show current password" to see the existing value
                    </p>
                  </div>

                  <div>
                    <EnhancedSelect
                      value={editData.role}
                      onChange={(value) => {
                        // When role changes, clear the position if it doesn't match
                        const newRole = value as 'super-admin' | 'director' | 'clinician';
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
                      options={[
                        { value: 'super-admin', label: 'Super Admin' },
                        { value: 'director', label: 'Director' },
                        { value: 'clinician', label: 'Clinician' }
                      ]}
                      icon={<Shield className="w-4 h-4" />}
                      label="Role"
                      variant="gradient"
                      size="md"
                      required
                      placeholder="Select a role..."
                    />
                  </div>

                  <div>
                    <EnhancedSelect
                      value={editData.position_id || ''}
                      onChange={(value) => {
                        setEditData({ 
                          ...editData, 
                          position_id: value as string || undefined
                        });
                      }}
                      options={[
                        { value: '', label: 'Select a position' },
                        ...positions
                          .filter(position => position.role === editData.role)
                          .map(position => ({
                            value: position.id,
                            label: position.position_title
                          }))
                      ]}
                      icon={<Briefcase className="w-4 h-4" />}
                      label="Position"
                      variant="filled"
                      size="md"
                      placeholder="Select a position..."
                      description={`Showing positions for ${editData.role} role`}
                    />
                  </div>

                  {/* Role-specific fields */}
                  {editData.role === 'director' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Division
                      </label>
                      <input
                        type="text"
                        value={editData.director_info?.direction || ''}
                        onChange={(e) => setEditData({ 
                          ...editData, 
                          director_info: { direction: e.target.value } 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Division"
                      />
                    </div>
                  )}

                  {editData.role === 'clinician' && (
                    <div>
                      <EnhancedSelect
                        value={editData.clinician_info?.type_id || ''}
                        onChange={(value) => {
                          console.log('Selected clinician type:', value);
                          console.log('Available types:', clinicianTypes);
                          setEditData({ 
                            ...editData, 
                            clinician_info: { type_id: value as string } 
                          });
                        }}
                        options={[
                          { value: '', label: 'Select a type' },
                          ...(clinicianTypes.length > 0 
                            ? clinicianTypes.map(type => ({
                                value: type.id,
                                label: type.title
                              }))
                            : [{ value: '', label: 'No clinician types available', disabled: true }]
                          ),
                          // Add debugging option if needed
                          ...(editData.clinician_info?.type_id && !clinicianTypes.some(t => t.id === editData.clinician_info?.type_id)
                            ? [{ value: editData.clinician_info.type_id, label: `Current Type (ID: ${editData.clinician_info.type_id})` }]
                            : []
                          )
                        ]}
                        icon={<UserIcon className="w-4 h-4" />}
                        label="Clinician Type"
                        variant="default"
                        size="md"
                        placeholder="Select a clinician type..."
                      />
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

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isUpdating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors ${isUpdating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    {isUpdating ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Changes'
                    )}
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
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  Are you sure you want to delete user <strong>{userToDelete.name}</strong>? This action cannot be undone.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
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

        {/* Add New User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New User</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={newUserData.password || ''}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'super-admin' | 'director' | 'clinician';
                        const currentPosition = positions.find(p => p.id === newUserData.position_id);
                        
                        setNewUserData({
                          ...newUserData,
                          role: newRole,
                          position_id: currentPosition && currentPosition.role === newRole 
                            ? newUserData.position_id 
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
                      value={newUserData.position_id || ''}
                      onChange={(e) => {
                        setNewUserData({ 
                          ...newUserData, 
                          position_id: e.target.value || undefined
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a position</option>
                      {positions
                        .filter(position => position.role === newUserData.role)
                        .map(position => (
                          <option key={position.id} value={position.id}>
                            {position.position_title}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Showing positions for {newUserData.role} role
                    </p>
                  </div>

                  {/* Role-specific fields */}
                  {newUserData.role === 'director' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Division
                      </label>
                      <input
                        type="text"
                        value={newUserData.director_info?.direction || ''}
                        onChange={(e) => setNewUserData({ 
                          ...newUserData, 
                          director_info: { direction: e.target.value } 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Division"
                      />
                    </div>
                  )}

                  {newUserData.role === 'clinician' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clinician Type
                      </label>
                      <select
                        value={newUserData.clinician_info?.type_id || ''}
                        onChange={(e) => {
                          setNewUserData({ 
                            ...newUserData, 
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
                      </select>
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="newUserAccept"
                      checked={newUserData.accept}
                      onChange={(e) => setNewUserData({ ...newUserData, accept: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="newUserAccept" className="ml-2 block text-sm text-gray-700">
                      Approved
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={isCreating}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors ${isCreating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    {isCreating ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create User'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Import Users from CSV</h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={isImporting}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* CSV Format Information */}
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Your CSV file should have the following columns (case-insensitive):
                      </p>
                      <div className="bg-white p-3 rounded border border-blue-200 mb-3">
                        <code className="text-sm text-gray-700">
                          Full_Name, Username, Password, Role, Position, Clinician_Type
                        </code>
                      </div>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Full_Name</strong>: User's full name (required)</li>
                        <li>• <strong>Username</strong>: Unique username (required)</li>
                        <li>• <strong>Password</strong>: User's password (required)</li>
                        <li>• <strong>Role</strong>: Text description (e.g., "Admin", "Director", "Clinician")</li>
                        <li>• <strong>Position</strong>: Position title (will be mapped to database positions)</li>
                        <li>• <strong>Clinician_Type</strong>: Type of clinician (for clinician roles only)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isImporting}
                  />
                  {csvFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {csvFile.name} ({csvData.length} rows)
                    </p>
                  )}
                </div>

                {/* CSV Data Preview */}
                {csvData.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Data Preview</h4>
                    <div className="overflow-x-auto bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Row</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Full Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Username</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Role</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Position</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Clinician Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {csvData.slice(0, 10).map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">{row.rowNumber}</td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.Full_Name || row.full_name || row.name || '-'}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.Username || row.username || '-'}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.Role || row.role || '-'}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.Position || row.position || '-'}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.Clinician_Type || row.clinician_type || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 10 && (
                        <p className="text-sm text-gray-600 mt-2">
                          Showing first 10 rows of {csvData.length} total rows
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Progress */}
                {isImporting && (
                  <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          Importing users... ({importProgress.current}/{importProgress.total})
                        </p>
                        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Results */}
                {importResults.success > 0 || importResults.failed > 0 ? (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Import Results</h4>
                    <div className="space-y-3">
                      {importResults.success > 0 && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="text-sm font-medium text-green-800">
                            ✓ Successfully imported {importResults.success} users
                          </p>
                        </div>
                      )}
                      {importResults.failed > 0 && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <p className="text-sm font-medium text-red-800 mb-2">
                            ✗ Failed to import {importResults.failed} users
                          </p>
                          <div className="max-h-32 overflow-y-auto">
                            {importResults.errors.map((error, index) => (
                              <p key={index} className="text-sm text-red-700 mt-1">
                                {error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Error/Success Messages */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700">{success}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleImportUsers}
                    disabled={isImporting || !csvFile || csvData.length === 0}
                    className={`px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg transition-colors ${
                      isImporting || !csvFile || csvData.length === 0
                        ? 'opacity-70 cursor-not-allowed'
                        : 'hover:bg-green-700'
                    }`}
                  >
                    {isImporting ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        <span>Importing...</span>
                      </div>
                    ) : (
                      `Import ${csvData.length} Users`
                    )}
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