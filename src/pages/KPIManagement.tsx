import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Plus, Edit2, Trash2, Target, Weight, Building, RefreshCw, AlertCircle, RotateCcw, Trash, Archive } from 'lucide-react';

const KPIManagement: React.FC = () => {
  const { 
    kpis, 
    removedKPIs, 
    addKPI, 
    updateKPI, 
    deleteKPI, 
    restoreKPI, 
    permanentlyDeleteKPI, 
    refreshKPIs, 
    refreshRemovedKPIs, 
    loading, 
    error 
  } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingKPI, setEditingKPI] = useState<any>(null);
  const [showRemovedKPIs, setShowRemovedKPIs] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    weight: 10,
    floor: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.floor.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (formData.weight < 1) {
      alert('Weight must be at least 1');
      return;
    }

    setSubmitLoading(true);
    try {
      if (editingKPI) {
        await updateKPI({ 
          ...editingKPI, 
          ...formData,
          is_removed: editingKPI.is_removed || false
        });
        setEditingKPI(null);
      } else {
        await addKPI({
          ...formData,
          is_removed: false,
        });
      }
      setFormData({ title: '', description: '', weight: 10, floor: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to save KPI:', error);
      alert('Failed to save KPI. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (kpi: any) => {
    setEditingKPI(kpi);
    setFormData({
      title: kpi.title,
      description: kpi.description,
      weight: kpi.weight,
      floor: kpi.floor,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this KPI? This action cannot be undone.')) {
      try {
        await deleteKPI(id);
      } catch (error) {
        console.error('Failed to delete KPI:', error);
        alert('Failed to delete KPI. Please try again.');
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshKPIs();
      if (showRemovedKPIs) {
        await refreshRemovedKPIs();
      }
    } catch (error) {
      console.error('Failed to refresh KPIs:', error);
    }
  };

  const handleRestore = async (id: string) => {
    if (window.confirm('Are you sure you want to restore this KPI? It will be moved back to the active KPIs list.')) {
      try {
        await restoreKPI(id);
      } catch (error) {
        console.error('Failed to restore KPI:', error);
        alert('Failed to restore KPI. Please try again.');
      }
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this KPI? This action cannot be undone and will remove all associated data.')) {
      try {
        await permanentlyDeleteKPI(id);
      } catch (error) {
        console.error('Failed to permanently delete KPI:', error);
        alert('Failed to permanently delete KPI. Please try again.');
      }
    }
  };

  const totalWeight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">KPI Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configure and manage key performance indicators</p>
          {error && (
            <div className="mt-2 flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setShowRemovedKPIs(!showRemovedKPIs)}
            className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base ${
              showRemovedKPIs 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">{showRemovedKPIs ? 'Show Active' : 'Show Removed'}</span>
            <span className="sm:hidden">{showRemovedKPIs ? 'Active' : 'Removed'}</span>
            {removedKPIs.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {removedKPIs.length}
              </span>
            )}
          </button>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="Refresh KPIs"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {!showRemovedKPIs && (
              <button
                onClick={() => setShowForm(true)}
                disabled={loading}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Add KPI</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Weight Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-3 sm:mb-4">
          <Weight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Weight Distribution</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalWeight}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Weight Points</div>
          </div>
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalWeight / Math.max(totalWeight, 100)) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Total: {totalWeight}</div>
          </div>
        </div>
      </div>

      {/* KPI List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {showRemovedKPIs ? `Removed KPIs (${removedKPIs.length})` : `Active KPIs (${kpis.length})`}
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {loading && (showRemovedKPIs ? removedKPIs.length === 0 : kpis.length === 0) ? (
            <div className="p-4 sm:p-6 text-center">
              <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600">Loading KPIs...</p>
            </div>
          ) : (showRemovedKPIs ? removedKPIs.length === 0 : kpis.length === 0) ? (
            <div className="p-4 sm:p-6 text-center">
              {showRemovedKPIs ? (
                <>
                  <Archive className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">No removed KPIs found.</p>
                </>
              ) : (
                <>
                  <Target className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">No KPIs found. Add your first KPI to get started.</p>
                </>
              )}
            </div>
          ) : (
            (showRemovedKPIs ? removedKPIs : kpis).map((kpi) => (
              <div key={kpi.id} className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${showRemovedKPIs ? 'bg-red-50' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <Target className={`w-4 h-4 sm:w-5 sm:h-5 ${showRemovedKPIs ? 'text-red-600' : 'text-blue-600'}`} />
                        <h4 className={`text-base sm:text-lg font-medium ${showRemovedKPIs ? 'text-red-900' : 'text-gray-900'} truncate`}>
                          {kpi.title}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 ${showRemovedKPIs ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} text-xs rounded-full flex items-center space-x-1`}>
                          <Building className="w-3 h-3" />
                          <span>{kpi.floor}</span>
                        </span>
                        {showRemovedKPIs && (
                          <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                            REMOVED
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`${showRemovedKPIs ? 'text-red-700' : 'text-gray-600'} mb-3 text-sm sm:text-base`}>
                      {kpi.description}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <Weight className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm font-medium ${showRemovedKPIs ? 'text-red-900' : 'text-gray-900'}`}>
                          Weight: {kpi.weight}
                        </span>
                      </div>
                      <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${showRemovedKPIs ? 'bg-red-600' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min((kpi.weight / Math.max(totalWeight, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 sm:ml-4">
                    {showRemovedKPIs ? (
                      <>
                        <button
                          onClick={() => handleRestore(kpi.id)}
                          disabled={loading}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                          title="Restore KPI"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(kpi.id)}
                          disabled={loading}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Permanently Delete KPI"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(kpi)}
                          disabled={loading}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title="Edit KPI"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(kpi.id)}
                          disabled={loading}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Remove KPI"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              {editingKPI ? 'Edit KPI' : 'Add New KPI'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KPI Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter KPI title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  rows={3}
                  placeholder="Enter KPI description"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor *
                </label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Enter floor (e.g., 1st Floor, Ground Floor, ICU)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Weight determines the importance of this KPI (higher values = more important)
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingKPI(null);
                    setFormData({ title: '', description: '', weight: 10, floor: '' });
                  }}
                  disabled={submitLoading}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  {submitLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingKPI ? 'Update' : 'Add'} KPI</span>
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