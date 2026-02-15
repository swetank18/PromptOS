'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { User, Bot, Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { api, Conversation, Message } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ConversationDetail extends Conversation {
    messages: Message[];
}

export default function ConversationDetail() {
    const params = useParams();
    const [conversation, setConversation] = useState<ConversationDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchConversation(params.id as string);
        }
    }, [params.id]);

    const fetchConversation = async (id: string) => {
        try {
            const response = await api.get(`/conversations/${id}`);
            setConversation(response.data);
        } catch (error) {
            console.error('Failed to fetch conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading conversation...</div>;
    if (!conversation) return <div className="p-8 text-center text-red-500">Conversation not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                <Link href="/conversations" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{conversation.title}</h1>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(conversation.created_at), 'MMMM d, yyyy h:mm a')}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="space-y-6">
                {conversation.messages.map((message, index) => (
                    <div
                        key={message.id || index}
                        className={cn(
                            "flex space-x-4",
                            message.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        {message.role !== 'user' && (
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                        )}

                        <div className={cn(
                            "max-w-2xl rounded-lg p-4 shadow-sm",
                            message.role === 'user'
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-gray-900"
                        )}>
                            <div className="prose prose-sm max-w-none">
                                {message.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                ) : (
                                    <div className="whitespace-pre-wrap">{message.content}</div>
                                )}
                            </div>
                        </div>

                        {message.role === 'user' && (
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-600" />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
