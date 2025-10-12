// lib/adService.ts

export class AdService {
  private static adMobInitialized = false;

  /**
   * Initialize AdMob (for production, you'd load the actual SDK here)
   */
  static async initialize(): Promise<void> {
    if (this.adMobInitialized) return;

    // TODO: In production, load AdMob/AdSense SDK
    // For now, we'll simulate
    console.log('Ad service initialized');
    this.adMobInitialized = true;
  }

  /**
   * Show a rewarded video ad
   * Returns: Revenue in cents (estimated)
   */
  static async showRewardedAd(): Promise<{ watched: boolean; revenueCents: number }> {
    await this.initialize();

    // Simulate ad loading time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In production, this would:
    // 1. Load the ad from AdMob
    // 2. Show it to the user
    // 3. Wait for completion
    // 4. Return whether they watched it

    // For testing, we'll use a modal
    return new Promise((resolve) => {
      // Show fake ad modal
      const adModal = document.createElement('div');
      adModal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/90';
      adModal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-md text-center">
          <h3 class="text-white text-xl font-bold mb-4">Video Ad</h3>
          <div class="bg-gray-700 w-full h-48 rounded flex items-center justify-center mb-4">
            <div class="text-gray-400">
              <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/>
              </svg>
              <p>Ad playing... (5 seconds)</p>
            </div>
          </div>
          <div class="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div id="ad-progress" class="h-full bg-blue-600 transition-all duration-100" style="width: 0%"></div>
          </div>
          <p class="text-gray-400 text-sm mb-4">Please wait for the ad to finish...</p>
          <button id="close-ad" disabled class="px-6 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed">
            Close (5s)
          </button>
        </div>
      `;

      document.body.appendChild(adModal);

      // Simulate 5-second ad
      let progress = 0;
      const progressBar = document.getElementById('ad-progress');
      const closeButton = document.getElementById('close-ad') as HTMLButtonElement;

      const interval = setInterval(() => {
        progress += 2; // 2% every 100ms = 5 seconds
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }

        if (progress >= 100) {
          clearInterval(interval);
          if (closeButton) {
            closeButton.disabled = false;
            closeButton.className = 'px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors';
            closeButton.textContent = 'Close & Continue';
            closeButton.onclick = () => {
              document.body.removeChild(adModal);
              resolve({ watched: true, revenueCents: 3 }); // $0.03 per ad
            };
          }
        }
      }, 100);
    });
  }

  /**
   * Show multiple rewarded ads in sequence
   */
  static async showMultipleRewardedAds(count: number): Promise<{ watched: number; totalRevenueCents: number }> {
    let watchedCount = 0;
    let totalRevenue = 0;

    for (let i = 0; i < count; i++) {
      const result = await this.showRewardedAd();
      if (result.watched) {
        watchedCount++;
        totalRevenue += result.revenueCents;
      } else {
        break; // User cancelled
      }
    }

    return { watched: watchedCount, totalRevenueCents: totalRevenue };
  }
}
