'use client';

interface SidebarProps {}

export default function Sidebar({}: SidebarProps) {
  const menuItems = [
    {
      id: 'ai-writing',
      title: 'AI智能写作',
      icon: '🤖',
      active: true
    }
  ];

  return (
    <div className="w-64 bg-white/90 backdrop-blur-sm border-r border-gray-200 flex flex-col">
      {/* Logo区域 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-800">医职帮智能写作</h1>
            <p className="text-xs text-gray-500">学术本科专业</p>
          </div>
        </div>
      </div>

      {/* 菜单项 */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                item.active
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.title}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>© 2024 医职帮</p>
          <p>智能学术写作平台</p>
        </div>
      </div>
    </div>
  );
}
