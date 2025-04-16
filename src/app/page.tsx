"use client"; // Keep this if client-side interactions might be added later

import React from 'react';
import Link from 'next/link'

export default function HomePage() {
  // Placeholder data for cards (expand this later)
  const features = [
    {
      title: '科普文章生成系统',
      description: 'AI 赋能医疗科普创作，一键生成专业内容。',
      href: '/article-generator',
      icon: ( // Simple placeholder icon
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-blue-500">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      )
    },
    {
      title: '功能模块 2 (占位)',
      description: '此功能的简要描述，说明其用途或价值。',
      href: '#', // Placeholder link
      icon: (
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-green-500">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <line x1="3" x2="21" y1="9" y2="9"></line>
            <line x1="9" x2="9" y1="21" y2="9"></line>
         </svg>
      )
    },
     {
      title: '功能模块 3 (占位)',
      description: '此功能的简要描述，说明其用途或价值。',
      href: '#', // Placeholder link
      icon: (
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-purple-500">
           <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" x2="12" y1="22.08" y2="12"></line>
         </svg>
      )
    },
    // Add more feature cards here as needed
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simplified Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-800">医路达应用平台</span>
            </div>
            {/* Add other header elements like Search, Buttons here if needed */}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Section Title (Optional) */}
        <h1 className="text-2xl font-semibold text-gray-700 mb-6">功能模块</h1>

        {/* Grid Layout for Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href} legacyBehavior>
              <a className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 bg-gray-100 rounded-md p-2 mr-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2"> {/* Limits description to 2 lines */}
                    {feature.description}
                  </p>
                  {/* Add placeholder for tags/stats later if needed */}
                   {/* <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                     <span>tag</span>
                     <span>stats</span>
                   </div> */}
                </div>
              </a>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
