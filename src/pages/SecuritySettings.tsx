import React from 'react';
import SecuritySettingsComponent from '../components/SecuritySettings';

const SecuritySettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SecuritySettingsComponent />
      </div>
    </div>
  );
};

export default SecuritySettingsPage;