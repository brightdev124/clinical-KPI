import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'super-admin' | 'director' | 'clinician';
  accept: boolean;
  password?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  username: string;
  password: string;
  role: 'super-admin' | 'director' | 'clinician';
  accept?: boolean;
}

export interface UpdateUserData {
  name?: string;
  username?: string;
  password?: string;
  role?: 'super-admin' | 'director' | 'clinician';
  accept?: boolean;
}

export class UserService {
  /**
   * Fetch all users from the database
   */
  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserData): Promise<User> {
    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', userData.username)
      .single();

    if (existingUser) {
      throw new Error('Username already exists');
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error('Database error while checking username');
    }

    // Create the user
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        name: userData.name,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        accept: userData.accept || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a user
   */
  static async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    // Check if username already exists (if updating username)
    if (userData.username) {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', userData.username)
        .single();

      if (existingUser && existingUser.id !== id) {
        throw new Error('Username already exists');
      }

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Database error while checking username');
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateData: any = {};
    if (userData.name !== undefined) updateData.name = userData.name;
    if (userData.username !== undefined) updateData.username = userData.username;
    if (userData.password !== undefined && userData.password.trim() !== '') {
      updateData.password = userData.password;
    }
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.accept !== undefined) updateData.accept = userData.accept;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a user
   */
  static async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Toggle user acceptance status
   */
  static async toggleUserAcceptance(id: string, accept: boolean): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ accept })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: 'super-admin' | 'director' | 'clinician'): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users by role: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get pending approval users
   */
  static async getPendingUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('accept', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Bulk update user acceptance
   */
  static async bulkUpdateAcceptance(userIds: string[], accept: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ accept })
      .in('id', userIds);

    if (error) {
      throw new Error(`Failed to bulk update user acceptance: ${error.message}`);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(id: string, newPassword: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ password: newPassword })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    total: number;
    byRole: Record<string, number>;
    pending: number;
    approved: number;
  }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, accept');

    if (error) {
      throw new Error(`Failed to fetch user statistics: ${error.message}`);
    }

    const stats = {
      total: data.length,
      byRole: {} as Record<string, number>,
      pending: 0,
      approved: 0,
    };

    data.forEach(user => {
      // Count by role
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      
      // Count by acceptance status
      if (user.accept) {
        stats.approved++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }
}

export default UserService;