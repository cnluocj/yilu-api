"use client";

import React from 'react';
import cn from 'classnames';

// --- Props Interface ---
interface TitleSelectionProps {
  isGeneratingTitles: boolean;
  titleProgress: number;
  generatedTitles: string[];
  selectedTitle: string;
  customTitleInput: string;
  titleError: string | null;
  isBasicInfoValid: boolean; // To control the button disable state
  handleGenerateTitles: () => void;
  handleSelectTitle: (title: string) => void;
  handleCustomTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// --- Component ---
const TitleSelection: React.FC<TitleSelectionProps> = ({
  isGeneratingTitles,
  titleProgress,
  generatedTitles,
  selectedTitle,
  customTitleInput,
  titleError,
  isBasicInfoValid,
  handleGenerateTitles,
  handleSelectTitle,
  handleCustomTitleChange,
}) => {
  return (
    <section id="title-selection-section">
      <fieldset disabled={!isBasicInfoValid} className="disabled:opacity-60 disabled:cursor-not-allowed">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">2. 选择或生成标题</h2>
          <p className="text-sm text-gray-500 mb-4">您可以选择下方 AI 生成的标题，或输入自定义标题。标题生成过程不会影响您继续操作。</p>

          {/* Generate Titles Button */}
          <div className="mb-4">
            <button
              onClick={handleGenerateTitles}
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isGeneratingTitles || !isBasicInfoValid}
            >
              {isGeneratingTitles ? '正在生成...' : '✨ AI 生成标题建议'}
            </button>
          </div>

          {/* Title Generation Progress */}
          {isGeneratingTitles && (
            <div className="mt-4 mb-6">
              <div className="flex justify-between mb-2">
                <div className="text-sm text-gray-500">正在生成标题...</div>
                <div className="text-sm text-gray-500">{titleProgress}%</div>
              </div>
              <div className="overflow-hidden rounded-full bg-blue-100 h-1">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${titleProgress}%` }}></div>
              </div>
            </div>
          )}
          
          {/* Title Error Display */}
          {titleError && !isGeneratingTitles && (
            <div className="mt-4 mb-6 bg-red-100 border border-red-300 text-red-700 text-sm rounded-md p-4">
              {titleError}
            </div>
          )}

          {/* Title Selection Area - Show when not generating AND (titles exist OR there was an error) */}
          {(!isGeneratingTitles && (generatedTitles.length > 0 || titleError)) && (
            <div className="animate-fade-in">
              <div className="flex flex-col gap-3 mb-5">
                {/* Render generated titles */}
                {generatedTitles.map((title, index) => (
                  <div 
                    key={index}
                    onClick={() => handleSelectTitle(title)}
                    className={cn(
                      'border rounded-md p-4 cursor-pointer transition-all relative hover:border-blue-400',
                      {
                        'border-blue-500 bg-blue-50 ring-1 ring-blue-500': selectedTitle === title,
                        'border-gray-300': selectedTitle !== title
                      }
                    )}
                  >
                    <div className="font-medium mb-1 text-sm">{title}</div>
                    <div 
                      className={cn(
                        'absolute top-3 right-3 w-5 h-5 border-2 rounded-full flex items-center justify-center',
                        {
                          'border-blue-500 bg-white': selectedTitle === title,
                          'border-gray-300': selectedTitle !== title
                        }
                      )}
                    >
                     {selectedTitle === title && (
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                     )}
                    </div>
                    <input type="radio" name="title" value={title} checked={selectedTitle === title} className="absolute opacity-0 w-0 h-0" readOnly />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Title Input Area - Always Visible (within fieldset) */}
          <div className="mt-4"> 
             <label htmlFor="customTitle" className="block text-sm font-medium mb-2 text-gray-700">自定义标题</label>
             <input 
                type="text" 
                id="customTitle" 
                placeholder="在此输入自定义标题 (可选, 或使用上方AI建议)" 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                value={customTitleInput}
                onChange={handleCustomTitleChange}
              />
           </div>

          {/* Placeholder or initial message if not loading and no titles/error yet */}
           {!isGeneratingTitles && generatedTitles.length === 0 && !titleError && (
             <p className="text-sm text-gray-500 text-center py-4">点击 "AI 生成标题建议" 获取智能推荐。</p>
           )}
        </div>
      </fieldset>
    </section>
  );
};

export default TitleSelection; 