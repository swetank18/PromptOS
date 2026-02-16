'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, Conversation, Message } from '@/lib/api';
import { ArrowLeftRight } from 'lucide-react';
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

interface ComparisonStats {
    totalMessages: number;
    assistantTurns: number;
    avgAssistantChars: number;
}

interface TurnSimilarity {
    turn_index: number;
    similarity: number | null;
    left_preview: string;
    right_preview: string;
    has_left_embedding: boolean;
    has_right_embedding: boolean;
}

interface CompareResponse {
    compared_turns: number;
    comparable_turns: number;
    average_similarity: number | null;
    turn_results: TurnSimilarity[];
}

function computeStats(messages: Message[]): ComparisonStats {
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const totalChars = assistantMessages.reduce((acc, m) => acc + m.content.length, 0);

    return {
        totalMessages: messages.length,
        assistantTurns: assistantMessages.length,
        avgAssistantChars: assistantMessages.length > 0 ? Math.round(totalChars / assistantMessages.length) : 0,
    };
}

function buildDisplayName(conversation: Conversation): string {
    const title = conversation.title || 'Untitled';
    const shortAgent = conversation.agent_id.slice(0, 8);
    return `${title} (${shortAgent}...)`;
}

function ComparisonColumn({ conversations, selectedId, onSelect, messages, loading, side }: ComparisonColumnProps) {
    const stats = useMemo(() => computeStats(messages), [messages]);

    return (
        <div className={cn('flex-1 flex flex-col border-gray-200 h-full', side === 'left' ? 'border-r' : '')}>
            <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {side === 'left' ? 'Conversation A' : 'Conversation B'}
                </label>
                <select
                    value={selectedId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                >
                    <option value="">Select a conversation...</option>
                    {conversations.map((conversation) => (
                        <option key={conversation.id} value={conversation.id}>
                            {buildDisplayName(conversation)}
                        </option>
                    ))}
                </select>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div className="rounded bg-white border border-gray-200 p-2">
                        <p className="text-gray-500">Messages</p>
                        <p className="font-semibold text-gray-900">{stats.totalMessages}</p>
                    </div>
                    <div className="rounded bg-white border border-gray-200 p-2">
                        <p className="text-gray-500">Assistant Turns</p>
                        <p className="font-semibold text-gray-900">{stats.assistantTurns}</p>
                    </div>
                    <div className="rounded bg-white border border-gray-200 p-2">
                        <p className="text-gray-500">Avg Resp. Chars</p>
                        <p className="font-semibold text-gray-900">{stats.avgAssistantChars}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {loading ? (
                    <div className="text-center text-gray-400 mt-10">Loading messages...</div>
                ) : !selectedId ? (
                    <div className="text-center text-gray-400 mt-10">Select a conversation to compare</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">No messages found</div>
                ) : (
                    messages.map((msg, idx) => {
                        const timestamp = msg.created_at || msg.timestamp;
                        return (
                            <div key={`${msg.id || 'msg'}-${idx}`} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                <div
                                    className={cn(
                                        'max-w-[90%] rounded-lg p-3 text-sm',
                                        msg.role === 'user'
                                            ? 'bg-blue-100 text-blue-900'
                                            : 'bg-gray-100 text-gray-900 border border-gray-200'
                                    )}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                <span className="text-xs text-gray-400 mt-1">
                                    {msg.role} | {msg.model || 'Unknown Model'}
                                    {timestamp ? ` | ${format(new Date(timestamp), 'MMM d, yyyy HH:mm')}` : ''}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default function ComparePage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);

    const [leftId, setLeftId] = useState<string | null>(null);
    const [leftMessages, setLeftMessages] = useState<Message[]>([]);
    const [leftLoading, setLeftLoading] = useState(false);

    const [rightId, setRightId] = useState<string | null>(null);
    const [rightMessages, setRightMessages] = useState<Message[]>([]);
    const [rightLoading, setRightLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [similarityLoading, setSimilarityLoading] = useState(false);
    const [similarityData, setSimilarityData] = useState<CompareResponse | null>(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (leftId) {
            fetchMessages(leftId, setLeftMessages, setLeftLoading);
        } else {
            setLeftMessages([]);
        }
    }, [leftId]);

    useEffect(() => {
        if (rightId) {
            fetchMessages(rightId, setRightMessages, setRightLoading);
        } else {
            setRightMessages([]);
        }
    }, [rightId]);

    useEffect(() => {
        if (leftId && rightId) {
            void fetchSimilarity(leftId, rightId);
        } else {
            setSimilarityData(null);
        }
    }, [leftId, rightId]);

    const fetchConversations = async () => {
        setLoadingConversations(true);
        setError(null);
        try {
            const response = await api.get('/conversations');
            setConversations(response.data);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
            setError('Could not load conversations. Check backend auth/session and try again.');
        } finally {
            setLoadingConversations(false);
        }
    };

    const fetchMessages = async (
        id: string,
        setMsgs: React.Dispatch<React.SetStateAction<Message[]>>,
        setLoading: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/conversations/${id}`);
            setMsgs(response.data.messages || []);
        } catch (err) {
            console.error('Failed to fetch messages', err);
            setError('Could not load conversation messages.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilarity = async (leftConversationId: string, rightConversationId: string) => {
        setSimilarityLoading(true);
        try {
            const response = await api.post('/search/compare/conversations', {
                left_conversation_id: leftConversationId,
                right_conversation_id: rightConversationId,
                max_turns: 20,
            });
            setSimilarityData(response.data);
        } catch (err) {
            console.error('Failed to fetch similarity', err);
            setSimilarityData(null);
        } finally {
            setSimilarityLoading(false);
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
                    <p className="text-gray-500">Compare responses side-by-side and inspect response characteristics.</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {(leftId && rightId) && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Semantic Similarity Score</h2>
                    {similarityLoading ? (
                        <p className="text-sm text-gray-500">Computing turn-by-turn semantic similarity...</p>
                    ) : !similarityData ? (
                        <p className="text-sm text-gray-500">No comparison score available yet.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="rounded bg-blue-50 text-blue-700 px-2 py-1">
                                    Compared turns: {similarityData.compared_turns}
                                </span>
                                <span className="rounded bg-green-50 text-green-700 px-2 py-1">
                                    With embeddings: {similarityData.comparable_turns}
                                </span>
                                <span className="rounded bg-purple-50 text-purple-700 px-2 py-1">
                                    Avg similarity: {similarityData.average_similarity != null ? `${(similarityData.average_similarity * 100).toFixed(1)}%` : 'N/A'}
                                </span>
                            </div>

                            <div className="max-h-44 overflow-y-auto rounded border border-gray-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="text-left px-2 py-1">Turn</th>
                                            <th className="text-left px-2 py-1">Similarity</th>
                                            <th className="text-left px-2 py-1">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {similarityData.turn_results.map((turn) => (
                                            <tr key={turn.turn_index} className="border-t border-gray-100">
                                                <td className="px-2 py-1">{turn.turn_index}</td>
                                                <td className="px-2 py-1">
                                                    {turn.similarity != null ? `${(turn.similarity * 100).toFixed(1)}%` : 'N/A'}
                                                </td>
                                                <td className="px-2 py-1 text-gray-500">
                                                    {turn.has_left_embedding && turn.has_right_embedding ? 'Compared' : 'Missing embedding'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex overflow-hidden">
                {loadingConversations ? (
                    <div className="w-full flex items-center justify-center text-gray-500">Loading conversations...</div>
                ) : (
                    <>
                        <ComparisonColumn
                            side="left"
                            conversations={conversations}
                            selectedId={leftId}
                            onSelect={(id) => setLeftId(id || null)}
                            messages={leftMessages}
                            loading={leftLoading}
                        />
                        <ComparisonColumn
                            side="right"
                            conversations={conversations}
                            selectedId={rightId}
                            onSelect={(id) => setRightId(id || null)}
                            messages={rightMessages}
                            loading={rightLoading}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
