import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'super-admin' | 'director' | 'clinician';
  accept?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, name: string, role: 'super-admin' | 'director' | 'clinician') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isPendingApproval: boolean;
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

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    const storedPendingUser = localStorage.getItem('pendingUser');
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
      setIsPendingApproval(false);
    } else if (storedPendingUser) {
      setUser(JSON.parse(storedPendingUser));
      setIsAuthenticated(false);
      setIsPendingApproval(true);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // First, try to find the user in mock users for demo
      const mockUser = mockUsers.find(u => u.username === username);
      
      if (mockUser && password === 'password') {
        if (mockUser.accept) {
          setUser(mockUser);
          setIsAuthenticated(true);
          setIsPendingApproval(false);
          localStorage.setItem('user', JSON.stringify(mockUser));
        } else {
          setUser(mockUser);
          setIsAuthenticated(false);
          setIsPendingApproval(true);
          localStorage.setItem('pendingUser', JSON.stringify(mockUser));
        }
        return;
      }

      // Query the profiles table directly
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error('Invalid username or password');
      }

      const userProfile: User = {
        id: data.id,
        name: data.name,
        username: data.username,
        role: data.role,
        accept: data.accept,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Check if user is accepted
      if (userProfile.accept) {
        setUser(userProfile);
        setIsAuthenticated(true);
        setIsPendingApproval(false);
        localStorage.setItem('user', JSON.stringify(userProfile));
      } else {
        setUser(userProfile);
        setIsAuthenticated(false);
        setIsPendingApproval(true);
        localStorage.setItem('pendingUser', JSON.stringify(userProfile));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (username: string, password: string, name: string, role: 'super-admin' | 'director' | 'clinician') => {
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
      
      // Insert new user directly into profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          username: username,
          password: password,
          name: name,
          role: role,
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
        const userProfile: User = {
          id: data.id,
          name: data.name,
          username: data.username,
          role: data.role,
          accept: data.accept,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        // Set user to pending approval state
        setUser(userProfile);
        setIsAuthenticated(false);
        setIsPendingApproval(true);
        localStorage.setItem('pendingUser', JSON.stringify(userProfile));
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsPendingApproval(false);
    localStorage.removeItem('user');
    localStorage.removeItem('pendingUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated, isPendingApproval }}>
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