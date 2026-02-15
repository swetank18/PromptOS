/**
 * Queue Manager for offline conversation storage
 * Uses IndexedDB for persistent storage
 */

export class QueueManager {
    constructor() {
        this.dbName = 'ConversationQueue';
        this.storeName = 'queue';
        this.db = null;
        this.init();
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('retries', 'retries', { unique: false });
                }
            };
        });
    }

    /**
     * Ensure DB is initialized
     */
    async ensureDB() {
        if (!this.db) {
            await this.init();
        }
    }

    /**
     * Add item to queue
     */
    async enqueue(data) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const item = {
                data,
                timestamp: Date.now(),
                status: 'pending',
                retries: 0,
                lastError: null
            };

            const request = store.add(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending items
     */
    async getPending(limit = 10) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('status');

            const request = index.getAll('pending', limit);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mark item as synced
     */
    async markSynced(id) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mark item as failed
     */
    async markFailed(id, error, maxRetries = 3) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;

                if (!item) {
                    reject(new Error('Item not found'));
                    return;
                }

                item.retries += 1;
                item.lastError = error;

                if (item.retries >= maxRetries) {
                    item.status = 'failed';
                }

                const updateRequest = store.put(item);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Get queue size
     */
    async getSize() {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('status');

            const request = index.count('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all items
     */
    async clear() {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get failed items
     */
    async getFailed() {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('status');

            const request = index.getAll('failed');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
