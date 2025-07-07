import React from 'react';
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isCollapsed, isMobile, toggleSidebar } = useSidebar();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {user?.role === 'super-admin' && 'Super Administrator'}
              {user?.role === 'director' && 'Clinical Director'}
              {user?.role === 'clinician' && 'Clinician'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;