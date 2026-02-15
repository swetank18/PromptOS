'use client';

import { useState, useEffect } from 'react';
import { api, Conversation, Message } from '@/lib/api';
import { Bot, User, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ComparisonColumnProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    messages: Message[];
    loading: boolean;
    side: 'left' | 'right';
}

function ComparisonColumn({ conversations, selectedId, onSelect, messages, loading, side }: ComparisonColumnProps) {
    return (
        <div className={cn("flex-1 flex flex-col border-gray-200 h-full", side === 'left' ? "border-r" : "")}>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {side === 'left' ? 'Conversation A' : 'Conversation B'}
                </label>
                <select
                    value={selectedId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                    <option value="">Select a conversation...</option>
                    {conversations.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title || 'Untitled'} ({c.agent_id.slice(0, 8)}...)
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {loading ? (
                    <div className="text-center text-gray-400 mt-10">Loading messages...</div>
                ) : !selectedId ? (
                    <div className="text-center text-gray-400 mt-10">
                        Select a conversation to compare
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">No messages found</div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "max-w-[90%] rounded-lg p-3 text-sm",
                                msg.role === 'user'
                                    ? "bg-blue-100 text-blue-900"
                                    : "bg-gray-100 text-gray-900 border border-gray-200"
                            )}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <span className="text-xs text-gray-400 mt-1">
                                {msg.role} • {msg.model || 'Unknown Model'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function ComparePage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    const [leftId, setLeftId] = useState<string | null>(null);
    const [leftMessages, setLeftMessages] = useState<Message[]>([]);
    const [leftLoading, setLeftLoading] = useState(false);

    const [rightId, setRightId] = useState<string | null>(null);
    const [rightMessages, setRightMessages] = useState<Message[]>([]);
    const [rightLoading, setRightLoading] = useState(false);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (leftId) fetchMessages(leftId, setLeftMessages, setLeftLoading);
    }, [leftId]);

    useEffect(() => {
        if (rightId) fetchMessages(rightId, setRightMessages, setRightLoading);
    }, [rightId]);

    const fetchConversations = async () => {
        try {
            const response = await api.get('/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to fetch conversations', error);
        }
    };

    const fetchMessages = async (id: string, setMsgs: Function, setLoading: Function) => {
        setLoading(true);
        try {
            const response = await api.get(`/conversations/${id}`);
            setMsgs(response.data.messages || []);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.32))]">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowLeftRight className="h-6 w-6 text-blue-600" />
                        Cross-Agent Comparison
                    </h1>
                    <p className="text-gray-500">Compare responses side-by-side</p>
                </div>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex overflow-hidden">
                <ComparisonColumn
                    side="left"
                    conversations={conversations}
                    selectedId={leftId}
                    onSelect={setLeftId}
                    messages={leftMessages}
                    loading={leftLoading}
                />
                <ComparisonColumn
                    side="right"
                    conversations={conversations}
                    selectedId={rightId}
                    onSelect={setRightId}
                    messages={rightMessages}
                    loading={rightLoading}
                />
            </div>
        </div>
    );
}
