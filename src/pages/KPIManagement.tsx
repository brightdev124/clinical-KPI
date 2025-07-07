import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, Trash2, Target, Weight } from 'lucide-react';

const KPIManagement: React.FC = () => {
  const { kpis, addKPI, updateKPI, deleteKPI } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    weight: 5,
    category: '',
  });

  const categories = ['Patient Care', 'Administration', 'Professional Development', 'Teamwork', 'Quality Improvement'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingKPI) {
      updateKPI({ ...editingKPI, ...formData });
      setEditingKPI(null);
    } else {
      addKPI(formData);
    }
    setFormData({ name: '', description: '', weight: 5, category: '' });
    setShowForm(false);
  };

  const handleEdit = (kpi: any) => {
    setEditingKPI(kpi);
    setFormData({
      name: kpi.name,
      description: kpi.description,
      weight: kpi.weight,
      category: kpi.category,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this KPI?')) {
      deleteKPI(id);
    }
  };

  const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">KPI Management</h2>
          <p className="text-gray-600 mt-1">Configure and manage key performance indicators</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add KPI</span>
        </button>
      </div>

      {/* Weight Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Weight className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Weight Distribution</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-bold text-gray-900">{totalWeight}</div>
          <div className="text-sm text-gray-600">Total Weight Points</div>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((totalWeight / 75) * 100, 100)}%` }}
            />
          </div>
          <div className="text-sm text-gray-600">Target: 75</div>
        </div>
      </div>

      {/* KPI List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active KPIs ({kpis.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-medium text-gray-900">{kpi.name}</h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {kpi.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{kpi.description}</p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Weight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">Weight: {kpi.weight}</span>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(kpi.weight / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(kpi)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(kpi.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingKPI ? 'Edit KPI' : 'Add New KPI'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Name
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingKPI(null);
                    setFormData({ name: '', description: '', weight: 5, category: '' });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingKPI ? 'Update' : 'Add'} KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIManagement;