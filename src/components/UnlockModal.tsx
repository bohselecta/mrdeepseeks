'use client';

import { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { AdService } from '@/lib/adService';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockType: 'daily-pass' | 'video-unlock';
  onUnlock: (revenueCents: number) => Promise<void>;
}

export default function UnlockModal({
  isOpen,
  onClose,
  unlockType,
  onUnlock,
}: UnlockModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);

  const adsRequired = unlockType === 'daily-pass' ? 1 : 3;

  const handleWatchAds = async () => {
    setIsLoading(true);

    try {
      const adsToWatch = adsRequired - adsWatched;
      const result = await AdService.showMultipleRewardedAds(adsToWatch);

      const newCount = adsWatched + result.watched;
      setAdsWatched(newCount);

      if (newCount >= adsRequired) {
        // All ads watched - unlock feature
        await onUnlock(result.totalRevenueCents);
        setAdsWatched(0); // Reset for next time
      }
    } catch (error) {
      console.error('Error watching ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mb-4">
            {unlockType === 'daily-pass' ? (
              <Sparkles className="w-8 h-8 text-white" />
            ) : (
              <Video className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {unlockType === 'daily-pass'
              ? '🎟️ Get Your Daily AI Pass'
              : '🎬 Unlock Video Generation'}
          </h2>
          <p className="text-gray-400">
            {unlockType === 'daily-pass'
              ? 'Watch 1 short ad to unlock premium features'
              : 'Watch 3 short ads to unlock video generation'}
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            {unlockType === 'daily-pass' ? 'Unlocks for 24 hours:' : 'Unlocks for 30 days:'}
          </h3>
          <ul className="space-y-2">
            {unlockType === 'daily-pass' ? (
              <>
                <li className="flex items-center text-sm text-gray-300">
                  <ImageIcon className="w-4 h-4 text-purple-400 mr-2" />
                  50 image analyses
                </li>
                <li className="flex items-center text-sm text-gray-300">
                  <Sparkles className="w-4 h-4 text-pink-400 mr-2" />
                  20 image generations
                </li>
              </>
            ) : (
              <li className="flex items-center text-sm text-gray-300">
                  <Video className="w-4 h-4 text-red-400 mr-2" />
                1 video generation (5 seconds, max 10/month)
              </li>
            )}
          </ul>
        </div>

        {/* Progress */}
        {adsWatched > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>
                {adsWatched} / {adsRequired} ads
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                style={{ width: `${(adsWatched / adsRequired) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Maybe Later
          </button>
          <button
            onClick={handleWatchAds}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : adsWatched > 0 && adsWatched < adsRequired ? (
              `Watch ${adsRequired - adsWatched} More`
            ) : (
              `Watch ${adsRequired} Ad${adsRequired > 1 ? 's' : ''}`
            )}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          By watching ads, you help keep Mr. Deepseeks free for everyone! 💖
        </p>
      </div>
    </div>
  );
}
