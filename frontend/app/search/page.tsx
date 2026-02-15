'use client';

import { useState } from 'react';
import { Search as SearchIcon, MessageSquare, ArrowRight } from 'lucide-react';
import { api, Conversation } from '@/lib/api';
import Link from 'next/link';

interface SearchResult {
    items: Array<{
        conversation_id: string;
        message_content: string;
        similarity: number;
        conversation_title: string;
        created_at: string;
    }>;
}

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult['items']>([]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'semantic' | 'keyword' | 'hybrid'>('hybrid');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            // Use mock endpoint or real endpoint structure
            const response = await api.post(`/search/${mode}`, {
                query,
                limit: 10
            });
            setResults(response.data.results || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Search Conversations</h1>
                <p className="mt-2 text-gray-600">
                    Find anything you've discussed using semantic search.
                </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                            placeholder="e.g. 'How do I center a div in CSS?'"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="mode"
                            checked={mode === 'semantic'}
                            onChange={() => setMode('semantic')}
                            className="text-blue-600 focus:ring-blue-500"
                        />
                        Semantic
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="mode"
                            checked={mode === 'keyword'}
                            onChange={() => setMode('keyword')}
                            className="text-blue-600 focus:ring-blue-500"
                        />
                        Keyword
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="mode"
                            checked={mode === 'hybrid'}
                            onChange={() => setMode('hybrid')}
                            className="text-blue-600 focus:ring-blue-500"
                        />
                        Hybrid (Best)
                    </label>
                </div>
            </form>

            <div className="space-y-4">
                {results.length > 0 && (
                    <h2 className="text-lg font-medium text-gray-900">Results</h2>
                )}

                {results.map((result, idx) => (
                    <div key={idx} className="bg-white shadow sm:rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <Link
                                href={`/conversations/${result.conversation_id}`}
                                className="text-lg font-medium text-blue-600 hover:underline"
                            >
                                {result.conversation_title || 'Untitled Conversation'}
                            </Link>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {(result.similarity * 100).toFixed(0)}% match
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500 line-clamp-3">
                            "{result.message_content}"
                        </p>
                        <div className="mt-4 flex items-center text-sm text-gray-400">
                            <MessageSquare className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <span>Conversation ID: {result.conversation_id.slice(0, 8)}...</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(result.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
