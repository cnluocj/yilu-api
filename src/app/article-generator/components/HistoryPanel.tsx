"use client";

import React from 'react';
import { ArticleRecord } from '../page'; // Import the shared type

// --- Props Interface ---
interface HistoryPanelProps {
  isLoadingHistory: boolean;
  historyError: string | null;
  historyArticles: ArticleRecord[];
  handleOpenPreview: (article: ArticleRecord) => void;
  formatDate: (dateStr: string | null) => string;
  isLoggedIn: boolean;
}

// --- Component ---
const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isLoadingHistory,
  historyError,
  historyArticles,
  handleOpenPreview,
  formatDate,
  isLoggedIn,
}) => {
  return (
    <div className="lg:w-80 lg:shrink-0">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm sticky top-24">
        <h2 className="text-lg font-semibold pb-3 mb-4 border-b border-gray-200 text-gray-800">历史文章</h2>
        {isLoadingHistory ? (
          <div id="historyLoadingContainer" className="text-center py-5 text-gray-500">
            <svg className="animate-spin h-5 w-5 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm">加载历史文章...</p>
          </div>
        ) : (
          <div id="historyList" className="space-y-3 max-h-[600px] overflow-y-auto">
            {historyError && !isLoadingHistory && (
              <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded p-3">
                {historyError}
              </div>
            )}
            {!historyError && historyArticles.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                {isLoggedIn ? '暂无历史文章' : '请先登录查看历史记录'}
              </p>
            )}
            {!historyError && historyArticles.length > 0 && (
              historyArticles.map((article) => (
                <div 
                  key={article.id} 
                  onClick={() => handleOpenPreview(article)}
                  className="p-3 border border-gray-200 rounded-md cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm"
                >
                  <div className="font-medium mb-1 break-words text-sm text-gray-800">
                    {article.title || '无标题'}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{article.author_name || '未知作者'}</span>
                    <span>{article.word_count ? `${article.word_count} 字` : '? 字'}</span>
                  </div>
                  {article.style && (
                     <div className="text-xs text-blue-600 italic mt-1">
                        风格: {article.style}
                     </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(article.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel; 