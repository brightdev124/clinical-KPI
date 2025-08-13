import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, supabaseJWT } from '../lib/supabase';
import { generateTokens, verifyAccessToken, verifyRefreshToken, isTokenExpiring as checkTokenExpiring } from '../lib/jwt';
import { TokenStorage, StoredUser } from '../lib/tokenStorage';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'super-admin' | 'director' | 'clinician' | 'admin';
  position?: string; // UUID reference to position table
  accept?: boolean;
  created_at?: string;
  updated_at?: string;
  assignedClinicians?: string[]; // Array of clinician IDs assigned to this director
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, name: string, role: 'super-admin' | 'director' | 'clinician' | 'admin') => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isPendingApproval: boolean;
  accessToken: string | null;
  isTokenExpiring: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for fallback (matches the database structure)
const mockUsers: User[] = [
  {
    id: '1',
    name: 'System Administrator',
    username: 'admin',
    role: 'super-admin',
    accept: true,
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    username: 'director',
    role: 'director',
    accept: true,
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    username: 'clinician',
    role: 'clinician',
    accept: true,
  },
  {
    id: '4',
    name: 'Dr. John Pending',
    username: 'pending',
    role: 'clinician',
    accept: false,
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenExpiring, setIsTokenExpiring] = useState(false);

  // Token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefreshToken = TokenStorage.getRefreshToken();
      
      if (!storedRefreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const refreshData = verifyRefreshToken(storedRefreshToken);
      if (!refreshData) {
        console.log('Invalid refresh token');
        TokenStorage.clearAll();
        return false;
      }

      // Find user to regenerate tokens
      let userForToken: StoredUser | null = null;
      
      // Try mock users first
      const mockUser = mockUsers.find(u => u.id === refreshData.id && u.username === refreshData.username);
      if (mockUser && mockUser.accept) {
        userForToken = mockUser;
      } else {
        // Try database
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', refreshData.id)
          .eq('username', refreshData.username)
          .single();

        if (!error && userProfile && userProfile.accept) {
          // Get role from position table
          let userRole = 'clinician';
          if (userProfile.position) {
            const { data: positionData } = await supabase
              .from('position')
              .select('role')
              .eq('id', userProfile.position)
              .single();
            
            if (positionData) {
              userRole = positionData.role;
            }
          }

          userForToken = {
            id: userProfile.id,
            name: userProfile.name,
            username: userProfile.username,
            role: userRole as any,
            position: userProfile.position
          };
        }
      }

      if (!userForToken) {
        console.log('User not found or not authorized for token refresh');
        TokenStorage.clearAll();
        return false;
      }

      // Generate new tokens
      const newTokens = generateTokens(userForToken);
      
      // Store new tokens
      TokenStorage.storeTokens(newTokens);
      TokenStorage.storeUser(userForToken);
      
      // Update state
      setAccessToken(newTokens.accessToken);
      setUser(userForToken);
      setIsAuthenticated(true);
      setIsPendingApproval(false);
      
      // Update Supabase JWT client
      supabaseJWT.setAccessToken(newTokens.accessToken);
      
      console.log('🔄 Token refreshed successfully');
      return true;

    } catch (error) {
      console.error('Token refresh failed:', error);
      TokenStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
      setIsPendingApproval(false);
      setAccessToken(null);
      supabaseJWT.setAccessToken(null);
      return false;
    }
  }, []);

  // Check token expiration and auto-refresh
  useEffect(() => {
    const checkTokenExpiration = () => {
      const expiresAt = TokenStorage.getTokenExpiration();
      if (expiresAt) {
        const isExpiring = checkTokenExpiring(expiresAt);
        setIsTokenExpiring(isExpiring);
        
        if (isExpiring && isAuthenticated) {
          console.log('🔄 Token is expiring, attempting refresh...');
          refreshToken();
        }
      }
    };

    // Check immediately
    checkTokenExpiration();
    
    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken]);

  // Initialize authentication state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for legacy storage first and migrate
        const legacyUser = localStorage.getItem('user');
        const legacyPendingUser = localStorage.getItem('pendingUser');
        
        if (legacyUser || legacyPendingUser) {
          console.log('🔄 Migrating from legacy authentication...');
          const userData = legacyUser ? JSON.parse(legacyUser) : JSON.parse(legacyPendingUser);
          
          if (legacyUser) {
            // Generate JWT tokens for existing authenticated user
            const tokens = generateTokens(userData);
            TokenStorage.storeTokens(tokens);
            TokenStorage.storeUser(userData);
            
            setUser(userData);
            setIsAuthenticated(true);
            setIsPendingApproval(false);
            setAccessToken(tokens.accessToken);
            supabaseJWT.setAccessToken(tokens.accessToken);
            
            console.log('✅ Legacy user migrated to JWT');
          } else {
            // Pending user - no tokens generated
            setUser(userData);
            setIsAuthenticated(false);
            setIsPendingApproval(true);
            
            console.log('⏳ Legacy pending user migrated');
          }
          
          // Clear legacy storage
          localStorage.removeItem('user');
          localStorage.removeItem('pendingUser');
          return;
        }

        // Check for JWT-based authentication
        const storedAuth = TokenStorage.getStoredAuth();
        
        if (storedAuth.accessToken && storedAuth.user) {
          // Verify the access token
          const tokenData = verifyAccessToken(storedAuth.accessToken);
          
          if (tokenData && TokenStorage.hasValidTokens()) {
            // Token is valid
            setUser(storedAuth.user);
            setIsAuthenticated(true);
            setIsPendingApproval(false);
            setAccessToken(storedAuth.accessToken);
            supabaseJWT.setAccessToken(storedAuth.accessToken);
            
            console.log('✅ Authenticated from stored JWT tokens');
          } else {
            // Token is invalid or expired, try to refresh
            console.log('🔄 Stored token invalid/expired, attempting refresh...');
            const refreshed = await refreshToken();
            if (!refreshed) {
              console.log('❌ Token refresh failed, user needs to log in again');
            }
          }
        } else if (storedAuth.user && !storedAuth.user.accept) {
          // User is pending approval
          setUser(storedAuth.user);
          setIsAuthenticated(false);
          setIsPendingApproval(true);
          
          console.log('⏳ User pending approval');
        } else {
          console.log('🔐 No stored authentication found');
        }
        
        // Debug log
        TokenStorage.debugLogStoredAuth();
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        TokenStorage.clearAll();
      }
    };

    initializeAuth();
  }, [refreshToken]);

  const login = async (username: string, password: string) => {
    try {
      // Clear any existing auth state
      TokenStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
      setIsPendingApproval(false);
      setAccessToken(null);
      supabaseJWT.setAccessToken(null);

      // First, try to find the user in mock users for demo
      const mockUser = mockUsers.find(u => u.username === username);
      
      if (mockUser && password === 'password') {
        if (mockUser.accept) {
          // Generate JWT tokens for authenticated user
          const tokens = generateTokens(mockUser);
          
          // Store tokens and user data
          TokenStorage.storeTokens(tokens);
          TokenStorage.storeUser(mockUser);
          
          // Update state
          setUser(mockUser);
          setIsAuthenticated(true);
          setIsPendingApproval(false);
          setAccessToken(tokens.accessToken);
          
          // Update Supabase JWT client
          supabaseJWT.setAccessToken(tokens.accessToken);
          
          console.log('✅ Mock user logged in with JWT tokens');
        } else {
          // User is pending approval - no tokens generated
          setUser(mockUser);
          setIsAuthenticated(false);
          setIsPendingApproval(true);
          
          // Store pending user data (without tokens)
          TokenStorage.storeUser(mockUser);
          
          console.log('⏳ Mock user pending approval');
        }
        return;
      }

      // Try database authentication
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error('Invalid username or password');
      }

      // Check if user is pending approval
      if (!data.accept) {
        // User is pending approval - create user object without tokens
        const pendingUser: User = {
          id: data.id,
          name: data.name,
          username: data.username,
          role: 'clinician', // Default role for pending users
          position: data.position,
          accept: false,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        
        setUser(pendingUser);
        setIsAuthenticated(false);
        setIsPendingApproval(true);
        
        // Store pending user data (without tokens)
        TokenStorage.storeUser(pendingUser);
        
        console.log('⏳ Database user pending approval');
        return;
      }

      // User is accepted - get role from position table
      let userRole = 'clinician'; // Default role
      
      if (data.position) {
        // Get role from position table using the position UUID
        const { data: positionData, error: positionError } = await supabase
          .from('position')
          .select('role')
          .eq('id', data.position)
          .single();
        
        if (!positionError && positionData) {
          userRole = positionData.role;
        }
      }

      // Get assigned clinicians if user is a director
      let assignedClinicians: string[] = [];
      if (userRole === 'director') {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assign')
          .select('clinician')
          .eq('director', data.id);
        
        if (!assignmentError && assignmentData) {
          assignedClinicians = assignmentData.map(a => a.clinician);
        }
      }

      const userProfile: User = {
        id: data.id,
        name: data.name,
        username: data.username,
        role: userRole,
        position: data.position,
        accept: true,
        created_at: data.created_at,
        updated_at: data.updated_at,
        assignedClinicians: assignedClinicians.length > 0 ? assignedClinicians : undefined,
      };

      // Generate JWT tokens for authenticated user
      const tokens = generateTokens(userProfile);
      
      // Store tokens and user data
      TokenStorage.storeTokens(tokens);
      TokenStorage.storeUser(userProfile);
      
      // Update state
      setUser(userProfile);
      setIsAuthenticated(true);
      setIsPendingApproval(false);
      setAccessToken(tokens.accessToken);
      
      // Update Supabase JWT client
      supabaseJWT.setAccessToken(tokens.accessToken);
      
      console.log('✅ Database user logged in with JWT tokens');
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (username: string, password: string, name: string, role: 'super-admin' | 'director' | 'clinician' | 'admin') => {
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      // If we got data, username exists
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // If there's an error other than "not found", throw it
      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Database error while checking username');
      }

      // Find the position UUID from position table based on selected role
      let positionId = null;
      if (role === 'director' || role === 'admin' || role === 'clinician') {
        // Map role to position_title for lookup
        const titleToMatch = role === 'director' ? 'Director' : 
                            role === 'admin' ? 'Administrator' : 
                            'Employee';
        
        // First try to find position by exact title match
        const { data: positionData, error: positionError } = await supabase
          .from('position')
          .select('id')
          .eq('position_title', titleToMatch)
          .single();

        if (positionError) {
          // If exact title doesn't exist, try to find any position with matching role
          const roleToMatch = role === 'admin' ? 'super-admin' : role;
          const { data: altPositionData, error: altPositionError } = await supabase
            .from('position')
            .select('id')
            .eq('role', roleToMatch)
            .limit(1)
            .single();

          if (altPositionError) {
            console.warn(`No ${role} position found, creating profile without position reference`);
          } else {
            positionId = altPositionData.id;
          }
        } else {
          positionId = positionData.id;
        }
      }
      
      // Insert new user directly into profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          username: username,
          password: password,
          name: name,
          position: positionId, // Add position UUID if found
          accept: false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Username already exists');
        }
        throw new Error(`Failed to create account: ${error.message}`);
      }

      if (data) {
        // Get the role from position table if position was set
        let userRole = role; // Use the original role as fallback
        
        if (positionId) {
          const { data: positionData, error: positionError } = await supabase
            .from('position')
            .select('role')
            .eq('id', positionId)
            .single();
          
          if (!positionError && positionData) {
            userRole = positionData.role;
          }
        }

        const userProfile: User = {
          id: data.id,
          name: data.name,
          username: data.username,
          role: userRole,
          position: data.position,
          accept: data.accept,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        // Set user to pending approval state (no tokens generated)
        setUser(userProfile);
        setIsAuthenticated(false);
        setIsPendingApproval(true);
        
        // Store pending user data (without tokens)
        TokenStorage.storeUser(userProfile);
        
        console.log('✅ User signed up - pending approval');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user...');
    
    // Clear all authentication state
    setUser(null);
    setIsAuthenticated(false);
    setIsPendingApproval(false);
    setAccessToken(null);
    setIsTokenExpiring(false);
    
    // Clear stored tokens and data
    TokenStorage.clearAll();
    
    // Clear Supabase JWT client
    supabaseJWT.setAccessToken(null);
    
    console.log('✅ User logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      refreshToken,
      isAuthenticated, 
      isPendingApproval,
      accessToken,
      isTokenExpiring
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};