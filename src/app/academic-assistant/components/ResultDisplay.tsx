'use client';

import { useState } from 'react';

interface ResultDisplayProps {
  result: string;
  isStreaming?: boolean;
}

export default function ResultDisplay({ result, isStreaming = false }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '论文大纲.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 格式化显示结果
  const formatResult = (text: string) => {
    return text.split('\n').map((line, index) => {
      // 检测标题级别
      if (line.match(/^第[一二三四五六七八九十]+章/)) {
        return (
          <div key={index} className="text-lg font-bold text-gray-800 mt-6 mb-2 pb-2 border-b border-gray-200">
            {line}
          </div>
        );
      } else if (line.match(/^第[一二三四五六七八九十]+节/) || line.match(/^\d+\.\d+/)) {
        return (
          <div key={index} className="text-base font-semibold text-gray-700 mt-4 mb-2">
            {line}
          </div>
        );
      } else if (line.match(/^\d+\.\d+\.\d+/) || line.match(/^（[一二三四五六七八九十]+）/)) {
        return (
          <div key={index} className="text-sm font-medium text-gray-600 mt-2 mb-1 ml-4">
            {line}
          </div>
        );
      } else if (line.trim()) {
        return (
          <div key={index} className="text-sm text-gray-600 mb-1 ml-6">
            {line}
          </div>
        );
      } else {
        return <div key={index} className="h-2"></div>;
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isStreaming ? (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </div>
            ) : (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-800">
              {isStreaming ? '正在生成论文大纲...' : '论文大纲生成完成'}
            </h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>下载</span>
            </button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-6">
        <div className="prose max-w-none">
          {formatResult(result)}
          {isStreaming && result && (
            <div className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1"></div>
          )}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>生成的大纲仅供参考，请根据实际需要进行调整和完善</span>
        </div>
      </div>
    </div>
  );
}
