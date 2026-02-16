/**
 * Gemini Content Script
 */

class GeminiExtractor {
    constructor() {
        this.conversationId = this.extractConversationId();
        this.messages = new Map();
        this.observer = null;
        this.captureButton = null;
        this.init();
    }

    init() {
        this.addCaptureButton();
        this.setupObserver();
        this.extractAllMessages();
    }

    extractConversationId() {
        const strict = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
        if (strict) return strict[1];
        const parts = window.location.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || `gemini-${Date.now()}`;
    }

    addCaptureButton() {
        if (this.captureButton) return;

        const button = document.createElement('button');
        button.textContent = 'Capture';
        button.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      padding: 8px 16px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    `;

        button.addEventListener('click', async () => {
            const result = await this.captureConversation();
            if (result?.success) {
                button.textContent = 'Captured';
                button.style.background = '#10b981';
            } else {
                button.textContent = 'Retry';
                button.style.background = '#ef4444';
            }
            setTimeout(() => {
                button.textContent = 'Capture';
                button.style.background = '#4285f4';
            }, 1600);
        });

        document.body.appendChild(button);
        this.captureButton = button;
    }

    setupObserver() {
        const container = document.querySelector('main') || document.body;
        if (this.observer) this.observer.disconnect();
        this.observer = new MutationObserver(() => this.extractAllMessages());
        this.observer.observe(container, { childList: true, subtree: true });
    }

    extractAllMessages() {
        const nodes = document.querySelectorAll(
            '[data-test-id*="message"], .message-content, [class*="conversation-turn"], message-content'
        );
        nodes.forEach((el, idx) => this.extractMessage(el, idx));
    }

    extractMessage(element, index = 0) {
        const messageId = element.getAttribute('data-message-id') || element.id || `gemini-msg-${index}`;
        if (this.messages.has(messageId)) return;

        const isUser = element.getAttribute('data-role') === 'user' || element.classList.contains('user-message');
        const role = isUser ? 'user' : 'assistant';

        const contentEl = element.querySelector('.message-content, [class*="text-content"], [class*="prose"]') || element;
        const content = (contentEl.textContent || '').trim();
        if (!content) return;

        this.messages.set(messageId, {
            id: messageId,
            role,
            content,
            timestamp: new Date().toISOString(),
        });
    }

    getConversationTitle() {
        const title = document.querySelector('h1')?.textContent?.trim();
        if (title) return title;
        const firstUser = Array.from(this.messages.values()).find((m) => m.role === 'user');
        return firstUser ? firstUser.content.slice(0, 100) : 'Untitled Conversation';
    }

    async captureConversation() {
        this.extractAllMessages();

        if (this.messages.size === 0) {
            return { error: 'No messages found. Scroll the thread and try again.' };
        }

        const conversation = {
            external_id: this.conversationId,
            title: this.getConversationTitle(),
            metadata: {
                source: 'gemini',
                url: window.location.href,
                captured_at: new Date().toISOString()
            }
        };

        const messages = Array.from(this.messages.values()).map((msg, idx) => ({
            role: msg.role,
            content: msg.content,
            sequence_number: idx,
            external_id: msg.id,
            metadata: { timestamp: msg.timestamp }
        }));

        const response = await chrome.runtime.sendMessage({
            type: 'CAPTURE_CONVERSATION',
            payload: { conversation, messages, agent: 'gemini' }
        });

        if (response?.error) return { error: response.error };
        return { success: true, messageCount: messages.length };
    }
}

const initGeminiExtractor = () => {
    if (!window.__geminiExtractor) {
        window.__geminiExtractor = new GeminiExtractor();
    } else {
        window.__geminiExtractor.extractAllMessages();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGeminiExtractor);
} else {
    initGeminiExtractor();
}

let geminiLastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== geminiLastUrl) {
        geminiLastUrl = location.href;
        window.__geminiExtractor = null;
        initGeminiExtractor();
    }
}).observe(document, { subtree: true, childList: true });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'CAPTURE_NOW') return false;

    initGeminiExtractor();
    window.__geminiExtractor.captureConversation()
        .then((result) => sendResponse(result || { error: 'Capture returned no result' }))
        .catch((error) => sendResponse({ error: error.message }));

    return true;
});
