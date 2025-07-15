import React, { useState } from 'react';
import { Filter, User, Calendar, Shield, Search, Building, Heart, Zap, Star } from 'lucide-react';
import EnhancedSelect from './UI/EnhancedSelect';

const SelectDemo: React.FC = () => {
  const [basicSelect, setBasicSelect] = useState('');
  const [searchableSelect, setSearchableSelect] = useState('');
  const [clearableSelect, setClearableSelect] = useState('');
  const [loadingSelect, setLoadingSelect] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const departmentOptions = [
    { 
      value: 'cardiology', 
      label: 'Cardiology',
      description: 'Heart and cardiovascular care',
      icon: Heart
    },
    { 
      value: 'neurology', 
      label: 'Neurology',
      description: 'Brain and nervous system',
      icon: Zap
    },
    { 
      value: 'emergency', 
      label: 'Emergency Medicine',
      description: '24/7 critical care',
      icon: Star
    },
    { 
      value: 'surgery', 
      label: 'General Surgery',
      description: 'Surgical procedures and operations',
      icon: Shield
    }
  ];

  const userOptions = [
    { 
      value: 'user1', 
      label: 'Dr. Sarah Johnson',
      description: 'Cardiology Department Head',
      icon: User
    },
    { 
      value: 'user2', 
      label: 'Dr. Michael Chen',
      description: 'Emergency Medicine Specialist',
      icon: User
    },
    { 
      value: 'user3', 
      label: 'Dr. Emily Rodriguez',
      description: 'Neurology Consultant',
      icon: User
    },
    { 
      value: 'user4', 
      label: 'Dr. James Wilson',
      description: 'Surgery Department',
      icon: User
    }
  ];

  const organizationOptions = [
    { 
      value: 'org1', 
      label: 'KPI Brain Healthcare',
      description: 'Main healthcare system',
      icon: Building
    },
    { 
      value: 'org2', 
      label: 'Regional Medical Center',
      description: 'Regional care facility',
      icon: Building
    },
    { 
      value: 'org3', 
      label: 'University Hospital',
      description: 'Teaching hospital',
      icon: Building
    }
  ];

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Enhanced Select Components Demo
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Experience the advanced dropdown features with search, keyboard navigation, 
          icons, descriptions, and beautiful animations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Custom Dropdown */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            Basic Custom Dropdown
          </h3>
          <p className="text-gray-600 mb-6">Clean custom dropdown with hover effects and animations</p>
          
          <EnhancedSelect
            value={basicSelect}
            onChange={(value) => setBasicSelect(value as string)}
            options={departmentOptions}
            icon={Filter}
            label="Department"
            placeholder="Select department..."
            variant="default"
            size="md"
            customDropdown={true}
            description="Choose from available departments"
          />
        </div>

        {/* Searchable Dropdown */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            Searchable Dropdown
          </h3>
          <p className="text-gray-600 mb-6">Type to search through options with real-time filtering</p>
          
          <EnhancedSelect
            value={searchableSelect}
            onChange={(value) => setSearchableSelect(value as string)}
            options={userOptions}
            icon={Search}
            label="Search Users"
            placeholder="Search for a user..."
            variant="filled"
            size="md"
            customDropdown={true}
            searchable={true}
            description="Type to filter users by name or department"
          />
        </div>

        {/* Clearable with Rich Options */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
            Clearable with Rich Options
          </h3>
          <p className="text-gray-600 mb-6">Options with icons, descriptions, and clear functionality</p>
          
          <EnhancedSelect
            value={clearableSelect}
            onChange={(value) => setClearableSelect(value as string)}
            options={organizationOptions}
            icon={Building}
            label="Organization"
            placeholder="Select organization..."
            variant="gradient"
            size="md"
            customDropdown={true}
            clearable={true}
            description="Select an organization (clearable)"
          />
        </div>

        {/* Loading State Demo */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
            Loading State Demo
          </h3>
          <p className="text-gray-600 mb-6">Demonstrates loading spinner functionality</p>
          
          <EnhancedSelect
            value={loadingSelect}
            onChange={(value) => setLoadingSelect(value as string)}
            options={departmentOptions}
            icon={Calendar}
            label="Dynamic Options"
            placeholder="Select option..."
            variant="filled"
            size="md"
            customDropdown={true}
            loading={isLoading}
            description="Click button below to see loading state"
          />
          
          <button
            onClick={handleLoadingDemo}
            disabled={isLoading}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Trigger Loading'}
          </button>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          🚀 Enhanced Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Live Search</h4>
            <p className="text-sm text-gray-600">Real-time filtering as you type</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Keyboard Navigation</h4>
            <p className="text-sm text-gray-600">Arrow keys, Enter, Escape support</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Rich Options</h4>
            <p className="text-sm text-gray-600">Icons, descriptions, grouping</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Accessible</h4>
            <p className="text-sm text-gray-600">ARIA compliant, screen reader friendly</p>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          🎯 How to Use
        </h3>
        
        <div className="space-y-4 text-gray-700">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-blue-600">1</span>
            </div>
            <div>
              <p><strong>Basic Usage:</strong> Set <code className="bg-gray-100 px-2 py-1 rounded">customDropdown={`{true}`}</code> to enable enhanced features</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-green-600">2</span>
            </div>
            <div>
              <p><strong>Search:</strong> Add <code className="bg-gray-100 px-2 py-1 rounded">searchable={`{true}`}</code> for live filtering</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-purple-600">3</span>
            </div>
            <div>
              <p><strong>Clear Button:</strong> Enable with <code className="bg-gray-100 px-2 py-1 rounded">clearable={`{true}`}</code></p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-orange-600">4</span>
            </div>
            <div>
              <p><strong>Rich Options:</strong> Add <code className="bg-gray-100 px-2 py-1 rounded">icon</code> and <code className="bg-gray-100 px-2 py-1 rounded">description</code> to option objects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectDemo;