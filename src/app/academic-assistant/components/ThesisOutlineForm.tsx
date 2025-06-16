'use client';

import { useState } from 'react';
import type { GenerateThesisOutlineRequest } from '@/types';

interface ThesisOutlineFormProps {
  onGenerationStart: () => void;
  onGenerationComplete: (result: string) => void;
  onGenerationError: () => void;
  isGenerating: boolean;
}

export default function ThesisOutlineForm({
  onGenerationStart,
  onGenerationComplete,
  onGenerationError,
  isGenerating
}: ThesisOutlineFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    model: '标准模型',
    word_count: 6000
  });

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const wordCountOptions = [
    { value: 6000, label: '6000字' },
    { value: 10000, label: '10000字' },
    { value: 15000, label: '15000字' },
    { value: 20000, label: '20000字' },
    { value: 25000, label: '25000字' },
    { value: 30000, label: '30000字' }
  ];

  const modelOptions = [
    { value: '标准模型', label: '标准模型' },
    { value: '学术4.0模型', label: '学术4.0模型' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('请填写论文标题');
      return;
    }

    onGenerationStart();
    setProgress(0);
    setCurrentStep('正在准备生成...');

    const payload: GenerateThesisOutlineRequest = {
      userid: 'academic_assistant_user',
      title: formData.title.trim(),
      model: formData.model,
      word_count: formData.word_count
    };

    try {
      const response = await fetch('/api/generate_thesis_outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let outlineText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (event.trim().startsWith('data:')) {
            try {
              const eventData = JSON.parse(event.replace('data:', '').trim());
              
              if (eventData.event === 'workflow_started') {
                setCurrentStep('开始生成论文大纲...');
                setProgress(10);
              } else if (eventData.event === 'workflow_running') {
                setCurrentStep('正在生成论文大纲...');
                setProgress(50);
              } else if (eventData.event === 'workflow_finished') {
                setCurrentStep('生成完成！');
                setProgress(100);
                
                if (eventData.data?.result && Array.isArray(eventData.data.result)) {
                  outlineText = eventData.data.result.join('\n');
                }
              }
            } catch (parseError) {
              console.error('解析事件失败:', parseError);
            }
          }
        }
      }

      if (outlineText) {
        onGenerationComplete(outlineText);
      } else {
        throw new Error('未收到生成结果');
      }

    } catch (error) {
      console.error('生成论文大纲失败:', error);
      onGenerationError();
      alert('生成失败，请重试');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">医学硕博论文大纲生成</h2>
        <p className="text-sm text-gray-600">
          请填写论文相关信息，AI将为您生成专业的论文大纲结构
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 论文标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            论文标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="请输入论文标题，如：基于深度学习的医学影像诊断系统在肺癌早期筛查中的应用研究"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          />
        </div>

        {/* 模型选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择模型
          </label>
          <select
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 字数选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择字数
          </label>
          <select
            value={formData.word_count}
            onChange={(e) => handleInputChange('word_count', Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isGenerating}
          >
            {wordCountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 生成按钮 */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isGenerating || !formData.title.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>正在生成大纲...</span>
              </div>
            ) : (
              '🚀 免费生成大纲'
            )}
          </button>
        </div>

        {/* 进度显示 */}
        {isGenerating && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">{currentStep}</span>
              <span className="text-sm text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
