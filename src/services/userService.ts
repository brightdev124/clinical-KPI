import { supabase } from '../lib/supabase';

export interface Position {
  id: string;
  position_title: string;
  role: string;
  created_at?: string;
}

export interface ClinicianType {
  id: string;
  title: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'super-admin' | 'director' | 'clinician' | 'admin';
  password?: string;
  created_at: string;
  accept: boolean;
  position_id?: string;
  position_name?: string;
  director_info?: {
    id: string;
    direction: string;
  };
  clinician_info?: {
    id: string;
    type_id: string;
    type_title: string;
  };
}

export interface CreateUserData {
  name: string;
  username: string;
  password: string;
  role: 'super-admin' | 'director' | 'clinician' | 'admin';
  position_id?: string;
  accept?: boolean;
  director_info?: {
    direction: string;
  };
  clinician_info?: {
    type_id: string;
  };
}

export interface UpdateUserData {
  name?: string;
  username?: string;
  password?: string;
  role?: 'super-admin' | 'director' | 'clinician';
  position_id?: string;
  accept?: boolean;
  director_info?: {
    direction: string;
  };
  clinician_info?: {
    type_id: string;
  };
}

export class UserService {
  /**
   * Fetch all positions from the database
   */
  static async getAllPositions(): Promise<Position[]> {
    const { data: positions, error: positionsError } = await supabase
      .from('position')
      .select('id, position_title, role')
      .order('position_title', { ascending: true });

    if (positionsError) {
      throw new Error(`Failed to fetch positions: ${positionsError.message}`);
    }

    return positions || [];
  }

  /**
   * Fetch all clinician types from the database
   */
  static async getAllClinicianTypes(): Promise<ClinicianType[]> {
    const { data: types, error: typesError } = await supabase
      .from('types')
      .select('id, title')
      .order('title', { ascending: true });

    if (typesError) {
      throw new Error(`Failed to fetch clinician types: ${typesError.message}`);
    }

    return types || [];
  }

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
        position, 
        created_at,
        accept,
        position_info:position (id, position_title, role)
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

    // Get all clinicians with their types
    const { data: clinicians, error: cliniciansError } = await supabase
      .from('clician')
      .select(`
        id, 
        profile, 
        type,
        type_info:type (id, title)
      `);

    if (cliniciansError) {
      throw new Error(`Failed to fetch clinicians: ${cliniciansError.message}`);
    }

    // Get all types for reference
    const { data: types, error: typesError } = await supabase
      .from('types')
      .select('id, title');

