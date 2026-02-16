/**
 * Background Service Worker (Manifest v3)
 * Handles message routing, API communication, and offline queue management
 */

import { APIClient } from './api-client.js';
import { QueueManager } from './queue-manager.js';
import { SyncService } from './sync-service.js';

// Initialize services
const apiClient = new APIClient();
const queueManager = new QueueManager();
const syncService = new SyncService(apiClient, queueManager);

// Configuration
const CONFIG = {
  SYNC_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_RETRIES: 3,
  BATCH_SIZE: 10
};

/**
 * Message handler for content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type);

  switch (message.type) {
    case 'CAPTURE_CONVERSATION':
      handleCaptureConversation(message.payload, sender)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response

    case 'SYNC_NOW':
      syncService.syncNow()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'LOGIN':
      apiClient.login(message.payload?.email, message.payload?.password)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'REGISTER':
      apiClient.register(
        message.payload?.email,
        message.payload?.password,
        message.payload?.name
      )
        .then(result => sendResponse({ success: true, ...result }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'GET_STATUS':
      getExtensionStatus()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'UPDATE_SETTINGS':
      updateSettings(message.payload)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Handle conversation capture from content scripts
 */
async function handleCaptureConversation(payload, sender) {
  try {
    const { conversation, messages, agent } = payload;
    
    // Validate payload
    if (!conversation || !messages || !agent) {
      throw new Error('Invalid payload: missing required fields');
    }

    // Get current settings
    const settings = await getSettings();
    
    // Normalize payload to backend schema (ConversationCreate)
    const enrichedData = {
      agent_id: agent,
      title: conversation.title || 'Untitled Conversation',
      external_id: conversation.external_id || null,
      project_id: conversation.project_id || null,
      metadata: {
        ...(conversation.metadata || {}),
        captured_at: new Date().toISOString(),
        source_url: sender.tab?.url || sender.url
      },
      messages: messages.map((msg, idx) => ({
        ...msg,
        role: msg.role || 'assistant',
        sequence_number: Number.isInteger(msg.sequence_number) ? msg.sequence_number : idx,
        metadata: {
          ...(msg.metadata || {}),
          captured_at: new Date().toISOString()
        }
      }))
    };

    // Try to send immediately if online
    if (navigator.onLine && settings.autoSync) {
      try {
        const result = await apiClient.createConversation(enrichedData);
        
        // Update badge
        updateBadge('success');
        
        return {
          success: true,
          conversationId: result.id,
          synced: true
        };
      } catch (error) {
        console.error('[Background] Failed to sync immediately:', error);
        // Fall through to queue
      }
    }

    // Queue for later sync
    await queueManager.enqueue(enrichedData);
    
    // Update badge
    const queueSize = await queueManager.getSize();
    updateBadge('queued', queueSize);

    return {
      success: true,
      queued: true,
      queueSize
    };

  } catch (error) {
    console.error('[Background] Error handling capture:', error);
    updateBadge('error');
    throw error;
  }
}

/**
 * Get extension status
 */
async function getExtensionStatus() {
  const settings = await getSettings();
  const queueSize = await queueManager.getSize();
  const isAuthenticated = await apiClient.isAuthenticated();

  return {
    authenticated: isAuthenticated,
    queueSize,
    settings,
    online: navigator.onLine,
    lastSync: await syncService.getLastSyncTime()
  };
}

/**
 * Update extension settings
 */
async function updateSettings(newSettings) {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  
  await chrome.storage.sync.set({ settings: updatedSettings });
  
  // Restart sync timer if interval changed
  if (newSettings.syncInterval) {
    syncService.restartTimer(newSettings.syncInterval);
  }

  return updatedSettings;
}

/**
 * Get settings from storage
 */
async function getSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || {
    autoSync: true,
    syncInterval: CONFIG.SYNC_INTERVAL,
    captureMode: 'auto', // 'auto' | 'manual'
    projectId: null,
    apiUrl: 'http://localhost:8000'
  };
}

/**
 * Update extension badge
 */
function updateBadge(status, count = 0) {
  const badges = {
    success: { text: '✓', color: '#10b981' },
    queued: { text: count.toString(), color: '#f59e0b' },
    error: { text: '!', color: '#ef4444' },
    syncing: { text: '↻', color: '#3b82f6' }
  };

  const badge = badges[status] || badges.queued;
  
  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });

  // Clear success badge after 3 seconds
  if (status === 'success') {
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
}

/**
 * Periodic sync alarm
 */
chrome.alarms.create('periodicSync', {
  periodInMinutes: CONFIG.SYNC_INTERVAL / 60000
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    syncService.syncNow().catch(console.error);
  }
});

/**
 * Handle online/offline events
 */
self.addEventListener('online', () => {
  console.log('[Background] Back online, triggering sync');
  syncService.syncNow().catch(console.error);
});

self.addEventListener('offline', () => {
  console.log('[Background] Offline mode');
  updateBadge('queued', 0);
});

/**
 * Installation handler
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
      settings: {
        autoSync: true,
        syncInterval: CONFIG.SYNC_INTERVAL,
        captureMode: 'auto',
        projectId: null,
        apiUrl: 'http://localhost:8000'
      }
    });

    // Open onboarding page
    chrome.tabs.create({ url: 'popup/index.html' });
  }
});

console.log('[Background] Service worker initialized');
