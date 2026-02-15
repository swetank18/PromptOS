'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { api, Conversation } from '@/lib/api';

export default function ConversationsPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTag, setActiveTag] = useState<string | null>(null);

    useEffect(() => {
        fetchConversations(activeTag);
    }, [activeTag]);

    const fetchConversations = async (tag: string | null = null) => {
        setLoading(true);
        try {
            const url = tag ? `/conversations?tag=${encodeURIComponent(tag)}` : '/conversations';
            const response = await api.get(url);
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-4">Loading conversations...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
                    {activeTag && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            Tag: {activeTag}
                            <button
                                onClick={() => setActiveTag(null)}
                                className="ml-2 hover:text-blue-900"
                            >
                                ×
                            </button>
                        </span>
                    )}
                </div>
                <button
                    onClick={() => fetchConversations(activeTag)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {conversations.length === 0 ? (
                        <li className="px-6 py-12 text-center text-gray-500">
                            No conversations found. Capture some using the extension!
                        </li>
                    ) : (
                        conversations.map((conversation) => (
                            <li key={conversation.id}>
                                <div className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                    <div className="px-4 py-4 sm:px-6">
                                        <Link href={`/conversations/${conversation.id}`} className="block">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-medium text-blue-600 truncate">
                                                    {conversation.title || 'Untitled Conversation'}
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        {conversation.agent_id === 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' ? 'ChatGPT' :
                                                            conversation.agent_id === 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e' ? 'Claude' : 'Gemini'}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>

                                        <div className="mt-2 text-sm text-gray-500">
                                            <div className="flex gap-2">
                                                {conversation.tags?.map((tag) => (
                                                    <button
                                                        key={tag.name}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setActiveTag(tag.name);
                                                        }}
                                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                                                    >
                                                        {tag.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    <MessageSquare className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                    {conversation.message_count} messages
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                <p>
                                                    Captured on {format(new Date(conversation.created_at), 'MMM d, yyyy')}
                                                </p>
                                                <ChevronRight className="ml-2 h-5 w-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