    if (typesError) {
      throw new Error(`Failed to fetch types: ${typesError.message}`);
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
      const typeInfo = types?.find(t => t.id === clinician.type);
      cliniciansMap.set(clinician.profile, {
        id: clinician.id,
        type_id: clinician.type,
        type_title: typeInfo?.title || 'Unknown Type'
      });
    });

    // Combine all data
    const users: User[] = profiles.map(profile => {
      const user: User = {
        id: profile.id,
        name: profile.name,
        username: profile.username,
        role: profile.position_info?.role || 'clinician',
        created_at: profile.created_at,
        accept: profile.accept || false,
        position_id: profile.position,
        position_name: profile.position_info?.position_title
      };

      // Add role-specific information
      if (profile.position_info?.role === 'director' && directorsMap.has(profile.id)) {
        user.director_info = directorsMap.get(profile.id);
      } else if (profile.position_info?.role === 'clinician' && cliniciansMap.has(profile.id)) {
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
        position,
        created_at,
        accept,
        position_info:position (id, position_title, role)
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
      role: profile.position_info?.role || 'clinician',
      created_at: profile.created_at,
      accept: profile.accept || false,
      position_id: profile.position,
      position_name: profile.position_info?.position_title
    };

    // Add role-specific information
    if (profile.position_info?.role === 'director') {
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
    } else if (profile.position_info?.role === 'clinician') {
      const { data: clinician, error: clinicianError } = await supabase
        .from('clician')
        .select('id, type')
        .eq('profile', id)
        .single();

      if (!clinicianError && clinician) {
        // Get the type information
        const { data: typeInfo, error: typeError } = await supabase
          .from('types')
          .select('id, title')
          .eq('id', clinician.type)
          .single();

        user.clinician_info = {
          id: clinician.id,
          type_id: clinician.type,
          type_title: typeInfo?.title || 'Unknown Type'
        };
      }
    }

    return user;
  }

  /**
   * Create a new user with role-specific information
   */
  static async createUser(userData: CreateUserData): Promise<User> {
    try {
      console.log('Creating user with data:', userData);
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
          position: userData.position_id,
          accept: userData.accept !== undefined ? userData.accept : false
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
          .from('clician')
          .insert({
            profile: profile.id,
            type: userData.clinician_info.type_id
          });

        if (clinicianError) {
          throw new Error(`Failed to create clinician record: ${clinicianError.message}`);
        }
      }

      // Return the created user with complete information
      return await this.getUserById(profile.id) as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update a user with role-specific information
   */
  static async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    try {
      console.log('Updating user with data:', userData);
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
      if (userData.position_id !== undefined) updateData.position = userData.position_id;
      if (userData.accept !== undefined) updateData.accept = userData.accept;

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
      // Get the new role from the position if position_id is provided
      let newRole = currentUser.role;
      if (userData.position_id) {
        const { data: positionData, error: positionError } = await supabase
          .from('position')
          .select('role')
          .eq('id', userData.position_id)
          .single();
        
        if (!positionError && positionData) {
          newRole = positionData.role;
        }
      }

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
            .from('clician')
            .delete()
            .eq('profile', id);

          if (deleteClinicianError) {
            throw new Error(`Failed to delete clinician record: ${deleteClinicianError.message}`);
          }
        }

        // Create new role-specific records
        if (newRole === 'director') {
          const directionValue = userData.director_info?.direction || 'General';
          const { error: directorError } = await supabase
            .from('director')
            .insert({
              profile: id,
              direction: directionValue
            });

          if (directorError) {
            throw new Error(`Failed to create director record: ${directorError.message}`);
          }
        } else if (newRole === 'clinician' && userData.clinician_info) {
          const { error: clinicianError } = await supabase
            .from('clician')
            .insert({
              profile: id,
              type: userData.clinician_info.type_id
            });

          if (clinicianError) {
            throw new Error(`Failed to create clinician record: ${clinicianError.message}`);
          }
        }
      } else {
        // Role didn't change, but we might need to update role-specific info
        if (newRole === 'director' && userData.director_info) {
          // First, try to update existing director record
          const { data: updateResult, error: directorUpdateError } = await supabase
            .from('director')
            .update({ direction: userData.director_info.direction })
            .eq('profile', id)
            .select();

          // If no rows were updated, it means the director record doesn't exist, so create it
          if (!directorUpdateError && (!updateResult || updateResult.length === 0)) {
            const { error: directorInsertError } = await supabase
              .from('director')
              .insert({
                profile: id,
                direction: userData.director_info.direction
              });

            if (directorInsertError) {
              throw new Error(`Failed to create director record: ${directorInsertError.message}`);
            }
          } else if (directorUpdateError) {
            throw new Error(`Failed to update director record: ${directorUpdateError.message}`);
          }
        } else if (newRole === 'clinician' && userData.clinician_info) {
          // First, try to update existing clinician record
          const { data: updateResult, error: clinicianUpdateError } = await supabase
            .from('clician')
            .update({ type: userData.clinician_info.type_id })
            .eq('profile', id)
            .select();

          // If no rows were updated, it means the clinician record doesn't exist, so create it
          if (!clinicianUpdateError && (!updateResult || updateResult.length === 0)) {
            const { error: clinicianInsertError } = await supabase
              .from('clician')
              .insert({
                profile: id,
                type: userData.clinician_info.type_id
              });

            if (clinicianInsertError) {
              throw new Error(`Failed to create clinician record: ${clinicianInsertError.message}`);
            }
          } else if (clinicianUpdateError) {
            throw new Error(`Failed to update clinician record: ${clinicianUpdateError.message}`);
          }
        }
      }

      // Return the updated user with complete information
      return await this.getUserById(id) as User;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user and their role-specific information
   */
  static async deleteUser(id: string): Promise<void> {
    try {
      console.log('Deleting user with ID:', id);
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
          .from('clician')
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

    } catch (error) {
      console.error('Error deleting user:', error);
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
      .select(`
        id,
        name,
        username,
        position,
        created_at,
        accept,
        position_info:position(
          id,
          position_title,
          role
        )
      `)
      .eq('position_info.role', role)
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
      .select(`
        id,
        name,
        username,
        position,
        created_at,
        accept,
        position_info:position(
          id,
          position_title,
          role
        )
      `)
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
   * Get user's current password
   */
  static async getUserPassword(id: string): Promise<string> {
    const { data, error } = await supabase
      .from('profiles')
      .select('password')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user password: ${error.message}`);
    }

    return data?.password || '';
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
      .select(`
        accept,
        position_info:position(role)
      `);

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
      const role = user.position_info?.role || 'unknown';
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      
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