"use client"; // Keep this if client-side interactions might be added later

import React from 'react';
import Link from 'next/link'; // Import Link for navigation

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
    // 病例扫描总结工具 
    {
      title: '病例扫描总结工具',
      description: '一键总结病例，快速生成专业报告。',
      href: 'https://dify.sandboxai.jinzhibang.com.cn/workflow/eZaS6PueJyeAOznJ',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-red-500">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      )
    },
    {
      title: '拟题助手(旧)', // Updated title
      description: '基于聊天机器人的交互式标题生成工具。 ', // Updated description
      href: 'http://sandboxai.jinzhibang.com.cn/chat/7seVntXzQJgMdvRL', // Updated href
      icon: (
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-green-500"> {/* Kept icon */}
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path> {/* Changed icon to chat bubble */}
         </svg>
      )
    },
     {
      title: '科普文章生成(旧)', // Updated title
      description: '基于工作流的旧版文章生成工具。 ', // Updated description
      href: 'http://sandboxai.jinzhibang.com.cn/workflow/lOBoQSJZyce0XB9D', // Updated href
      icon: (
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-purple-500"> {/* Kept icon */}
           <path d="M4 18h16M4 12h16M4 6h16"></path> {/* Changed icon to workflow/list */}
         </svg>
      )
    },
    // Add more feature cards here as needed
  ];

  // Testing Tools Data
  const testingTools = [
    {
      title: 'AI学术助手 iframe演示',
      description: '演示AI学术助手如何在第三方网站中通过iframe嵌套使用。',
      href: '/academic-assistant-iframe-demo.html',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-indigo-500">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
          <rect x="6" y="7" width="12" height="6" rx="1"></rect>
        </svg>
      )
    },
    {
      title: 'API测试平台',
      description: '本地测试接口功能，包括文章生成、标题生成、配额管理、JWT等。',
      href: '/test-unified.html', // Link to the file in public folder
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-orange-500">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>
        </svg>
      )
    },
    {
      title: '接口文档',
      description: '查看和测试系统提供的API接口。',
      href: 'https://apifox.com/apidoc/shared/c5b5f7d6-2bf2-408f-a63e-034bac64fd6b/278381039e0',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-teal-500"> {/* Document Icon */}
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      )
    }
  ];

  // Helper function to render a card (to avoid code duplication)
  const renderCard = (item: { href: string; title: string; description: string; icon: React.ReactNode }) => {
    const isInternal = item.href.startsWith('/');
    const CardContent = (
       <div className="p-5">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 bg-gray-100 rounded-md p-2 mr-4">
              {item.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
              {item.title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">
            {item.description}
          </p>
        </div>
    );

    if (isInternal) {
      return (
        <Link key={item.title} href={item.href} legacyBehavior>
          <a 
            className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
            target="_blank" 
            rel="noopener noreferrer"
          >
            {CardContent}
          </a>
        </Link>
      );
    } else {
      return (
         <a 
            key={item.title}
            href={item.href}
            className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
            target="_blank" 
            rel="noopener noreferrer"
          >
            {CardContent}
         </a>
      );
    }
  };

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
        {/* Functional Modules Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">功能模块</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map(renderCard)}
          </div>
        </section>

        {/* Testing Tools Section - Add margin-top */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">测试工具</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {testingTools.map(renderCard)}
          </div>
        </section>
      </main>
    </div>
  );
}
