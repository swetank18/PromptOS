/**
 * Claude Content Script
 * Extracts conversations from claude.ai
 */

class ClaudeExtractor {
    constructor() {
        this.conversationId = this.extractConversationId();
        this.messages = new Map();
        this.observer = null;
        this.captureButton = null;

        console.log('[Claude] Extractor initialized, conversation:', this.conversationId);

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
        const match = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
        return match ? match[1] : null;
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
      background: #cc785c;
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
                // Claude uses different selectors
                const messages = node.querySelectorAll('[data-test-render-count], .font-claude-message');
                messages.forEach(msg => this.extractMessage(msg));
            }
        }
    }

    extractAllMessages() {
        // Claude's message structure
        const messageElements = document.querySelectorAll('[data-test-render-count]');
        console.log(`[Claude] Found ${messageElements.length} messages`);

        messageElements.forEach((el, idx) => this.extractMessage(el, idx));
    }

    extractMessage(element, index = null) {
        try {
            // Generate ID from index or content hash
            const messageId = element.getAttribute('data-message-id') ||
                `msg-${index || this.messages.size}`;

            if (this.messages.has(messageId)) {
                return;
            }

            // Determine role
            const isUser = element.querySelector('[data-is-user-message="true"]') !== null;
            const role = isUser ? 'user' : 'assistant';

            // Find content
            const contentEl = element.querySelector('.font-claude-message, [class*="message"]');
            if (!contentEl) return;

            const message = {
                id: messageId,
                role: role,
                content: this.extractContent(contentEl),
                timestamp: new Date().toISOString(),
                artifacts: this.extractArtifacts(element)
            };

            this.messages.set(messageId, message);
            console.log('[Claude] Extracted message:', message.role, message.content.substring(0, 50));

        } catch (error) {
            console.error('[Claude] Error extracting message:', error);
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

        return clone.textContent.trim();
    }

    extractArtifacts(element) {
        // Claude artifacts are special interactive components
        const artifacts = [];
        const artifactElements = element.querySelectorAll('[data-artifact-id]');

        artifactElements.forEach(art => {
            artifacts.push({
                id: art.getAttribute('data-artifact-id'),
                type: art.getAttribute('data-artifact-type') || 'code',
                title: art.querySelector('[data-artifact-title]')?.textContent || 'Artifact',
                content: art.querySelector('code')?.textContent || art.textContent
            });
        });

        return artifacts;
    }

    getConversationTitle() {
        // Try to find title in Claude's UI
        const titleEl = document.querySelector('h1, [class*="conversation-title"]');
        if (titleEl && titleEl.textContent.trim()) {
            return titleEl.textContent.trim();
        }

        // Fallback
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
                    source: 'claude',
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
                    artifacts: msg.artifacts
                }
            }));

            const response = await chrome.runtime.sendMessage({
                type: 'CAPTURE_CONVERSATION',
                payload: {
                    conversation,
                    messages,
                    agent: 'claude'
                }
            });

            if (response.error) {
                alert(`Error: ${response.error}`);
            } else {
                this.captureButton.textContent = '✓ Captured';
                this.captureButton.style.background = '#10b981';

                setTimeout(() => {
                    this.captureButton.textContent = '💾 Capture';
                    this.captureButton.style.background = '#cc785c';
                }, 2000);
            }

        } catch (error) {
            console.error('[Claude] Capture error:', error);
            alert(`Failed to capture: ${error.message}`);
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ClaudeExtractor();
    });
} else {
    new ClaudeExtractor();
}

// Handle SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('[Claude] URL changed, reinitializing');
        new ClaudeExtractor();
    }
}).observe(document, { subtree: true, childList: true });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'CAPTURE_NOW') {
        const extractor = new ClaudeExtractor();
        extractor.captureConversation()
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ error: error.message }));
        return true;
    }
    return false;
});
