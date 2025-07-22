import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Menu, X, Settings } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useNameFormatter } from '../../utils/nameFormatter';
import { 
  BarChart3, 
  Users, 
  Target, 
  UserCheck,
  Tag,
  Briefcase,
  Shield
} from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isCollapsed, isMobile, toggleSidebar } = useSidebar();
  const formatName = useNameFormatter();
  const navigate = useNavigate();
  const [showMobileNav, setShowMobileNav] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get navigation items based on user role
  const getNavigation = () => {
    if (user?.role === 'clinician') {
      return [
        { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['clinician'] },
      ];
    }
    
    return [
      { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['super-admin', 'director'] },
      { name: 'KPI Management', href: '/kpis', icon: Target, roles: ['super-admin'] },
      { name: 'Clinicians', href: '/clinicians', icon: Users, roles: ['director'] },
      { name: 'Assign Director', href: '/assign-director', icon: UserCheck, roles: ['super-admin'] },
      { name: 'Clinician Types', href: '/clinician-types', icon: Tag, roles: ['super-admin'] },
      { name: 'Positions', href: '/positions', icon: Briefcase, roles: ['super-admin'] },
      { name: 'Permissions', href: '/permissions', icon: Shield, roles: ['super-admin'] },
    ];
  };

  const navigation = getNavigation();
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  // Handle mobile menu toggle
  const handleMobileMenuToggle = () => {
    if (isMobile) {
      setShowMobileNav(!showMobileNav);
    } else {
      toggleSidebar();
    }
  };

  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMobileNav(false);
      }
    };

    if (showMobileNav) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileNav]);

  // Close mobile nav when route changes
  const handleNavClick = () => {
    setShowMobileNav(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button / Desktop Sidebar Toggle */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleMobileMenuToggle}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              title="Open navigation menu"
            >
              {showMobileNav ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Mobile Dropdown Navigation */}
            {isMobile && showMobileNav && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-2">
                  {/* Logo and Brand */}
                  <div className="flex items-center space-x-2 px-4 py-3 border-b border-gray-100">
                    <img src="/assets/logo_simple.png" alt="Logo" className="h-6 w-6 flex-shrink-0" />
                    <span className="text-lg font-bold text-gray-900">KPI Brain</span>
                  </div>
                  
                  {/* Navigation Items */}
                  <nav className="py-2">
                    {filteredNavigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                              : 'text-gray-700 hover:text-gray-900'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0 mr-3" />
                        {item.name}
                      </NavLink>
                    ))}
                  </nav>
                  
                  {/* User Info and Logout */}
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex items-center px-4 py-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-medium">
                          {(user?.name || '').split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{user?.name || ''}</p>
                        <p className="text-xs text-gray-600">
                          {user?.role === 'super-admin' && 'Super Administrator'}
                          {user?.role === 'director' && 'Clinical Director'}
                          {user?.role === 'clinician' && 'Clinician'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        console.log('📱 Mobile settings clicked for user:', user?.role);
                        setShowMobileNav(false);
                        navigate('/security-settings');
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      Security Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        logout();
                        setShowMobileNav(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors hidden md:block"
            title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:block">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {(user?.name || '').split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {user?.role === 'super-admin' && 'Super Administrator'}
              {user?.role === 'director' && 'Clinical Director'}
              {user?.role === 'clinician' && 'Clinician'}
            </p>
          </div>
        </div>
        
        {/* Desktop User Info and Logout */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {(user?.name || '').split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">{user?.name || ''}</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              console.log('🔧 Settings clicked for user:', user?.role);
              navigate('/security-settings');
            }}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            title="Security Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
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