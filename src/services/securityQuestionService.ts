import { supabase } from '../lib/supabase';

// Simple hash function for security answers
const simpleHash = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifyHash = async (text: string, hash: string): Promise<boolean> => {
  const textHash = await simpleHash(text);
  return textHash === hash;
};

export interface SecurityAnswerData {
  question: string;
  answer: string;
}

export interface SecurityAnswerRecord {
  id: string;
  profile_id: string;
  question: string;
  answer_hash: string;
  created_at: string;
}

export class SecurityQuestionService {
  /**
   * Get example security questions for user reference
   */
  static getExampleQuestions(): string[] {
    return [
      'What was the name of your first pet?',
      'In what city were you born?',
      'What is your mother\'s maiden name?',
      'What was the name of your elementary school?',
      'What was the make of your first car?'
    ];
  }

  /**
   * Get user's current security question (without the answer)
   */
  static async getUserSecurityQuestion(profileId: string): Promise<string | null> {
    try {
      const { data: answer, error } = await supabase
        .from('security_answers')
        .select('question')
        .eq('profile_id', profileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No security question found
        }
        throw new Error(`Failed to fetch security question: ${error.message}`);
      }

      return answer?.question || null;
    } catch (error) {
      console.error('Error fetching security question:', error);
      throw error;
    }
  }

  /**
   * Save security answer for a user
   */
  static async saveSecurityAnswer(profileId: string, answerData: SecurityAnswerData): Promise<void> {
    try {
      // Hash the answer for security
      const answerHash = await simpleHash(answerData.answer);

      // Check if user already has an answer
      const { data: existingAnswer, error: checkError } = await supabase
        .from('security_answers')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing answer: ${checkError.message}`);
      }

      if (existingAnswer) {
        // Update existing answer
        const { error: updateError } = await supabase
          .from('security_answers')
          .update({
            question: answerData.question,
            answer_hash: answerHash
          })
          .eq('profile_id', profileId);

        if (updateError) {
          throw new Error(`Failed to update security answer: ${updateError.message}`);
        }
      } else {
        // Insert new answer
        const { error: insertError } = await supabase
          .from('security_answers')
          .insert({
            profile_id: profileId,
            question: answerData.question,
            answer_hash: answerHash
          });

        if (insertError) {
          throw new Error(`Failed to save security answer: ${insertError.message}`);
        }
      }
    } catch (error: any) {
      throw new Error(`Security answer operation failed: ${error.message}`);
    }
  }

  /**
   * Get user's security question by username (for password recovery)
   */
  static async getUserSecurityQuestionByUsername(username: string): Promise<{ question: string; hasAnswer: boolean } | null> {
    try {
      // First find the user by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (profileError || !profile) {
        return null; // User not found
      }

      // Get their security question
      const { data: securityAnswer, error: answerError } = await supabase
        .from('security_answers')
        .select('question')
        .eq('profile_id', profile.id)
        .single();

      if (answerError || !securityAnswer) {
        return { question: '', hasAnswer: false };
      }

      return {
        question: securityAnswer.question,
        hasAnswer: true
      };
    } catch (error: any) {
      throw new Error(`Failed to get security question: ${error.message}`);
    }
  }

  /**
   * Verify security answer and reset password
   */
  static async resetPasswordWithSecurityAnswer(resetData: {
    username: string;
    answer: string;
    newPassword: string;
  }): Promise<boolean> {
    try {
      // Find the user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', resetData.username)
        .single();

      if (profileError || !profile) {
        throw new Error('User not found');
      }

      // Get their security answer
      const { data: securityAnswer, error: answerError } = await supabase
        .from('security_answers')
        .select('answer_hash')
        .eq('profile_id', profile.id)
        .single();

      if (answerError || !securityAnswer) {
        throw new Error('Security answer not found');
      }

      // Verify the answer
      const isAnswerCorrect = await verifyHash(resetData.answer, securityAnswer.answer_hash);

      if (!isAnswerCorrect) {
        return false; // Incorrect answer
      }

      // ⚠️ SECURITY WARNING: Storing password as plain text - major security risk!
      // Update the user's password (storing as plain text)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password: resetData.newPassword })
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Check if user has security question setup
   */
  static async hasSecurityQuestionSetup(profileId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('security_answers')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to check security question setup: ${error.message}`);
      }

      return !!data;
    } catch (error: any) {
      return false;
    }
  }
}