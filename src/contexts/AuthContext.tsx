import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'director' | 'clinician';
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, name: string, role: 'director' | 'clinician') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for fallback (matches the database structure)
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    username: 'admin',
    role: 'director',
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    username: 'director',
    role: 'director',
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    username: 'clinician',
    role: 'clinician',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // First, try to find the user in mock users for demo
      const mockUser = mockUsers.find(u => u.username === username);
      if (mockUser && password === 'password') {
        setUser(mockUser);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(mockUser));
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
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setUser(userProfile);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userProfile));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (username: string, password: string, name: string, role: 'director' | 'clinician') => {
    try {
      console.log('Starting signup for username:', username);
      
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      console.log('Username check result:', { existingUser, checkError });

      // If we got data, username exists
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // If there's an error other than "not found", throw it
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Username check error:', checkError);
        throw new Error('Database error while checking username');
      }

      console.log('Inserting new user...');
      
      // Insert new user directly into profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          username: username,
          password: password,
          name: name,
          role: role,
        })
        .select()
        .single();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Signup error:', error);
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
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        console.log('User profile created:', userProfile);

        // Automatically log in the user after successful signup
        setUser(userProfile);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userProfile));
      }

      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated }}>
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