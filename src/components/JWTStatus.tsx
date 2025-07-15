import React from 'react';
import { Shield, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TokenStorage } from '../lib/tokenStorage';

const JWTStatus: React.FC = () => {
  const { accessToken, isTokenExpiring, refreshToken, isAuthenticated } = useAuth();

  if (!isAuthenticated || !accessToken) {
    return null;
  }

  const handleRefreshToken = async () => {
    try {
      await refreshToken();
    } catch (error) {
      console.error('Manual token refresh failed:', error);
    }
  };

  const getExpirationTime = () => {
    const expiresAt = TokenStorage.getTokenExpiration();
    if (!expiresAt) return 'Unknown';
    
    const now = Date.now();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const tokenPreview = accessToken ? `${accessToken.substring(0, 20)}...` : 'No token';

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      process.env.NODE_ENV === 'development' ? 'block' : 'hidden'
    }`}>
      <div className={`bg-white rounded-lg shadow-lg border-2 p-4 min-w-80 ${
        isTokenExpiring ? 'border-orange-400 bg-orange-50' : 'border-green-400 bg-green-50'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${
            isTokenExpiring ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
          }`}>
            {isTokenExpiring ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Shield className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold text-sm ${
                isTokenExpiring ? 'text-orange-800' : 'text-green-800'
              }`}>
                JWT Status
              </h3>
              <button
                onClick={handleRefreshToken}
                className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                  isTokenExpiring ? 'text-orange-600 hover:bg-orange-600' : 'text-green-600 hover:bg-green-600'
                }`}
                title="Refresh token"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-gray-700">
                  Expires in: <span className="font-mono">{getExpirationTime()}</span>
                </span>
              </div>
              
              <div className="bg-gray-100 rounded p-2 font-mono text-xs break-all">
                {tokenPreview}
              </div>
              
              {isTokenExpiring && (
                <div className="text-orange-600 font-medium text-xs">
                  ⚠️ Token expiring soon - will auto-refresh
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JWTStatus;