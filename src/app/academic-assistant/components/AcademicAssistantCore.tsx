'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ServiceGrid from './ServiceGrid';
import ThesisOutlineForm from './ThesisOutlineForm';
import ResultDisplay from './ResultDisplay';

export default function AcademicAssistantCore() {
  const [selectedService, setSelectedService] = useState<string | null>('thesis-outline');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [streamingResult, setStreamingResult] = useState<string>('');

  const services = [
    {
      id: 'thesis-outline',
      title: '毕业论文',
      subtitle: 'AI智能生成论文大纲',
      description: '精研课题，高效撰写',
      icon: '🎓',
      color: 'from-orange-400 to-red-500'
    },
    {
      id: 'journal-paper',
      title: '期刊论文',
      subtitle: '格式规范，权威专业',
      description: '期刊投稿必备',
      icon: '📄',
      color: 'from-green-400 to-blue-500'
    },
    {
      id: 'job-paper',
      title: '职称论文',
      subtitle: '满足中高级职称要求',
      description: '职业发展助力',
      icon: '📋',
      color: 'from-blue-400 to-purple-500'
    },
    {
      id: 'upgrade-paper',
      title: '专升本论文',
      subtitle: '为专升本，专业生成',
      description: '学历提升必备',
      icon: '📚',
      color: 'from-purple-400 to-pink-500'
    },
    {
      id: 'literature-review',
      title: '文献综述',
      subtitle: '内容前沿，真实文献',
      description: '研究基础必备',
      icon: '📖',
      color: 'from-red-400 to-orange-500'
    },
    {
      id: 'opening-report',
      title: '开题报告',
      subtitle: '一键生成，高效便捷',
      description: '开题必备工具',
      icon: '📊',
      color: 'from-teal-400 to-green-500'
    }
  ];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setResult('');
    setStreamingResult('');
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setResult('');
    setStreamingResult('');
    setIsGenerating(false);
  };

  const handleGenerationStart = () => {
    setIsGenerating(true);
    setResult('');
    setStreamingResult('');
  };

  const handleStreamingUpdate = (partialResult: string) => {
    setStreamingResult(partialResult);
  };

  const handleGenerationComplete = (generatedResult: string) => {
    setIsGenerating(false);
    setResult(generatedResult);
    setStreamingResult('');
  };

  const handleGenerationError = () => {
    setIsGenerating(false);
    setStreamingResult('');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 左侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">
              医职帮学术助手—免费AI无限改稿
            </h1>
            <p className="text-gray-600 text-sm">
              知网查重 &lt; 15%，AIGC &lt; 10% | 免费赠AIGC检测报告 | 支持图表公式代码插入 | 真实文献
            </p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedService ? (
            <ServiceGrid services={services} onServiceSelect={handleServiceSelect} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* 论文大纲生成表单 */}
              {selectedService === 'thesis-outline' && (
                <ThesisOutlineForm
                  onGenerationStart={handleGenerationStart}
                  onGenerationComplete={handleGenerationComplete}
                  onGenerationError={handleGenerationError}
                  onStreamingUpdate={handleStreamingUpdate}
                  isGenerating={isGenerating}
                />
              )}

              {/* 流式结果显示 */}
              {streamingResult && (
                <ResultDisplay result={streamingResult} isStreaming={true} />
              )}

              {/* 最终结果显示 */}
              {result && !streamingResult && (
                <ResultDisplay result={result} isStreaming={false} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
