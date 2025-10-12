import { createServerClient } from '@/lib/supabase-server';

export type UnlockType = 'daily-pass' | 'video-unlock';
export type FeatureType = 'image-analysis' | 'image-generation' | 'video-generation';

export interface FeatureAccess {
  hasAccess: boolean;
  unlockType?: UnlockType;
  expiresAt?: Date;
  videosRemaining?: number;
}

export class AdRewardSystem {
  /**
   * Check if user has access to a specific feature
   */
  static async checkFeatureAccess(
    userId: string,
    feature: FeatureType
  ): Promise<FeatureAccess> {
    const supabase = await createServerClient();

    const { data, error } = await supabase.rpc('check_feature_access', {
      p_user_id: userId,
      p_feature_type: feature,
    });

    if (error) {
      console.error('Error checking feature access:', error);
      return { hasAccess: false };
    }

    if (!data) {
      return { hasAccess: false };
    }

    // Get unlock details
    const unlockType = feature === 'video-generation' ? 'video-unlock' : 'daily-pass';
    const { data: unlock } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('user_id', userId)
      .eq('unlock_type', unlockType)
      .gt('expires_at', new Date().toISOString())
      .single();

    return {
      hasAccess: data as boolean,
      unlockType: unlock?.unlock_type,
      expiresAt: unlock?.expires_at ? new Date(unlock.expires_at) : undefined,
      videosRemaining: unlock?.videos_remaining,
    };
  }

  /**
   * Record ad view and unlock feature
   */
  static async recordAdUnlock(
    userId: string,
    unlockType: UnlockType,
    revenueCents: number = 3
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServerClient();

    const { error } = await supabase.rpc('record_ad_unlock', {
      p_user_id: userId,
      p_unlock_type: unlockType,
      p_revenue_cents: revenueCents,
    });

    if (error) {
      console.error('Error recording ad unlock:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get user's current unlock status
   */
  static async getUnlockStatus(userId: string) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error getting unlock status:', error);
      return null;
    }

    const dailyPass = data?.find((u) => u.unlock_type === 'daily-pass');
    const videoUnlock = data?.find((u) => u.unlock_type === 'video-unlock');

    return {
      hasDailyPass: !!dailyPass,
      dailyPassExpiresAt: dailyPass?.expires_at,
      hasVideoUnlock: !!videoUnlock,
      videosRemaining: videoUnlock?.videos_remaining || 0,
      videoUnlockExpiresAt: videoUnlock?.expires_at,
    };
  }

  /**
   * Decrement video count after generation
   */
  static async decrementVideoCount(userId: string): Promise<boolean> {
    const supabase = await createServerClient();

    const { data: unlock } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('user_id', userId)
      .eq('unlock_type', 'video-unlock')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!unlock || unlock.videos_remaining <= 0) {
      return false;
    }

    const { error } = await supabase
      .from('feature_unlocks')
      .update({ videos_remaining: unlock.videos_remaining - 1 })
      .eq('id', unlock.id);

    return !error;
  }

  /**
   * Track usage after feature use
   */
  static async trackUsage(
    userId: string,
    feature: FeatureType
  ): Promise<void> {
    const supabase = await createServerClient();

    // Get or create usage record
    const { data: usage } = await supabase
      .from('user_ai_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!usage) {
      // Create new usage record
      await supabase.from('user_ai_usage').insert({
        user_id: userId,
        images_analyzed_today: feature === 'image-analysis' ? 1 : 0,
        images_generated_today: feature === 'image-generation' ? 1 : 0,
        videos_generated_this_month: feature === 'video-generation' ? 1 : 0,
        total_images_analyzed: feature === 'image-analysis' ? 1 : 0,
        total_images_generated: feature === 'image-generation' ? 1 : 0,
        total_videos_generated: feature === 'video-generation' ? 1 : 0,
      });
      return;
    }

    // Check if we need to reset daily counters
    const lastReset = new Date(usage.last_daily_reset);
    const now = new Date();
    const shouldResetDaily =
      now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000;

    // Check if we need to reset monthly counters
    const lastMonthlyReset = new Date(usage.last_monthly_reset);
    const shouldResetMonthly =
      now.getMonth() !== lastMonthlyReset.getMonth() ||
      now.getFullYear() !== lastMonthlyReset.getFullYear();

    // Update usage
    await supabase
      .from('user_ai_usage')
      .update({
        images_analyzed_today:
          (shouldResetDaily ? 0 : usage.images_analyzed_today) +
          (feature === 'image-analysis' ? 1 : 0),
        images_generated_today:
          (shouldResetDaily ? 0 : usage.images_generated_today) +
          (feature === 'image-generation' ? 1 : 0),
        videos_generated_this_month:
          (shouldResetMonthly ? 0 : usage.videos_generated_this_month) +
          (feature === 'video-generation' ? 1 : 0),
        total_images_analyzed:
          usage.total_images_analyzed +
          (feature === 'image-analysis' ? 1 : 0),
        total_images_generated:
          usage.total_images_generated +
          (feature === 'image-generation' ? 1 : 0),
        total_videos_generated:
          usage.total_videos_generated +
          (feature === 'video-generation' ? 1 : 0),
        last_daily_reset: shouldResetDaily ? now.toISOString() : usage.last_daily_reset,
        last_monthly_reset: shouldResetMonthly ? now.toISOString() : usage.last_monthly_reset,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId);
  }
}
