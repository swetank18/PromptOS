'use client';

import { useState } from 'react';
import { Save, Trash2, Shield, Database, Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
    const [theme, setTheme] = useState('light');
    const [retention, setRetention] = useState('365');
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        // Simulate save
        setTimeout(() => setLoading(false), 1000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage your account preferences and data settings.
                </p>
            </div>

            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                {/* General Settings */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-medium text-gray-900">General</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Display Name</label>
                            <input
                                type="text"
                                defaultValue="Demo User"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                defaultValue="demo@example.com"
                                disabled
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Theme</label>
                            <div className="mt-2 flex items-center gap-4">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md border ${theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                                        }`}
                                >
                                    <Sun className="h-4 w-4" /> Light
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md border ${theme === 'dark' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                                        }`}
                                >
                                    <Moon className="h-4 w-4" /> Dark
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Retention */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Database className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-medium text-gray-900">Data & Storage</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Messages Retention
                            </label>
                            <select
                                value={retention}
                                onChange={(e) => setRetention(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md max-w-xs"
                            >
                                <option value="30">30 Days</option>
                                <option value="90">90 Days</option>
                                <option value="365">1 Year</option>
                                <option value="forever">Forever</option>
                            </select>
                            <p className="mt-2 text-sm text-gray-500">
                                Automatically delete conversations older than this period.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
                            <button className="flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete All Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
