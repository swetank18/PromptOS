/**
 * Gemini Content Script
 * Extracts conversations from gemini.google.com
 */

class GeminiExtractor {
    constructor() {
        this.conversationId = this.extractConversationId();
        this.messages = new Map();
        this.observer = null;
        this.captureButton = null;

        console.log('[Gemini] Extractor initialized, conversation:', this.conversationId);

        if (this.conversationId) {
            this.init();
        }
    }

    init() {
        this.addCaptureButton();
        this.setupObserver();
        this.extractAllMessages();
    }

    extractConversationId() {
        // Gemini uses different URL patterns
        const match = window.location.pathname.match(/\/app\/([a-f0-9-]+)/);
        return match ? match[1] : `gemini-${Date.now()}`;
    }

    addCaptureButton() {
        const button = document.createElement('button');
        button.textContent = '💾 Capture';
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

        button.addEventListener('click', () => this.captureConversation());

        document.body.appendChild(button);
        this.captureButton = button;
    }

    setupObserver() {
        const container = document.querySelector('main') || document.body;

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

    processNewNodes(nodes) {
        for (const node of nodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Gemini uses Material Design components
                const messages = node.querySelectorAll('[data-test-id*="message"], .message-content');
                messages.forEach(msg => this.extractMessage(msg));
            }
        }
    }

    extractAllMessages() {
        // Try multiple selectors for Gemini's structure
        const selectors = [
            '[data-test-id*="message"]',
            '.message-content',
            '[class*="conversation-turn"]'
        ];

        let messageElements = [];
        for (const selector of selectors) {
            messageElements = document.querySelectorAll(selector);
            if (messageElements.length > 0) break;
        }

        console.log(`[Gemini] Found ${messageElements.length} messages`);
        messageElements.forEach((el, idx) => this.extractMessage(el, idx));
    }

    extractMessage(element, index = null) {
        try {
            const messageId = element.getAttribute('data-message-id') ||
                `msg-${index || this.messages.size}`;

            if (this.messages.has(messageId)) {
                return;
            }

            // Determine role - Gemini uses different indicators
            const isUser = element.querySelector('[data-role="user"]') !== null ||
                element.classList.contains('user-message');
            const role = isUser ? 'user' : 'assistant';

            // Find content
            const contentEl = element.querySelector('.message-content, [class*="text-content"]') || element;

            const message = {
                id: messageId,
                role: role,
                content: this.extractContent(contentEl),
                timestamp: new Date().toISOString(),
                citations: this.extractCitations(element)
            };

            this.messages.set(messageId, message);
            console.log('[Gemini] Extracted message:', message.role, message.content.substring(0, 50));

        } catch (error) {
            console.error('[Gemini] Error extracting message:', error);
        }
    }

    extractContent(element) {
        const clone = element.cloneNode(true);

        // Process code blocks
        clone.querySelectorAll('pre code').forEach(block => {
            const lang = block.className.match(/language-(\w+)/)?.[1] || '';
            const code = block.textContent;
            block.textContent = `\`\`\`${lang}\n${code}\n\`\`\``;
        });

        // Process inline code
        clone.querySelectorAll('code:not(pre code)').forEach(code => {
            code.textContent = `\`${code.textContent}\``;
        });

        // Process tables
        clone.querySelectorAll('table').forEach(table => {
            const rows = Array.from(table.querySelectorAll('tr'));
            const tableText = rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                return cells.map(cell => cell.textContent.trim()).join(' | ');
            }).join('\n');
            table.textContent = '\n' + tableText + '\n';
        });

        return clone.textContent.trim();
    }

    extractCitations(element) {
        // Gemini shows search grounding citations
        const citations = [];
        const citationElements = element.querySelectorAll('[data-citation], .citation');

        citationElements.forEach(cite => {
            citations.push({
                title: cite.getAttribute('data-title') || cite.textContent.trim(),
                url: cite.getAttribute('href') || cite.getAttribute('data-url')
            });
        });

        return citations;
    }

    getConversationTitle() {
        const titleEl = document.querySelector('h1, [class*="conversation-title"]');
        if (titleEl && titleEl.textContent.trim()) {
            return titleEl.textContent.trim();
        }

        const firstUserMessage = Array.from(this.messages.values())
            .find(m => m.role === 'user');

        if (firstUserMessage) {
            return firstUserMessage.content.substring(0, 100);
        }

        return 'Untitled Conversation';
    }

    async captureConversation() {
        try {
            if (!this.conversationId) {
                alert('No conversation ID found. Please open a conversation.');
                return;
            }

            this.extractAllMessages();

            if (this.messages.size === 0) {
                alert('No messages found in this conversation.');
                return;
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
                metadata: {
                    timestamp: msg.timestamp,
                    citations: msg.citations
                }
            }));

            const response = await chrome.runtime.sendMessage({
                type: 'CAPTURE_CONVERSATION',
                payload: {
                    conversation,
                    messages,
                    agent: 'gemini'
                }
            });

            if (response.error) {
                alert(`Error: ${response.error}`);
            } else {
                this.captureButton.textContent = '✓ Captured';
                this.captureButton.style.background = '#10b981';

                setTimeout(() => {
                    this.captureButton.textContent = '💾 Capture';
                    this.captureButton.style.background = '#4285f4';
                }, 2000);
            }

        } catch (error) {
            console.error('[Gemini] Capture error:', error);
            alert(`Failed to capture: ${error.message}`);
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GeminiExtractor();
    });
} else {
    new GeminiExtractor();
}

// Handle SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('[Gemini] URL changed, reinitializing');
        new GeminiExtractor();
    }
}).observe(document, { subtree: true, childList: true });
