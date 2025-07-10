import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClinicianType {
  id: string;
  title: string;
}

const ClinicianTypesManagement: React.FC = () => {
  const [types, setTypes] = useState<ClinicianType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<ClinicianType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
  });

  // Fetch clinician types from Supabase
  const fetchTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('types')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      
      setTypes(data || []);
    } catch (err) {
      console.error('Error fetching clinician types:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clinician types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingType) {
        // Update existing type
        const { error } = await supabase
          .from('types')
          .update({ title: formData.title })
          .eq('id', editingType.id);
        
        if (error) throw error;
        
        setTypes(prev => prev.map(type => 
          type.id === editingType.id ? { ...type, title: formData.title } : type
        ));
      } else {
        // Create new type
        const { data, error } = await supabase
          .from('types')
          .insert({ title: formData.title })
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setTypes(prev => [...prev, data[0]]);
        }
      }
      
      // Reset form
      setFormData({ title: '' });
      setEditingType(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving clinician type:', err);
      setError(err instanceof Error ? err.message : 'Failed to save clinician type');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: ClinicianType) => {
    setEditingType(type);
    setFormData({
      title: type.title,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this clinician type?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTypes(prev => prev.filter(type => type.id !== id));
    } catch (err) {
      console.error('Error deleting clinician type:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete clinician type');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ title: '' });
    setEditingType(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinician Types Management</h2>
          <p className="text-gray-600 mt-1">Manage clinician types for categorization</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          disabled={loading}
        >
          <Plus className="w-5 h-5" />
          <span>Add Type</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form for adding/editing clinician types */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingType ? 'Edit Clinician Type' : 'Add New Clinician Type'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Type Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter clinician type title"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Saving...' : (editingType ? 'Update' : 'Save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Types Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Clinician Types</h3>
        </div>
        {loading && !types.length ? (
          <div className="p-6 text-center text-gray-500">Loading clinician types...</div>
        ) : !types.length ? (
          <div className="p-6 text-center text-gray-500">No clinician types found. Add your first one!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {types.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                          <Tag className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{type.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicianTypesManagement;