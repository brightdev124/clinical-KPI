import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'admin' | 'clinical_director' | 'clinician';
  assignedClinicians?: string[];
  assignedDirector?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Enhanced mock users with proper relationships (for demo purposes)
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'admin@clinickpi.local',
    username: 'admin',
    role: 'admin',
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    email: 'director@clinickpi.local',
    username: 'director',
    role: 'clinical_director',
    assignedClinicians: ['3', '4', '5', '6', '7'],
  },
  {
    id: '3',
    name: 'Dr. Emily Rodriguez',
    email: 'clinician@clinickpi.local',
    username: 'clinician',
    role: 'clinician',
    assignedDirector: '2',
  },
  {
    id: '4',
    name: 'Dr. James Wilson',
    email: 'james.wilson@clinickpi.local',
    username: 'james.wilson',
    role: 'clinician',
    assignedDirector: '2',
  },
  {
    id: '5',
    name: 'Dr. Lisa Thompson',
    email: 'lisa.thompson@clinickpi.local',
    username: 'lisa.thompson',
    role: 'clinician',
    assignedDirector: '2',
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

    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Get user profile from Supabase
        getUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        getUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        const userProfile: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          username: data.username,
          role: data.role,
          assignedClinicians: data.assigned_clinicians,
          assignedDirector: data.assigned_director,
        };
        setUser(userProfile);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userProfile));
      }
    } catch (error) {
      console.error('Error in getUserProfile:', error);
    }
  };

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

      // If username, get email from profiles table for Supabase auth
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single();

      if (error || !data) {
        throw new Error('Username not found');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (authData.user) {
        await getUserProfile(authData.user.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (username: string, password: string, name: string) => {
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Generate a dummy email for Supabase auth (since it requires email)
      const dummyEmail = `${username}@clinickpi.local`;

      // Sign up with Supabase using the dummy email
      const { data, error } = await supabase.auth.signUp({
        email: dummyEmail,
        password: password,
        options: {
          data: {
            name: name,
            username: username,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          name: name,
          email: dummyEmail,
          username: username,
          role: 'clinician', // Default role
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw new Error('Failed to create user profile');
        }
      }

      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
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