"use client";

import React from 'react';

// --- Props Interface ---
interface HeaderProps {
  isLoggedIn: boolean;
  username: string;
  handleLogout: () => void;
}

// --- Component ---
const Header: React.FC<HeaderProps> = ({
  isLoggedIn,
  username,
  handleLogout,
}) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Page Title */}
          <div className="flex items-center">
            <span className="text-lg font-semibold text-gray-800">科普文章生成系统</span>
          </div>
          {/* Right side: Logged in user display */}
          <div className="flex items-center">
            {isLoggedIn && (
              <div className="flex items-center gap-3">
                 <span className="text-sm text-gray-600">操作员:</span>
                 <span className="text-sm font-medium text-gray-800">{username}</span>
                 <button 
                   onClick={handleLogout} 
                   className="text-xs font-medium px-2 py-1 rounded transition-all hover:bg-gray-100 text-gray-600 border border-gray-300 ml-2"
                 >
                   切换
                 </button>
               </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 