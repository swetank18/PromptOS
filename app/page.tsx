'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Zap, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function Dashboard() {
    const [stats, setStats] = useState([
        { name: 'Total Conversations', value: '0', icon: MessageSquare, change: '+0%' },
        { name: 'Active Agents', value: '3', icon: Zap, change: 'Stable' },
        { name: 'Last Sync', value: 'Just now', icon: Clock, change: 'Online' },
    ]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => (
                    <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">{item.value}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                            <div className="text-sm">
                                <span className="font-medium text-blue-700 hover:text-blue-900">
                                    {item.change}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-white shadow rounded-lg border border-gray-100">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Recent Conversations
                    </h3>
                    <div className="mt-4 text-center py-10 text-gray-500">
                        <p>Connect the extension to start capturing conversations.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
