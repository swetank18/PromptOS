/**
 * ChatGPT Content Script
 * Extracts conversations from chat.openai.com and chatgpt.com
 */

class ChatGPTExtractor {
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
        const strict = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (strict) return strict[1];

        const parts = window.location.pathname.split('/').filter(Boolean);
        const tail = parts[parts.length - 1];
        if (tail && tail !== 'c') return tail;

        return `chatgpt-${Date.now()}`;
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
      background: #10a37f;
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
                setTimeout(() => {
                    button.textContent = 'Capture';
                    button.style.background = '#10a37f';
                }, 1500);
            } else {
                button.textContent = 'Retry';
                button.style.background = '#ef4444';
                setTimeout(() => {
                    button.textContent = 'Capture';
                    button.style.background = '#10a37f';
                }, 1800);
            }
        });

        document.body.appendChild(button);
        this.captureButton = button;
    }

    setupObserver() {
        const container = document.querySelector('main') || document.body;
        if (!container) return;

        if (this.observer) this.observer.disconnect();
        this.observer = new MutationObserver(() => this.extractAllMessages());
        this.observer.observe(container, { childList: true, subtree: true });
    }

    extractAllMessages() {
        const nodes = document.querySelectorAll(
            '[data-message-author-role], article[data-testid*="conversation-turn"], article'
        );

        nodes.forEach((el, idx) => this.extractMessage(el, idx));
    }

    extractMessage(element, index = 0) {
        try {
            const role = element.getAttribute('data-message-author-role') ||
                (element.textContent?.includes('You said:') ? 'user' : 'assistant');

            const messageId = element.getAttribute('data-message-id') ||
                element.id ||
                `chatgpt-msg-${index}`;

            if (!messageId || this.messages.has(messageId)) return;

            const contentEl = element.querySelector(
                '.markdown, [class*="markdown"], [data-message-content], div[class*="prose"]'
            ) || element;

            const content = this.extractContent(contentEl);
            if (!content) return;

            this.messages.set(messageId, {
                id: messageId,
                role: role === 'user' ? 'user' : 'assistant',
                content,
                timestamp: new Date().toISOString(),
                model: 'gpt-4'
            });
        } catch (error) {
            console.error('[ChatGPT] extractMessage error', error);
        }
    }

    extractContent(element) {
        return (element.textContent || '').trim();
    }

    getConversationTitle() {
        const title = document.querySelector('h1')?.textContent?.trim();
        if (title) return title;

        const firstUser = Array.from(this.messages.values()).find((m) => m.role === 'user');
        return firstUser ? firstUser.content.slice(0, 100) : 'Untitled Conversation';
    }

    async captureConversation() {
        this.extractAllMessages();

        if (!this.conversationId) {
            return { error: 'No conversation detected on this page.' };
        }

        if (this.messages.size === 0) {
            return { error: 'No messages found. Scroll the thread and try again.' };
        }

        const conversation = {
            external_id: this.conversationId,
            title: this.getConversationTitle(),
            metadata: {
                source: 'chatgpt',
                url: window.location.href,
                captured_at: new Date().toISOString()
            }
        };

        const messages = Array.from(this.messages.values()).map((msg, idx) => ({
            role: msg.role,
            content: msg.content,
            sequence_number: idx,
            external_id: msg.id,
            model: msg.model,
            metadata: { timestamp: msg.timestamp }
        }));

        const response = await chrome.runtime.sendMessage({
            type: 'CAPTURE_CONVERSATION',
            payload: { conversation, messages, agent: 'chatgpt' }
        });

        if (response?.error) return { error: response.error };
        return { success: true, messageCount: messages.length };
    }
}

const initExtractor = () => {
    if (!window.__chatgptExtractor) {
        window.__chatgptExtractor = new ChatGPTExtractor();
    } else {
        window.__chatgptExtractor.extractAllMessages();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtractor);
} else {
    initExtractor();
}

let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        window.__chatgptExtractor = null;
        initExtractor();
    }
}).observe(document, { subtree: true, childList: true });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'CAPTURE_NOW') return false;

    initExtractor();
    window.__chatgptExtractor.captureConversation()
        .then((result) => sendResponse(result || { error: 'Capture returned no result' }))
        .catch((error) => sendResponse({ error: error.message }));

    return true;
});
