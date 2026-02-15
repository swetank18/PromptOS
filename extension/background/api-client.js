/**
 * API Client for backend communication
 */

export class APIClient {
    constructor() {
        this.baseURL = null;
        this.token = null;
        this.init();
    }

    async init() {
        const settings = await chrome.storage.sync.get(['settings', 'authToken']);
        this.baseURL = settings.settings?.apiUrl || 'http://localhost:8000';
        this.token = settings.authToken;
    }

    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        await this.init(); // Ensure latest settings

        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token expired, clear it
            await chrome.storage.sync.remove('authToken');
            this.token = null;
            throw new Error('Authentication required');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Authenticate user
     */
    async login(email, password) {
        const response = await this.request('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        this.token = response.access_token;
        await chrome.storage.sync.set({ authToken: this.token });

        return response;
    }

    /**
     * Register new user
     */
    async register(email, password, fullName) {
        const response = await this.request('/api/v1/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                full_name: fullName
            })
        });

        return response;
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        if (!this.token) return false;

        try {
            await this.request('/api/v1/auth/me');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create conversation
     */
    async createConversation(data) {
        return this.request('/api/v1/conversations/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Batch create conversations
     */
    async batchCreateConversations(conversations) {
        return this.request('/api/v1/conversations/batch', {
            method: 'POST',
            body: JSON.stringify({ conversations })
        });
    }

    /**
     * Get projects
     */
    async getProjects() {
        return this.request('/api/v1/projects/');
    }

    /**
     * Create project
     */
    async createProject(name, description, color) {
        return this.request('/api/v1/projects/', {
            method: 'POST',
            body: JSON.stringify({ name, description, color })
        });
    }

    /**
     * Get agents
     */
    async getAgents() {
        return this.request('/api/v1/agents/');
    }
}
