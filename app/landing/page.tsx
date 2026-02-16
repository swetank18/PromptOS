'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Shield, Zap, Search } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="relative isolate overflow-hidden bg-gradient-to-b from-blue-100/20">
                <div className="mx-auto max-w-7xl pb-24 pt-10 sm:pb-32 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-40">
                    <div className="px-6 lg:px-0 lg:pt-4">
                        <div className="mx-auto max-w-2xl">
                            <div className="max-w-lg">
                                <div className="mt-24 sm:mt-32 lg:mt-16">
                                    <a href="#" className="inline-flex space-x-6">
                                        <span className="rounded-full bg-blue-600/10 px-3 py-1 text-sm font-semibold leading-6 text-blue-600 ring-1 ring-inset ring-blue-600/10">
                                            What's new
                                        </span>
                                        <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600">
                                            <span>Just shipped v1.0</span>
                                        </span>
                                    </a>
                                </div>
                                <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                                    Your External Memory for AI Conversations
                                </h1>
                                <p className="mt-6 text-lg leading-8 text-gray-600">
                                    Capture, index, and search every conversation you have with ChatGPT, Claude, and Gemini. Never lose a prompt or idea again.
                                </p>
                                <div className="mt-10 flex items-center gap-x-6">
                                    <Link
                                        href="/dashboard"
                                        className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                    >
                                        Get Started
                                    </Link>
                                    <a href="#" className="text-sm font-semibold leading-6 text-gray-900">
                                        Read documentation <span aria-hidden="true">→</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-20 sm:mt-24 md:mx-auto md:max-w-2xl lg:mx-0 lg:mt-0 lg:w-screen">
                        <div className="bg-gray-900 rounded-xl shadow-2xl p-4 ring-1 ring-gray-900/10 transform rotate-1 hover:rotate-0 transition duration-500">
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
                                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            </div>
                            <pre className="text-sm text-green-400 font-mono overflow-auto h-[300px]">
                                {`> Searching for "python script"...

[1] Optimization Script (ChatGPT)
    Tags: #python #optimization
    "Here is the optimized version..."

[2] Data Analysis (Claude)
    Tags: #data #pandas
    "I analyzed the CSV file..."`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Section */}
            <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-semibold leading-7 text-blue-600">Deploy Faster</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Everything you need to manage AI knowledge
                    </p>
                </div>
                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                        <div className="relative pl-16">
                            <dt className="text-base font-semibold leading-7 text-gray-900">
                                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                                    <Search className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                Semantic Search
                            </dt>
                            <dd className="mt-2 text-base leading-7 text-gray-600">
                                Don't just search for keywords. Find concepts, ideas, and code snippets even if you don't remember the exact words.
                            </dd>
                        </div>
                        <div className="relative pl-16">
                            <dt className="text-base font-semibold leading-7 text-gray-900">
                                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                                    <Bot className="h-6 w-6 text-white" />
                                </div>
                                Multi-Agent Support
                            </dt>
                            <dd className="mt-2 text-base leading-7 text-gray-600">
                                Unified interface for ChatGPT, Claude, and Gemini. Compare answers side-by-side to find the best model for the job.
                            </dd>
                        </div>
                        <div className="relative pl-16">
                            <dt className="text-base font-semibold leading-7 text-gray-900">
                                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                                    <Shield className="h-6 w-6 text-white" />
                                </div>
                                Privacy First
                            </dt>
                            <dd className="mt-2 text-base leading-7 text-gray-600">
                                Run locally with Docker. Your data stays on your machine. No third-party tracking.
                            </dd>
                        </div>
                        <div className="relative pl-16">
                            <dt className="text-base font-semibold leading-7 text-gray-900">
                                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                                    <Zap className="h-6 w-6 text-white" />
                                </div>
                                Lightning Fast
                            </dt>
                            <dd className="mt-2 text-base leading-7 text-gray-600">
                                Built with Next.js and FastAPI for sub-second search results and instant loading times.
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
