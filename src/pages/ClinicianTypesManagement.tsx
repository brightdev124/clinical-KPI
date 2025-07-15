import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClinicianType {
  id: string;
  title: string;
}

const ClinicianTypesManagement: React.FC = () => {
  const [clinicianTypes, setClinicianTypes] = useState<ClinicianType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<ClinicianType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentType, setCurrentType] = useState<ClinicianType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClinicianTypes();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredTypes(
        clinicianTypes.filter(type => 
          type.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredTypes(clinicianTypes);
    }
  }, [clinicianTypes, searchTerm]);

  const fetchClinicianTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('types')
        .select('id, title')
        .order('title', { ascending: true });

      if (error) throw error;
      setClinicianTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching clinician types:', error);
      setError(error.message || 'Failed to fetch clinician types');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setFormData({ title: '' });
    setShowAddModal(true);
    setError('');
    setSuccess('');
  };

  const handleEditClick = (type: ClinicianType) => {
    setCurrentType(type);
    setFormData({
      title: type.title,
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleDeleteClick = (type: ClinicianType) => {
    setCurrentType(type);
    setShowDeleteModal(true);
    setError('');
    setSuccess('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }

      const { data, error } = await supabase
        .from('types')
        .insert({
          title: formData.title.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setClinicianTypes([...clinicianTypes, data]);
      setSuccess('Clinician type added successfully');
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Error adding clinician type:', error);
      setError(error.message || 'Failed to add clinician type');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!currentType) return;
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }

      const { data, error } = await supabase
        .from('types')
        .update({
          title: formData.title.trim(),
        })
        .eq('id', currentType.id)
        .select()
        .single();

      if (error) throw error;

      setClinicianTypes(clinicianTypes.map(type => 
        type.id === currentType.id ? data : type
      ));
      setSuccess('Clinician type updated successfully');
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating clinician type:', error);
      setError(error.message || 'Failed to update clinician type');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      if (!currentType) return;

      // Check if the clinician type is in use
      const { count, error: countError } = await supabase
        .from('clinician')
        .select('*', { count: 'exact', head: true })
        .eq('clinician_type_id', currentType.id);

      if (countError) throw countError;

      if (count && count > 0) {
        setError(`Cannot delete: This clinician type is used by ${count} clinician(s)`);
        setShowDeleteModal(false);
        return;
      }

      const { error } = await supabase
        .from('types')
        .delete()
        .eq('id', currentType.id);

      if (error) throw error;

      setClinicianTypes(clinicianTypes.filter(type => type.id !== currentType.id));
      setSuccess('Clinician type deleted successfully');
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error('Error deleting clinician type:', error);
      setError(error.message || 'Failed to delete clinician type');
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
    <div className="mx-auto">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Clinician Types Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage clinician types for your organization</p>
          </div>
          <button
            onClick={handleAddClick}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add New Type
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm sm:text-base text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm sm:text-base text-green-800">{success}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search clinician types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Clinician Types Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block sm:hidden">
          {filteredTypes.length === 0 ? (
            <div className="p-6 sm:p-12 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No clinician types found</h3>
                <p className="text-sm sm:text-base text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search criteria'
                    : 'Get started by adding a new clinician type'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTypes.map((type) => (
                <div key={type.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{type.title}</h3>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditClick(type)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Type"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(type)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Type"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No clinician types found</h3>
                      <p className="text-gray-500">
                        {searchTerm 
                          ? 'Try adjusting your search criteria'
                          : 'Get started by adding a new clinician type'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{type.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditClick(type)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Type"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(type)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Type"
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
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Add New Clinician Type</h3>
              
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter clinician type title"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && currentType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Edit Clinician Type</h3>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && currentType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Are you sure you want to delete the clinician type <strong>{currentType.title}</strong>? This action cannot be undone.
              </p>
              
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
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
  );
};

export default ClinicianTypesManagement;