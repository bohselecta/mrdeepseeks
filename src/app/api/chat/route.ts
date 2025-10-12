import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { AdRewardSystem } from '@/lib/adSystem';
import {
  analyzeImage,
  generateImage,
  generateVideo,
} from '@/lib/deepinfra';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    const formData = await req.formData();
    const message = formData.get('message') as string;
    const mode = formData.get('mode') as string;
    const imageFile = formData.get('image') as File | null;

    // ============================================
    // TEXT CHAT MODE (Always Free - No Auth Required)
    // ============================================
    if (mode === 'text') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are Mr. Deepseeks, a helpful AI assistant.',
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('DeepSeek API failed');
      }

      const data = await response.json();

      return NextResponse.json({
        content: data.choices[0].message.content,
      });
    }

    // ============================================
    // IMAGE ANALYSIS MODE (Premium Feature - Auth Required)
    // ============================================
    if (mode === 'image-analysis') {
      // Get authenticated user for premium features
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for image analysis' },
          { status: 401 }
        );
      }

      // Check feature access
      const access = await AdRewardSystem.checkFeatureAccess(
        user.id,
        'image-analysis'
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          {
            error: 'Feature locked',
            message: 'Watch an ad to unlock image analysis',
            requiresUnlock: true,
            unlockType: 'daily-pass',
          },
          { status: 403 }
        );
      }

      if (!imageFile) {
        return NextResponse.json(
          { error: 'Image file required' },
          { status: 400 }
        );
      }

      // Convert image to base64
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Analyze image
      const result = await analyzeImage(base64, message || 'Describe this image in detail.');

      // Track usage
      await AdRewardSystem.trackUsage(user.id, 'image-analysis');

      return NextResponse.json({
        content: result.content,
        cost: result.cost,
      });
    }

    // ============================================
    // IMAGE GENERATION MODE (Premium Feature - Auth Required)
    // ============================================
    if (mode === 'image-generation') {
      // Get authenticated user for premium features
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for image generation' },
          { status: 401 }
        );
      }

      // Check feature access
      const access = await AdRewardSystem.checkFeatureAccess(
        user.id,
        'image-generation'
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          {
            error: 'Feature locked',
            message: 'Watch an ad to unlock image generation',
            requiresUnlock: true,
            unlockType: 'daily-pass',
          },
          { status: 403 }
        );
      }

      if (!message?.trim()) {
        return NextResponse.json(
          { error: 'Prompt required for image generation' },
          { status: 400 }
        );
      }

      // Generate image
      const result = await generateImage(message);

      // Track usage
      await AdRewardSystem.trackUsage(user.id, 'image-generation');

      return NextResponse.json({
        content: 'Generated your image!',
        mediaUrl: result.imageUrl,
        cost: result.cost,
      });
    }

    // ============================================
    // VIDEO GENERATION MODE (Premium Feature - Auth Required)
    // ============================================
    if (mode === 'video-generation') {
      // Get authenticated user for premium features
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for video generation' },
          { status: 401 }
        );
      }

      // Check feature access
      const access = await AdRewardSystem.checkFeatureAccess(
        user.id,
        'video-generation'
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          {
            error: 'Feature locked',
            message: 'Watch 3 ads to unlock video generation',
            requiresUnlock: true,
            unlockType: 'video-unlock',
          },
          { status: 403 }
        );
      }

      // Check monthly limit
      const { data: usage } = await supabase
        .from('user_ai_usage')
        .select('videos_generated_this_month')
        .eq('user_id', user.id)
        .single();

      if (usage && usage.videos_generated_this_month >= 10) {
        return NextResponse.json(
          {
            error: 'Monthly limit reached',
            message: 'You have reached your monthly limit of 10 videos',
          },
          { status: 429 }
        );
      }

      if (!message?.trim()) {
        return NextResponse.json(
          { error: 'Prompt required for video generation' },
          { status: 400 }
        );
      }

      // Generate video
      const result = await generateVideo(message);

      // Decrement video count
      const decremented = await AdRewardSystem.decrementVideoCount(user.id);
      if (!decremented) {
        return NextResponse.json(
          { error: 'Failed to decrement video count' },
          { status: 500 }
        );
      }

      // Track usage
      await AdRewardSystem.trackUsage(user.id, 'video-generation');

      return NextResponse.json({
        content: 'Generated your video!',
        mediaUrl: result.videoUrl,
        cost: result.cost,
      });
    }

    return NextResponse.json(
      { error: 'Invalid mode' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
