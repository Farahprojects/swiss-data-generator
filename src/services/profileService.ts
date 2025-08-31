
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logUtils';

export interface UserProfile {
  id: string;
  email: string;
  email_verified: boolean;
  verification_status: 'pending' | 'verified' | 'blocked';
  subscription_plan: string;
  subscription_status: string;
  stripe_customer_id?: string;
  features: Record<string, any>;
  metadata: Record<string, any>;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

class ProfileService {
  /**
   * Ensures profile exists for current authenticated user
   */
  async ensureProfile(): Promise<void> {
    try {
      const { error } = await supabase.rpc('ensure_profile_for_current_user');
      if (error) {
        log('error', 'Failed to ensure profile', error, 'ProfileService.ensureProfile');
        throw error;
      }
      log('debug', 'Profile ensured successfully', null, 'ProfileService.ensureProfile');
    } catch (error) {
      log('error', 'Exception in ensureProfile', error, 'ProfileService.ensureProfile');
      throw error;
    }
  }

  /**
   * Marks profile as verified based on auth.users.email_confirmed_at
   */
  async markProfileVerified(userId?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_profile_verified', {
        user_id: userId || null
      });
      
      if (error) {
        log('error', 'Failed to mark profile verified', error, 'ProfileService.markProfileVerified');
        throw error;
      }
      
      log('debug', 'Profile verification status updated', { verified: data }, 'ProfileService.markProfileVerified');
      return data;
    } catch (error) {
      log('error', 'Exception in markProfileVerified', error, 'ProfileService.markProfileVerified');
      throw error;
    }
  }

  /**
   * Quick check if user is verified
   */
  async isUserVerified(userId?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_user_verified', {
        _user_id: userId || null
      });
      
      if (error) {
        log('error', 'Failed to check user verification', error, 'ProfileService.isUserVerified');
        return false;
      }
      
      return data || false;
    } catch (error) {
      log('error', 'Exception in isUserVerified', error, 'ProfileService.isUserVerified');
      return false;
    }
  }

  /**
   * Gets the full user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();
      
      if (error) {
        log('error', 'Failed to get user profile', error, 'ProfileService.getUserProfile');
        return null;
      }
      
      return data;
    } catch (error) {
      log('error', 'Exception in getUserProfile', error, 'ProfileService.getUserProfile');
      return null;
    }
  }

  /**
   * Initialize profile system for authenticated user
   * Call this after successful authentication
   */
  async initializeProfile(): Promise<UserProfile | null> {
    try {
      // Step 1: Ensure profile exists
      await this.ensureProfile();
      
      // Step 2: Update verification status
      await this.markProfileVerified();
      
      // Step 3: Get the profile
      const profile = await this.getUserProfile();
      
      log('debug', 'Profile initialized successfully', { hasProfile: !!profile }, 'ProfileService.initializeProfile');
      return profile;
    } catch (error) {
      log('error', 'Failed to initialize profile', error, 'ProfileService.initializeProfile');
      return null;
    }
  }
}

export const profileService = new ProfileService();
