import axios from 'axios';

// Create API client
export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Types
export interface User {
    id: string;
    email: string;
    full_name: string;
}

export interface Tag {
    name: string;
    color?: string;
}

export interface Conversation {
    id: string;
    title: string;
    agent_id: string;
    project_id?: string;
    created_at: string;
    message_count: number;
    tags?: Tag[];
    metadata?: any;
}

export interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at?: string;
    timestamp?: string;
    model?: string;
}
