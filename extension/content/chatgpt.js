/**
 * ChatGPT Content Script
 * Extracts conversations from chat.openai.com
 */

class ChatGPTExtractor {
    constructor() {
        this.conversationId = this.extractConversationId();
        this.messages = new Map();
        this.observer = null;
        this.captureButton = null;

        console.log('[ChatGPT] Extractor initialized, conversation:', this.conversationId);

        if (this.conversationId) {
            this.init();
        }
    }

    /**
     * Initialize extractor
     */
    init() {
        // Add capture button to UI
        this.addCaptureButton();

        // Set up mutation observer for new messages
        this.setupObserver();

        // Initial extraction
        this.extractAllMessages();
    }

    /**
     * Extract conversation ID from URL
     */
    extractConversationId() {
        const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
        return match ? match[1] : null;
    }

    /**
     * Add capture button to ChatGPT UI
     */
    addCaptureButton() {
        // Find the header area
        const header = document.querySelector('header');
        if (!header) return;

        // Create button
        const button = document.createElement('button');
        button.textContent = '💾 Capture';
        button.className = 'btn btn-neutral';
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

        button.addEventListener('click', () => this.captureConversation());

        document.body.appendChild(button);
        this.captureButton = button;
    }

    /**
     * Set up MutationObserver to detect new messages
     */
    setupObserver() {
        const container = document.querySelector('main');
        if (!container) {
            console.warn('[ChatGPT] Main container not found');
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    this.processNewNodes(mutation.addedNodes);
                }
            }
        });

        this.observer.observe(container, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Process newly added DOM nodes
     */
    processNewNodes(nodes) {
        for (const node of nodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if it's a message element
                if (node.hasAttribute('data-message-author-role')) {
                    this.extractMessage(node);
                }

                // Check children
                const messages = node.querySelectorAll('[data-message-author-role]');
                messages.forEach(msg => this.extractMessage(msg));
            }
        }
    }

    /**
     * Extract all messages from current page
     */
    extractAllMessages() {
        const messageElements = document.querySelectorAll('[data-message-author-role]');
        console.log(`[ChatGPT] Found ${messageElements.length} messages`);

        messageElements.forEach(el => this.extractMessage(el));
    }

    /**
     * Extract single message
     */
    extractMessage(element) {
        try {
            const role = element.getAttribute('data-message-author-role');
            const messageId = element.getAttribute('data-message-id');

            if (!messageId || this.messages.has(messageId)) {
                return; // Already extracted
            }

            // Find content container
            const contentEl = element.querySelector('.markdown, [class*="markdown"]');
            if (!contentEl) return;

            const message = {
                id: messageId,
                role: role, // 'user' or 'assistant'
                content: this.extractContent(contentEl),
                timestamp: this.extractTimestamp(element),
                model: this.extractModel(element)
            };

            this.messages.set(messageId, message);
            console.log('[ChatGPT] Extracted message:', message.role, message.content.substring(0, 50));

        } catch (error) {
            console.error('[ChatGPT] Error extracting message:', error);
        }
    }

    /**
     * Extract content with formatting preserved
     */
    extractContent(element) {
        const clone = element.cloneNode(true);

        // Process code blocks
        clone.querySelectorAll('pre code').forEach(block => {
            const lang = Array.from(block.classList)
                .find(cls => cls.startsWith('language-'))
                ?.replace('language-', '') || '';

            const code = block.textContent;
            block.textContent = `\`\`\`${lang}\n${code}\n\`\`\``;
        });

        // Process inline code
        clone.querySelectorAll('code:not(pre code)').forEach(code => {
            code.textContent = `\`${code.textContent}\``;
        });

        // Process lists
        clone.querySelectorAll('ul, ol').forEach(list => {
            const items = Array.from(list.querySelectorAll('li'));
            const prefix = list.tagName === 'UL' ? '- ' : '';
            items.forEach((item, idx) => {
                const num = list.tagName === 'OL' ? `${idx + 1}. ` : prefix;
                item.textContent = num + item.textContent;
            });
        });

        return clone.textContent.trim();
    }

    /**
     * Extract timestamp (if available)
     */
    extractTimestamp(element) {
        // ChatGPT doesn't always show timestamps
        // Try to find time element
        const timeEl = element.querySelector('time');
        if (timeEl) {
            return timeEl.getAttribute('datetime') || new Date().toISOString();
        }
        return new Date().toISOString();
    }

    /**
     * Extract model information
     */
    extractModel(element) {
        // Try to find model indicator
        const modelEl = element.querySelector('[class*="model"]');
        if (modelEl) {
            return modelEl.textContent.trim();
        }

        // Default to GPT-4 if not found (common case)
        return 'gpt-4';
    }

    /**
     * Get conversation title
     */
    getConversationTitle() {
        // Try multiple selectors
        const selectors = [
            'h1',
            '[class*="conversation-title"]',
            'title'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim()) {
                return el.textContent.trim();
            }
        }

        // Fallback: use first user message
        const firstUserMessage = Array.from(this.messages.values())
            .find(m => m.role === 'user');

        if (firstUserMessage) {
            return firstUserMessage.content.substring(0, 100);
        }

        return 'Untitled Conversation';
    }

    /**
     * Capture and send conversation
     */
    async captureConversation() {
        try {
            if (!this.conversationId) {
                alert('No conversation ID found. Please open a conversation.');
                return;
            }

            // Re-extract to get latest messages
            this.extractAllMessages();

            if (this.messages.size === 0) {
                alert('No messages found in this conversation.');
                return;
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
                metadata: {
                    timestamp: msg.timestamp
                }
            }));

            // Send to background script
            const response = await chrome.runtime.sendMessage({
                type: 'CAPTURE_CONVERSATION',
                payload: {
                    conversation,
                    messages,
                    agent: 'chatgpt'
                }
            });

            if (response.error) {
                alert(`Error: ${response.error}`);
            } else {
                // Update button to show success
                this.captureButton.textContent = '✓ Captured';
                this.captureButton.style.background = '#10b981';

                setTimeout(() => {
                    this.captureButton.textContent = '💾 Capture';
                    this.captureButton.style.background = '#10a37f';
                }, 2000);
            }

        } catch (error) {
            console.error('[ChatGPT] Capture error:', error);
            alert(`Failed to capture: ${error.message}`);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatGPTExtractor();
    });
} else {
    new ChatGPTExtractor();
}

// Handle SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('[ChatGPT] URL changed, reinitializing');
        new ChatGPTExtractor();
    }
}).observe(document, { subtree: true, childList: true });
