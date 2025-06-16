'use client';

interface Service {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

interface ServiceGridProps {
  services: Service[];
  onServiceSelect: (serviceId: string) => void;
}

export default function ServiceGrid({ services, onServiceSelect }: ServiceGridProps) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* 服务卡片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onServiceSelect(service.id)}
            className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200"
          >
            {/* 图标 */}
            <div className="text-2xl mb-2">{service.icon}</div>
            
            {/* 标题 */}
            <h3 className="font-medium text-gray-800 text-sm mb-1">
              {service.title}
            </h3>
            
            {/* 副标题 */}
            <p className="text-xs text-gray-500 leading-relaxed">
              {service.subtitle}
            </p>

            {/* 悬停效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
          </button>
        ))}
      </div>

      {/* 额外的服务行 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 第二行服务 */}
        <button className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200">
          <div className="text-2xl mb-2">📋</div>
          <h3 className="font-medium text-gray-800 text-sm mb-1">任务书</h3>
          <p className="text-xs text-gray-500 leading-relaxed">一键生成，专业规范</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        </button>

        <button className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-medium text-gray-800 text-sm mb-1">调研论文</h3>
          <p className="text-xs text-gray-500 leading-relaxed">数据分析，深度调研</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        </button>

        <button className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200">
          <div className="text-2xl mb-2">📝</div>
          <h3 className="font-medium text-gray-800 text-sm mb-1">实习报告</h3>
          <p className="text-xs text-gray-500 leading-relaxed">实践总结，专业撰写</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        </button>

        <button className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200">
          <div className="text-2xl mb-2">🔬</div>
          <h3 className="font-medium text-gray-800 text-sm mb-1">配置业务材料</h3>
          <p className="text-xs text-gray-500 leading-relaxed">完整配套，一站服务</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        </button>

        <button className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-medium text-gray-800 text-sm mb-1">创业计划书</h3>
          <p className="text-xs text-gray-500 leading-relaxed">商业规划，专业指导</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        </button>

        <button className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-blue-200">
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="font-medium text-gray-800 text-sm mb-1">创新计划书</h3>
          <p className="text-xs text-gray-500 leading-relaxed">创新思维，前沿理念</p>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        </button>
      </div>
    </div>
  );
}
