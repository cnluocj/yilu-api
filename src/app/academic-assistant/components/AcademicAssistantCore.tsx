'use client';

import { useState } from 'react';
import Header from './Header';
import ServiceCard from './ServiceCard';
import ThesisOutlineForm from './ThesisOutlineForm';
import ResultDisplay from './ResultDisplay';

export default function AcademicAssistantCore() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');

  const services = [
    {
      id: 'thesis-outline',
      title: '毕业论文',
      subtitle: 'AI智能生成论文大纲',
      description: '精研课题，高效撰写',
      icon: '🎓',
      color: 'from-orange-400 to-red-500'
    }
  ];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setResult(''); // 清空之前的结果
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setResult('');
    setIsGenerating(false);
  };

  const handleGenerationStart = () => {
    setIsGenerating(true);
    setResult('');
  };

  const handleGenerationComplete = (generatedResult: string) => {
    setIsGenerating(false);
    setResult(generatedResult);
  };

  const handleGenerationError = () => {
    setIsGenerating(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <Header />
      
      {!selectedService ? (
        <div className="space-y-6">
          {/* 服务介绍 */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-800">
              AI爱论文学术助手—免费AI无限改稿
            </h2>
            <p className="text-gray-600 text-sm">
              知网查重 &lt; 15%，AIGC &lt; 10% | 免费赠AIGC检测报告 | 支持图表公式代码插入 | 真实文献
            </p>
          </div>

          {/* 服务卡片 */}
          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={handleServiceSelect}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 返回按钮 */}
          <button
            onClick={handleBackToServices}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            disabled={isGenerating}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回服务选择</span>
          </button>

          {/* 论文大纲生成表单 */}
          {selectedService === 'thesis-outline' && (
            <ThesisOutlineForm
              onGenerationStart={handleGenerationStart}
              onGenerationComplete={handleGenerationComplete}
              onGenerationError={handleGenerationError}
              isGenerating={isGenerating}
            />
          )}

          {/* 结果显示 */}
          {result && (
            <ResultDisplay result={result} />
          )}
        </div>
      )}
    </div>
  );
}
