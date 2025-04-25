"use client";

import React, { useState, useEffect } from 'react';
import { ArticleRecord } from '../page'; // Revert import back to ../page

// --- Props Interface ---
interface ArticleGenerationProps {
  isGeneratingArticle: boolean;
  articleProgress: number;
  articleStatusTitle: string | null;
  generatedArticleUrl: string | null;
  articleError: string | null;
  isBasicInfoValid: boolean;
  isTitleSelected: boolean;
  handleGenerateArticle: () => void;
  handleOpenPreview: (article: ArticleRecord) => void;
  // Need these to construct the preview object
  name: string;
  wordCount: number;
  customTitleInput: string;
  selectedTitle: string;
  selectedStyle: string;
  customStyle: string;
}

// --- Component ---
const ArticleGeneration: React.FC<ArticleGenerationProps> = ({
  isGeneratingArticle,
  articleProgress,
  articleStatusTitle,
  generatedArticleUrl,
  articleError,
  isBasicInfoValid,
  isTitleSelected,
  handleGenerateArticle,
  handleOpenPreview,
  name,
  wordCount,
  customTitleInput,
  selectedTitle,
  selectedStyle,
  customStyle,
}) => {

  const getTitleForPreview = () => {
      // Use the same logic as in the main page's handleGenerateArticle
      if (selectedTitle && selectedTitle !== 'custom') {
        return selectedTitle;
      } else if (customTitleInput.trim()) {
        return customTitleInput.trim();
      }
      return '生成文章'; // Fallback
  };

  const getStyleForPreview = () => {
      return selectedStyle === 'custom' ? customStyle : selectedStyle || null;
  };

  return (
    <section id="generate-article-section">
      <fieldset disabled={!isBasicInfoValid || !isTitleSelected} className="disabled:opacity-60 disabled:cursor-not-allowed">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">3. 生成文章</h2>
          {/* Article Generation Progress */}
          {isGeneratingArticle && (
            <div className="mt-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-gray-500 flex items-center">
                  <span>{articleStatusTitle || '正在生成文章...'}</span>
                </div>
                <div className="text-sm text-gray-500">{articleProgress}%</div>
              </div>
              <div className="overflow-hidden rounded-full bg-blue-100 h-1">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${articleProgress}%` }}></div>
              </div>
            </div>
          )}

          {/* Article Error Display */}
          {articleError && !isGeneratingArticle && (
            <div className="mt-4 mb-6 bg-red-100 border border-red-300 text-red-700 text-sm rounded-md p-4">
              {articleError}
            </div>
          )}
          
          {/* Article Result */}
          {(!isGeneratingArticle && (generatedArticleUrl || articleError)) && (
            <div className="animate-fade-in text-center p-8">
              {generatedArticleUrl && !articleError && (
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full text-green-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              )}
              <h3 className="text-xl font-semibold mb-3">{articleError ? '生成失败' : '文章生成成功！'}</h3>
              <p className="text-gray-500 mb-6">
                {articleError ? '请重试或联系管理员。' : '您的文章已生成完毕，可立即下载'}
              </p>
              {generatedArticleUrl && !articleError && (
                <div className="flex justify-center items-center gap-4">
                  <a 
                    href={generatedArticleUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md transition-all text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    下载文章 (DOCX)
                  </a>
                  <button
                    onClick={() => {
                      if (generatedArticleUrl) {
                          handleOpenPreview({ 
                              public_url: generatedArticleUrl, 
                              title: getTitleForPreview(),
                              style: getStyleForPreview(),
                              id: -1, 
                              author_name: name || null, 
                              word_count: wordCount || null, 
                              created_at: new Date().toISOString()
                          });
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-4 rounded-md transition-all text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    预览
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Placeholder */}
          {!isGeneratingArticle && !generatedArticleUrl && !articleError && (
              <p className="text-sm text-gray-500 text-center py-4">请等待文章生成...</p>
          )}

          {/* Generate Article Button */}
          <div className="mt-6">
             <button 
                onClick={handleGenerateArticle}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={!isBasicInfoValid || !isTitleSelected || isGeneratingArticle} 
              >
                {isGeneratingArticle ? '正在生成...' : '生成文章'}
              </button>
          </div>
        </div>
      </fieldset>
    </section>
  );
};

export default ArticleGeneration; 