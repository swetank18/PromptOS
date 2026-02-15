/**
 * Sync Service - Handles periodic synchronization with backend
 */

export class SyncService {
    constructor(apiClient, queueManager) {
        this.apiClient = apiClient;
        this.queueManager = queueManager;
        this.isSyncing = false;
        this.lastSyncTime = null;
    }

    /**
     * Sync queued conversations
     */
    async syncNow() {
        if (this.isSyncing) {
            console.log('[Sync] Already syncing, skipping');
            return;
        }

        this.isSyncing = true;

        try {
            const pending = await this.queueManager.getPending(10);

            if (pending.length === 0) {
                console.log('[Sync] No pending items');
                return { synced: 0, failed: 0 };
            }

            console.log(`[Sync] Syncing ${pending.length} items`);

            const results = {
                synced: 0,
                failed: 0
            };

            for (const item of pending) {
                try {
                    await this.apiClient.createConversation(item.data);
                    await this.queueManager.markSynced(item.id);
                    results.synced++;
                } catch (error) {
                    console.error('[Sync] Failed to sync item:', error);
                    await this.queueManager.markFailed(item.id, error.message);
                    results.failed++;
                }
            }

            this.lastSyncTime = Date.now();
            await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });

            console.log('[Sync] Complete:', results);
            return results;

        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get last sync time
     */
    async getLastSyncTime() {
        if (this.lastSyncTime) return this.lastSyncTime;

        const result = await chrome.storage.local.get('lastSyncTime');
        this.lastSyncTime = result.lastSyncTime || null;
        return this.lastSyncTime;
    }

    /**
     * Restart sync timer
     */
    restartTimer(interval) {
        chrome.alarms.clear('periodicSync');
        chrome.alarms.create('periodicSync', {
            periodInMinutes: interval / 60000
        });
    }
}
