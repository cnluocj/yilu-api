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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 论文题目 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            请输入您的论文题目
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="请输入您想要撰写的论文题目"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
            disabled={isGenerating}
          />

        </div>

        {/* 模型选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择模型
          </label>
          <div className="flex space-x-2">
            {modelOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleInputChange('model', option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.model === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isGenerating}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 论文字数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            论文字数
          </label>
          <div className="flex flex-wrap gap-2">
            {wordCountOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleInputChange('word_count', option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.word_count === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={isGenerating}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>



        {/* 提交按钮 */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isGenerating || !formData.title.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-lg shadow-lg"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>🚀 免费生成大纲</span>
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
