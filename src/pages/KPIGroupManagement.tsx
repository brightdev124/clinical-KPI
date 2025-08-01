import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { KPIGroupService, KPIGroupWithDetails } from '../services/kpiGroupService';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Target, 
  Users, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  FolderPlus,
  Folder,
  Settings
} from 'lucide-react';

interface GroupFormData {
  title: string;
  selectedKPIs: string[];
}

const KPIGroupManagement: React.FC = () => {
  const { user } = useAuth();
  const { kpis, loading: dataLoading, refreshKPIs } = useData();
  
  // State management
  const [groups, setGroups] = useState<KPIGroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    title: '',
    selectedKPIs: []
  });
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  
  // Statistics
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalKPIs: 0,
    averageKPIsPerGroup: 0,
    groupTitles: [] as string[]
  });

  // Load data on component mount
  useEffect(() => {
    loadGroups();
    loadStats();
  }, [user?.id]);

  // Load KPI groups
  const loadGroups = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const groupsData = await KPIGroupService.getKPIGroupsByDirectorWithDetails(user.id);
      setGroups(groupsData);
    } catch (err) {
      console.error('Error loading KPI groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load KPI groups');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    if (!user?.id) return;
    
    try {
      const statsData = await KPIGroupService.getKPIGroupStats(user.id);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Group KPIs by title for display
  const groupedKPIs = useMemo(() => {
    const grouped: Record<string, KPIGroupWithDetails[]> = {};
    groups.forEach(group => {
      if (!grouped[group.title]) {
        grouped[group.title] = [];
      }
      grouped[group.title].push(group);
    });
    return grouped;
  }, [groups]);

  // Filter KPIs based on search and floor
  const filteredKPIs = useMemo(() => {
    return kpis.filter(kpi => {
      const matchesSearch = kpi.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           kpi.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFloor = !selectedFloor || kpi.floor === selectedFloor;
      return matchesSearch && matchesFloor;
    });
  }, [kpis, searchTerm, selectedFloor]);

  // Get unique floors for filter
  const floors = useMemo(() => {
    return Array.from(new Set(kpis.map(kpi => kpi.floor))).sort();
  }, [kpis]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.title.trim() || formData.selectedKPIs.length === 0) {
      setError('Please provide a group title and select at least one KPI');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (editingGroup) {
        // Update existing group
        await KPIGroupService.updateKPIGroupByTitle(
          editingGroup,
          user.id,
          formData.selectedKPIs
        );
        setSuccess('KPI group updated successfully');
      } else {
        // Check if group title already exists
        const titleExists = await KPIGroupService.groupTitleExists(formData.title, user.id);
        if (titleExists) {
          setError('A group with this title already exists');
          return;
        }

        // Create new group
        await KPIGroupService.createKPIGroupBatch(
          formData.title,
          user.id,
          formData.selectedKPIs
        );
        setSuccess('KPI group created successfully');
      }

      // Reset form and reload data
      resetForm();
      await loadGroups();
      await loadStats();
    } catch (err) {
      console.error('Error saving KPI group:', err);
      setError(err instanceof Error ? err.message : 'Failed to save KPI group');
    } finally {
      setLoading(false);
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async (groupTitle: string) => {
    if (!user?.id || !confirm(`Are you sure you want to delete the group "${groupTitle}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await KPIGroupService.deleteKPIGroupByTitleAndDirector(groupTitle, user.id);
      setSuccess('KPI group deleted successfully');
      await loadGroups();
      await loadStats();
    } catch (err) {
      console.error('Error deleting KPI group:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete KPI group');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit group
  const handleEditGroup = (groupTitle: string) => {
    const groupKPIs = groups
      .filter(g => g.title === groupTitle)
      .map(g => g.kpi);
    
    setFormData({
      title: groupTitle,
      selectedKPIs: groupKPIs
    });
    setEditingGroup(groupTitle);
    setShowCreateForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      selectedKPIs: []
    });
    setEditingGroup(null);
    setShowCreateForm(false);
  };

  // Handle KPI selection
  const handleKPIToggle = (kpiId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedKPIs: prev.selectedKPIs.includes(kpiId)
        ? prev.selectedKPIs.filter(id => id !== kpiId)
        : [...prev.selectedKPIs, kpiId]
    }));
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (dataLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading KPI groups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Group Management</h1>
          <p className="text-gray-600">Create and manage KPI groups for streamlined reviews</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Groups</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total KPIs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalKPIs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg KPIs/Group</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageKPIsPerGroup}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Settings className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Available KPIs</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingGroup ? `Edit Group: ${editingGroup}` : 'Create New KPI Group'}
            </h2>
            <button
              onClick={resetForm}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter group title..."
                required
                disabled={!!editingGroup}
              />
            </div>

            {/* KPI Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select KPIs ({formData.selectedKPIs.length} selected)
              </label>
              
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search KPIs..."
                  />
                </div>
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Floors</option>
                  {floors.map(floor => (
                    <option key={floor} value={floor}>{floor}</option>
                  ))}
                </select>
              </div>

              {/* KPI List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredKPIs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No KPIs found matching your criteria
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredKPIs.map(kpi => (
                      <label
                        key={kpi.id}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedKPIs.includes(kpi.id)}
                          onChange={() => handleKPIToggle(kpi.id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900">{kpi.title}</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Weight: {kpi.weight}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {kpi.floor}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || formData.selectedKPIs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingGroup ? 'Update Group' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-4">
        {Object.keys(groupedKPIs).length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No KPI Groups</h3>
            <p className="text-gray-600 mb-4">
              Create your first KPI group to organize KPIs for streamlined reviews.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <FolderPlus className="w-4 h-4" />
              Create Group
            </button>
          </div>
        ) : (
          Object.entries(groupedKPIs).map(([groupTitle, groupKPIs]) => (
            <div key={groupTitle} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Folder className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{groupTitle}</h3>
                    <p className="text-sm text-gray-600">{groupKPIs.length} KPIs in this group</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditGroup(groupTitle)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit group"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(groupTitle)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupKPIs.map(group => {
                  const kpi = kpis.find(k => k.id === group.kpi);
                  if (!kpi) return null;
                  
                  return (
                    <div key={group.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-medium text-gray-900">{kpi.title}</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{kpi.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Weight: {kpi.weight}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {kpi.floor}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KPIGroupManagement;