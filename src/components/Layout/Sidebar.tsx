import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  ClipboardList, 
  Target, 
  TrendingUp,
  Settings,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['admin', 'clinical_director', 'clinician'] },
    { name: 'KPI Management', href: '/kpis', icon: Target, roles: ['admin', 'clinical_director'] },
    { name: 'Clinicians', href: '/clinicians', icon: Users, roles: ['admin', 'clinical_director'] },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp, roles: ['admin', 'clinical_director'] },
    { name: 'User Management', href: '/users', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Activity className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Clinical KPI</span>
        </div>
      </div>
      
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;