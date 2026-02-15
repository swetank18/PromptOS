/**
 * Extension Popup Script
 */

// DOM Elements
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const queueCount = document.getElementById('queue-count');
const syncStatus = document.getElementById('sync-status');
const messageEl = document.getElementById('message');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Check authentication status
    const status = await getStatus();

    if (status.authenticated) {
        showMainSection();
        updateUI(status);
    } else {
        showAuthSection();
    }

    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Auth
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('register-btn').addEventListener('click', handleRegister);
    document.getElementById('show-register').addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    document.getElementById('show-login').addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Actions
    document.getElementById('sync-btn').addEventListener('click', handleSync);
    document.getElementById('capture-btn').addEventListener('click', handleCapture);

    // Settings
    document.getElementById('auto-sync').addEventListener('change', handleAutoSyncToggle);
    document.getElementById('api-url').addEventListener('change', handleApiUrlChange);
    document.getElementById('project-select').addEventListener('change', handleProjectChange);
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessage('Please enter email and password', 'error');
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'LOGIN',
            payload: { email, password }
        });

        if (response.error) {
            showMessage(response.error, 'error');
        } else {
            showMessage('Logged in successfully', 'success');
            showMainSection();
            const status = await getStatus();
            updateUI(status);
        }
    } catch (error) {
        showMessage('Login failed: ' + error.message, 'error');
    }
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) {
        showMessage('Please fill all fields', 'error');
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'REGISTER',
            payload: { name, email, password }
        });

        if (response.error) {
            showMessage(response.error, 'error');
        } else {
            showMessage('Registered successfully! Please sign in.', 'success');
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        }
    } catch (error) {
        showMessage('Registration failed: ' + error.message, 'error');
    }
}

async function handleLogout() {
    await chrome.storage.sync.remove('authToken');
    showAuthSection();
    showMessage('Logged out', 'success');
}

async function handleSync() {
    const btn = document.getElementById('sync-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Syncing...';

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SYNC_NOW'
        });

        if (response.error) {
            showMessage(response.error, 'error');
        } else {
            showMessage(`Synced ${response.result.synced} conversations`, 'success');
            const status = await getStatus();
            updateUI(status);
        }
    } catch (error) {
        showMessage('Sync failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔄 Sync Now</span>';
    }
}

async function handleCapture() {
    const btn = document.getElementById('capture-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Capturing...';

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'CAPTURE_NOW'
        });

        if (response?.error) {
            showMessage(response.error, 'error');
        } else {
            showMessage('Conversation captured!', 'success');
        }
    } catch (error) {
        showMessage('Capture failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>💾 Capture Current</span>';
    }
}

async function handleAutoSyncToggle(e) {
    const enabled = e.target.checked;

    await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: { autoSync: enabled }
    });

    showMessage(`Auto sync ${enabled ? 'enabled' : 'disabled'}`, 'success');
}

async function handleApiUrlChange(e) {
    const apiUrl = e.target.value;

    await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: { apiUrl }
    });

    showMessage('API URL updated', 'success');
}

async function handleProjectChange(e) {
    const projectId = e.target.value || null;

    await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: { projectId }
    });

    showMessage('Default project updated', 'success');
}

async function getStatus() {
    return chrome.runtime.sendMessage({ type: 'GET_STATUS' });
}

function updateUI(status) {
    // Update status indicator
    if (status.authenticated && status.online) {
        statusIndicator.classList.add('online');
        statusIndicator.classList.remove('offline');
        statusText.textContent = 'Online';
    } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusText.textContent = status.online ? 'Not Authenticated' : 'Offline';
    }

    // Update queue count
    queueCount.textContent = status.queueSize || 0;

    // Update last sync
    if (status.lastSync) {
        const date = new Date(status.lastSync);
        syncStatus.textContent = formatRelativeTime(date);
    } else {
        syncStatus.textContent = 'Never';
    }

    // Update settings
    if (status.settings) {
        document.getElementById('auto-sync').checked = status.settings.autoSync !== false;
        document.getElementById('api-url').value = status.settings.apiUrl || 'http://localhost:8000';
    }
}

function showAuthSection() {
    authSection.style.display = 'block';
    mainSection.style.display = 'none';
}

function showMainSection() {
    authSection.style.display = 'none';
    mainSection.style.display = 'block';
}

function showMessage(text, type = 'success') {
    messageEl.textContent = text;
    messageEl.className = `message show ${type}`;

    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Refresh status every 10 seconds
setInterval(async () => {
    const status = await getStatus();
    updateUI(status);
}, 10000);
