import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  ClipboardList, 
  Target, 
  TrendingUp,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Tag,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import clsx from 'clsx';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { isCollapsed, isMobile, toggleSidebar, closeSidebar } = useSidebar();

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
      { name: 'My Reviews', href: '/my-reviews', icon: ClipboardList, roles: ['director'] },
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

  const handleNavClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <div className={clsx(
      'bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out relative',
      'flex flex-col h-full',
      isMobile ? (
        isCollapsed ? '-translate-x-full' : 'translate-x-0'
      ) : (
        isCollapsed ? 'w-16' : 'w-64'
      ),
      isMobile ? 'fixed inset-y-0 left-0 z-30 w-64' : 'static'
    )}>
      {/* Header */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 flex-shrink-0">
        <div className={clsx(
          'flex items-center transition-all duration-300',
          isCollapsed && !isMobile ? 'space-x-0' : 'space-x-2'
        )}>
          <img src="/assets/logo_simple.png" alt="Logo" className="h-8 w-8 flex-shrink-0" />
          <span className={clsx(
            'text-xl font-bold text-gray-900 transition-all duration-300',
            isCollapsed && !isMobile ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          )}>
            KPI Brain
          </span>
        </div>
      </div>

      {/* Toggle Button - Only on desktop */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          className={clsx(
            'absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:shadow-lg transition-all duration-200 hover:bg-gray-50',
            'z-10'
          )}
          title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}
      
      {/* Navigation */}
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors relative group',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                    isCollapsed && !isMobile ? 'justify-center' : 'justify-start'
                  )
                }
                title={isCollapsed && !isMobile ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className={clsx(
                  'transition-all duration-300',
                  isCollapsed && !isMobile ? 'opacity-0 w-0 ml-0 overflow-hidden' : 'opacity-100 ml-3'
                )}>
                  {item.name}
                </span>
                
                {/* Tooltip for collapsed state - Only on desktop */}
                {isCollapsed && !isMobile && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;