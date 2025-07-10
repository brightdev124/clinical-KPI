import { supabase } from '../lib/supabase';

export interface Position {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'super-admin' | 'director' | 'clinician';
  accept: boolean;
  password?: string;
  created_at: string;
  updated_at?: string;
  position_id?: string;
  position_name?: string;
  director_info?: {
    id: string;
    direction: string;
  };
  clinician_info?: {
    id: string;
    clinician: string;
  };
}

export interface CreateUserData {
  name: string;
  username: string;
  password: string;
  role: 'super-admin' | 'director' | 'clinician';
  accept?: boolean;
  position_id?: string;
  director_info?: {
    direction: string;
  };
  clinician_info?: {
    clinician: string;
  };
}

export interface UpdateUserData {
  name?: string;
  username?: string;
  password?: string;
  role?: 'super-admin' | 'director' | 'clinician';
  accept?: boolean;
  position_id?: string;
  director_info?: {
    direction: string;
  };
  clinician_info?: {
    clinician: string;
  };
}

export class UserService {
  /**
   * Fetch all users from the database with their role-specific information
   */
  static async getAllUsers(): Promise<User[]> {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id, 
        name, 
        username, 
        role, 
        accept, 
        created_at,
        position (id, name)
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch users: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Get all directors
    const { data: directors, error: directorsError } = await supabase
      .from('director')
      .select('id, profile, direction');

    if (directorsError) {
      throw new Error(`Failed to fetch directors: ${directorsError.message}`);
    }

    // Get all clinicians
    const { data: clinicians, error: cliniciansError } = await supabase
      .from('clinician')
      .select('id, profile, clinician');

    if (cliniciansError) {
      throw new Error(`Failed to fetch clinicians: ${cliniciansError.message}`);
    }

    // Map directors and clinicians to their profiles
    const directorsMap = new Map();
    directors?.forEach(director => {
      directorsMap.set(director.profile, {
        id: director.id,
        direction: director.direction
      });
    });

    const cliniciansMap = new Map();
    clinicians?.forEach(clinician => {
      cliniciansMap.set(clinician.profile, {
        id: clinician.id,
        clinician: clinician.clinician
      });
    });

    // Combine all data
    const users: User[] = profiles.map(profile => {
      const user: User = {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        role: profile.role,
        accept: profile.accept,
        created_at: profile.created_at,
        position_id: profile.position?.id,
        position_name: profile.position?.name
      };

      // Add role-specific information
      if (profile.role === 'director' && directorsMap.has(profile.id)) {
        user.director_info = directorsMap.get(profile.id);
      } else if (profile.role === 'clinician' && cliniciansMap.has(profile.id)) {
        user.clinician_info = cliniciansMap.get(profile.id);
      }

      return user;
    });

    return users;
  }

