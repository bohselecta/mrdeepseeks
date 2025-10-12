import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { AdRewardSystem, UnlockType } from '@/lib/adSystem';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { unlockType, revenueCents } = await req.json();

    if (!unlockType || !['daily-pass', 'video-unlock'].includes(unlockType)) {
      return NextResponse.json(
        { error: 'Invalid unlock type' },
        { status: 400 }
      );
    }

    // Record the ad unlock
    const result = await AdRewardSystem.recordAdUnlock(
      user.id,
      unlockType as UnlockType,
      revenueCents || 3
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to unlock feature' },
        { status: 500 }
      );
    }

    // Get updated unlock status
    const status = await AdRewardSystem.getUnlockStatus(user.id);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: unknown) {
    console.error('Unlock API error:', error);
    return NextResponse.json(
      { error: 'Failed to unlock feature', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Get current unlock status
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const status = await AdRewardSystem.getUnlockStatus(user.id);

    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('Get unlock status error:', error);
    return NextResponse.json(
      { error: 'Failed to get unlock status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
