"use client";

import React, { useState, useEffect, useRef } from 'react';
import cn from 'classnames';

// --- Constants ---
const styleOptions = [
  { value: '生动有趣，角度新颖', label: '✨ 生动有趣，角度新颖' },
  { value: '通俗易懂，深入浅出', label: '📚 通俗易懂，深入浅出' },
  { value: '幽默风趣，轻松活泼', label: '😄 幽默风趣，轻松活泼' },
  { value: '严谨专业，循证可靠', label: '🔬 严谨专业，循证可靠' },
  { value: '亲切温暖，富有同理心', label: '💖 亲切温暖，富有同理心' },
  { value: '故事化叙述，情景再现', label: '📖 故事化叙述，情景再现' },
  { value: '生活化演绎，实用性强', label: '🧩 生活化演绎，实用性强' },
  { value: 'custom', label: '🎨 自定义风格' },
];

// Add journal options constant
const journalOptions = [
  { value: '健康必读', label: '健康必读' },
  { value: '健康向导', label: '健康向导' },
  { value: '学会科普', label: '学会科普' },
];

// --- Props Interface ---
interface UserInfoFormProps {
  name: string;
  unit: string;
  direction: string;
  wordCount: number;
  selectedStyle: string;
  customStyle: string;
  journal: string;
  onNameChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onDirectionChange: (value: string) => void;
  onWordCountChange: (value: number) => void;
  onSelectedStyleChange: (value: string) => void;
  onCustomStyleChange: (value: string) => void;
  onJournalChange: (value: string) => void;
}

// --- Component ---
const UserInfoForm: React.FC<UserInfoFormProps> = ({
  name,
  unit,
  direction,
  wordCount,
  selectedStyle,
  customStyle,
  journal,
  onNameChange,
  onUnitChange,
  onDirectionChange,
  onWordCountChange,
  onSelectedStyleChange,
  onCustomStyleChange,
  onJournalChange,
}) => {
  // State for the custom style dropdown
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  
  // Add state for journal dropdown
  const [isJournalDropdownOpen, setIsJournalDropdownOpen] = useState<boolean>(false);
  const journalDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler for style dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
      if (journalDropdownRef.current && !journalDropdownRef.current.contains(event.target as Node)) {
        setIsJournalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectStyle = (value: string) => {
    onSelectedStyleChange(value); // Call parent setter
    setIsStyleDropdownOpen(false);
    // Maybe clear form error if needed, passed via props?
    // setFormError(null);
  };

  // Add handler for journal selection
  const handleSelectJournal = (value: string) => {
    onJournalChange(value); // Call parent setter
    setIsJournalDropdownOpen(false);
  };

  return (
    <section id="basic-info-section">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">1. 基本信息</h2>
        <div className="mb-5">
          <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-700">姓名</label>
          <input 
            type="text" 
            id="name" 
            placeholder="请输入您的姓名" 
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
            value={name} 
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="unit" className="block text-sm font-medium mb-2 text-gray-700">科室</label>
          <input 
            type="text" 
            id="unit" 
            placeholder="请输入您的科室" 
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
            value={unit} 
            onChange={(e) => onUnitChange(e.target.value)}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="journal-button" className="block text-sm font-medium mb-2 text-gray-700">期刊</label>
          <div className="relative" ref={journalDropdownRef}>
            <button
              type="button"
              id="journal-button"
              onClick={() => setIsJournalDropdownOpen(!isJournalDropdownOpen)}
              className={cn(
                "relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 sm:text-sm",
                { 
                  'focus:ring-blue-500 focus:border-blue-500': isJournalDropdownOpen,
                  'hover:border-gray-400': !isJournalDropdownOpen
                }
              )}
            >
              <span className="block truncate">{journal || '请选择期刊'}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06-.04l2.7 2.458 2.7-2.458a.75.75 0 011.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
            
            {/* Journal Dropdown Panel */}
            {isJournalDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {journalOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelectJournal(option.value)}
                    className={cn(
                      'cursor-pointer select-none relative py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100',
                      { 'bg-blue-50 text-blue-900': journal === option.value } 
                    )}
                  >
                    <span className={cn('block truncate', { 'font-semibold': journal === option.value })}>
                      {option.label}
                    </span>
                    {journal === option.value && (
                       <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                         <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                           <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                         </svg>
                       </span>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mb-5">
          <label htmlFor="direction" className="block text-sm font-medium mb-2 text-gray-700">方向</label>
          <input 
            type="text" 
            id="direction" 
            placeholder="请输入文章方向或主题" 
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
            value={direction}
            onChange={(e) => onDirectionChange(e.target.value)}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="word_count" className="block text-sm font-medium mb-2 text-gray-700">字数</label>
          <input 
            type="number" 
            id="word_count" 
            min="100" 
            max="5000" 
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
            value={wordCount} 
            onChange={(e) => onWordCountChange(parseInt(e.target.value) || 0)}
          />
        </div>
        
        {/* Article Style Custom Dropdown */}
        <div className="mb-5">
          <label htmlFor="style-button" className="block text-sm font-medium mb-2 text-gray-700">文章风格</label>
          <div className="relative" ref={styleDropdownRef}>
            <button
              type="button"
              id="style-button"
              onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
              className={cn(
                "relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-1 sm:text-sm",
                { 
                  'focus:ring-blue-500 focus:border-blue-500': isStyleDropdownOpen,
                  'hover:border-gray-400': !isStyleDropdownOpen
                }
              )}
            >
              <span className="block truncate">{styleOptions.find(opt => opt.value === selectedStyle)?.label || '选择风格'}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.24a.75.75 0 011.06-.04l2.7 2.458 2.7-2.458a.75.75 0 011.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </button>
            
            {/* Dropdown Panel */}
            {isStyleDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {styleOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelectStyle(option.value)}
                    className={cn(
                      'cursor-pointer select-none relative py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100',
                      { 'bg-blue-50 text-blue-900': selectedStyle === option.value } 
                    )}
                  >
                    <span className={cn('block truncate', { 'font-semibold': selectedStyle === option.value })}>
                      {option.label}
                    </span>
                    {selectedStyle === option.value && (
                       <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                         <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                           <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                         </svg>
                       </span>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Custom Style Input */} 
        {selectedStyle === 'custom' && (
          <div className="mb-5 mt-3 animate-fade-in">
            <label htmlFor="customStyle" className="block text-sm font-medium mb-2 text-gray-700">自定义风格</label>
            <input 
              type="text" 
              id="customStyle" 
              placeholder="请输入自定义风格描述" 
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base"
              value={customStyle}
              onChange={(e) => onCustomStyleChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default UserInfoForm; 