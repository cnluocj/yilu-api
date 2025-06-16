'use client';

export default function Header() {
  return (
    <header className="text-center py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
      <div className="flex items-center justify-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">AI</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">
          学术助手
        </h1>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        专业的医学论文大纲生成工具
      </p>
    </header>
  );
}
