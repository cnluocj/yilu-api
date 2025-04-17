"use client";

import React, { RefObject } from 'react';
import cn from 'classnames';
import { ArticleRecord } from '../page'; // Import shared type

// --- Props Interface ---
interface PreviewModalProps {
  showPreviewModal: boolean;
  previewArticle: ArticleRecord | null;
  isPreviewLoading: boolean;
  previewError: string | null;
  previewFileType: 'docx' | 'iframe' | 'unsupported' | 'error' | null;
  docxHtml: string | null;
  handleClosePreview: () => void;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

// --- Component ---
const PreviewModal: React.FC<PreviewModalProps> = ({
  showPreviewModal, // Not strictly needed if parent controls rendering, but can be used for internal logic if desired
  previewArticle,
  isPreviewLoading,
  previewError,
  previewFileType,
  docxHtml,
  handleClosePreview,
  iframeRef,
}) => {
  // Parent controls rendering, so we render null if not shown or no article
  if (!showPreviewModal || !previewArticle) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.7)]" onClick={handleClosePreview}>
      <div className="bg-white rounded-lg shadow-xl m-4 max-w-4xl max-h-[90vh] w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */} 
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium truncate pr-2 text-gray-800" title={previewArticle.title || '文章预览'}>
             {previewArticle.title || '文章预览'}
             {previewArticle.style && ` (${previewArticle.style})`}
           </h3>
          <button 
            onClick={handleClosePreview} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-md transition-all hover:bg-gray-100 flex-shrink-0"
            aria-label="Close preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        {/* Modal Content */} 
        <div className="flex-1 overflow-y-auto p-4 relative bg-white">
            {/* Loading State */} 
            {isPreviewLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
                     <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                    <p className="text-gray-600 text-sm">正在加载预览...</p>
                </div>
            )}
            
            {/* Error / Unsupported State */} 
            {(previewError || previewFileType === 'unsupported') && !isPreviewLoading && (
                <div className="w-full h-full border border-gray-200 rounded-md flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="feather feather-alert-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    </div>
                    <h4 className="text-xl font-medium mb-2 text-gray-800">无法预览</h4>
                    <p className="text-gray-600 mb-6">{previewError || "此文件格式不支持在线预览，请下载查看。"}</p>
                </div>
            )}
            
            {/* DOCX Preview Area */} 
            <div 
                className={cn(
                    "w-full h-full border border-gray-200 rounded-md overflow-auto bg-white text-gray-900",
                    { 'hidden': previewFileType !== 'docx' || isPreviewLoading || previewError }
                )}
                dangerouslySetInnerHTML={{ __html: docxHtml || '' }}
             />
             
            {/* Iframe Preview */} 
            <iframe 
                ref={iframeRef}
                title="文章预览" 
                className={cn(
                    "w-full h-full border border-gray-200 rounded-md",
                    { 'hidden': previewFileType !== 'iframe' || isPreviewLoading || previewError }
                )}
                src={previewFileType === 'iframe' && previewArticle?.public_url ? previewArticle.public_url : 'about:blank'}
                sandbox="allow-scripts allow-same-origin"
            >
            </iframe>
        </div>
        
        {/* Modal Footer */} 
        <div className="flex justify-end p-4 border-t border-gray-200">
          <a 
            href={previewArticle.public_url || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(
                "inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                { "opacity-50 cursor-not-allowed pointer-events-none": !previewArticle.public_url }
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            下载文章
          </a>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal; 