  /**
   * Get a user by ID with role-specific information
   */
  static async getUserById(id: string): Promise<User | null> {
    // Get the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, 
        name, 
        username, 
        role, 
        accept, 
        created_at,
        position (id, name)
      `)
      .eq('id', id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return null; // User not found
      }
      throw new Error(`Failed to fetch user: ${profileError.message}`);
    }

    if (!profile) {
      return null;
    }

    // Create the base user object
    const user: User = {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      role: profile.role,
      accept: profile.accept,
      created_at: profile.created_at,
      position_id: profile.position?.id,
      position_name: profile.position?.name
    };

    // Add role-specific information
    if (profile.role === 'director') {
      const { data: director, error: directorError } = await supabase
        .from('director')
        .select('id, direction')
        .eq('profile', id)
        .single();

      if (!directorError && director) {
        user.director_info = {
          id: director.id,
          direction: director.direction
        };
      }
    } else if (profile.role === 'clinician') {
      const { data: clinician, error: clinicianError } = await supabase
        .from('clinician')
        .select('id, clinician')
        .eq('profile', id)
        .single();

      if (!clinicianError && clinician) {
        user.clinician_info = {
          id: clinician.id,
          clinician: clinician.clinician
        };
      }
    }

    return user;
  }

  /**
   * Create a new user with role-specific information
   */
  static async createUser(userData: CreateUserData): Promise<User> {
    // Start a transaction
    const { error: txnError } = await supabase.rpc('begin_transaction');
    if (txnError) {
      throw new Error(`Failed to start transaction: ${txnError.message}`);
    }

    try {
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

      // Create the user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          name: userData.name,
          username: userData.username,
          password: userData.password,
          role: userData.role,
          accept: userData.accept || false,
          position: userData.position_id
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      // Create role-specific records
      if (userData.role === 'director' && userData.director_info) {
        const { error: directorError } = await supabase
          .from('director')
          .insert({
            profile: profile.id,
            direction: userData.director_info.direction
          });

        if (directorError) {
          throw new Error(`Failed to create director record: ${directorError.message}`);
        }
      } else if (userData.role === 'clinician' && userData.clinician_info) {
        const { error: clinicianError } = await supabase
          .from('clinician')
          .insert({
            profile: profile.id,
            clinician: userData.clinician_info.clinician
          });

        if (clinicianError) {
          throw new Error(`Failed to create clinician record: ${clinicianError.message}`);
        }
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }

      // Return the created user with complete information
      return await this.getUserById(profile.id) as User;
    } catch (error) {
      // Rollback the transaction on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Update a user with role-specific information
   */
  static async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    // Start a transaction
    const { error: txnError } = await supabase.rpc('begin_transaction');
    if (txnError) {
      throw new Error(`Failed to start transaction: ${txnError.message}`);
    }

    try {
      // Get the current user to check role
      const currentUser = await this.getUserById(id);
      if (!currentUser) {
        throw new Error('User not found');
      }

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

      // Prepare update data for profile
      const updateData: any = {};
      if (userData.name !== undefined) updateData.name = userData.name;
      if (userData.username !== undefined) updateData.username = userData.username;
      if (userData.password !== undefined && userData.password.trim() !== '') {
        updateData.password = userData.password;
      }
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.accept !== undefined) updateData.accept = userData.accept;
      if (userData.position_id !== undefined) updateData.position = userData.position_id;

      // Update the profile
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }

      // Handle role-specific updates
      const newRole = userData.role || currentUser.role;

      // If role changed, we need to handle the role-specific tables
      if (newRole !== currentUser.role) {
        // Delete old role-specific records
        if (currentUser.role === 'director') {
          const { error: deleteDirectorError } = await supabase
            .from('director')
            .delete()
            .eq('profile', id);

          if (deleteDirectorError) {
            throw new Error(`Failed to delete director record: ${deleteDirectorError.message}`);
          }
        } else if (currentUser.role === 'clinician') {
          const { error: deleteClinicianError } = await supabase
            .from('clinician')
            .delete()
            .eq('profile', id);

          if (deleteClinicianError) {
            throw new Error(`Failed to delete clinician record: ${deleteClinicianError.message}`);
          }
        }

        // Create new role-specific records
        if (newRole === 'director' && userData.director_info) {
          const { error: directorError } = await supabase
            .from('director')
            .insert({
              profile: id,
              direction: userData.director_info.direction
            });

          if (directorError) {
            throw new Error(`Failed to create director record: ${directorError.message}`);
          }
        } else if (newRole === 'clinician' && userData.clinician_info) {
          const { error: clinicianError } = await supabase
            .from('clinician')
            .insert({
              profile: id,
              clinician: userData.clinician_info.clinician
            });

          if (clinicianError) {
            throw new Error(`Failed to create clinician record: ${clinicianError.message}`);
          }
        }
      } else {
        // Role didn't change, but we might need to update role-specific info
        if (newRole === 'director' && userData.director_info) {
          const { error: directorError } = await supabase
            .from('director')
            .update({ direction: userData.director_info.direction })
            .eq('profile', id);

          if (directorError) {
            throw new Error(`Failed to update director record: ${directorError.message}`);
          }
        } else if (newRole === 'clinician' && userData.clinician_info) {
          const { error: clinicianError } = await supabase
            .from('clinician')
            .update({ clinician: userData.clinician_info.clinician })
            .eq('profile', id);

          if (clinicianError) {
            throw new Error(`Failed to update clinician record: ${clinicianError.message}`);
          }
        }
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }

      // Return the updated user with complete information
      return await this.getUserById(id) as User;
    } catch (error) {
      // Rollback the transaction on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  }

  /**
   * Delete a user and their role-specific information
   */
  static async deleteUser(id: string): Promise<void> {
    // Start a transaction
    const { error: txnError } = await supabase.rpc('begin_transaction');
    if (txnError) {
      throw new Error(`Failed to start transaction: ${txnError.message}`);
    }

    try {
      // Get the current user to check role
      const currentUser = await this.getUserById(id);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Delete role-specific records first
      if (currentUser.role === 'director') {
        const { error: directorError } = await supabase
          .from('director')
          .delete()
          .eq('profile', id);

        if (directorError) {
          throw new Error(`Failed to delete director record: ${directorError.message}`);
        }
      } else if (currentUser.role === 'clinician') {
        const { error: clinicianError } = await supabase
          .from('clinician')
          .delete()
          .eq('profile', id);

        if (clinicianError) {
          throw new Error(`Failed to delete clinician record: ${clinicianError.message}`);
        }
      }

      // Delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) {
        throw new Error(`Failed to delete user profile: ${profileError.message}`);
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }
    } catch (error) {
      // Rollback the transaction on error
      await supabase.rpc('rollback_transaction');
      throw error;
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

    return await this.getUserById(id) as User;
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: 'super-admin' | 'director' | 'clinician'): Promise<User[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users by role: ${error.message}`);
    }

    // For each profile, get the role-specific information
    const users: User[] = [];
    for (const profile of profiles || []) {
      const user = await this.getUserById(profile.id);
      if (user) {
        users.push(user);
      }
    }

    return users;
  }

  /**
   * Get pending approval users
   */
  static async getPendingUsers(): Promise<User[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('accept', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending users: ${error.message}`);
    }

    // For each profile, get the role-specific information
    const users: User[] = [];
    for (const profile of profiles || []) {
      const user = await this.getUserById(profile.id);
      if (user) {
        users.push(user);
      }
    }

    return users;
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

  /**
   * Get all positions
   */
  static async getAllPositions(): Promise<Position[]> {
    const { data, error } = await supabase
      .from('position')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }

    return data || [];
  }
}

export default UserService;