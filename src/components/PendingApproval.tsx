import React from 'react';
import { Clock, Mail, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNameFormatter } from '../utils/nameFormatter';

const PendingApproval: React.FC = () => {
  const { user, logout } = useAuth();
  const formatName = useNameFormatter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Account Pending Approval
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your account has been created successfully, but you need to wait until an administrator approves your request before you can access the system.
          </p>
          
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <User className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Account Details</span>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Name:</strong> {formatName(user.name)}</p>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Mail className="w-4 h-4 mr-2" />
              <span>You will be notified once your account is approved</span>
            </div>
            
            <button
              onClick={logout}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;