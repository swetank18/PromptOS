'use client';

import { BarChart, Activity, Users } from 'lucide-react';

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-6 w-6 text-gray-400" aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Messages</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">0</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-6 w-6 text-gray-400" aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Active Agents</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">3</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <BarChart className="h-6 w-6 text-gray-400" aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Token Usage (Est.)</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">0</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Usage Over Time
                </h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-100 text-gray-400">
                    Chart visualization coming soon
                </div>
            </div>
        </div>
    );
}
