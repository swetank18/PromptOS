-- Seed data for agents (AI platforms)
INSERT INTO agents (id, name, display_name, metadata) VALUES
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'chatgpt', 'ChatGPT', '{"provider": "OpenAI", "url": "https://chat.openai.com"}'),
    ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'claude', 'Claude', '{"provider": "Anthropic", "url": "https://claude.ai"}'),
    ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'gemini', 'Gemini', '{"provider": "Google", "url": "https://gemini.google.com"}')
ON CONFLICT (name) DO NOTHING;
