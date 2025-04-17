import { useState, useCallback, useRef } from 'react';
import * as mammoth from 'mammoth';
import { ArticleRecord } from '../app/article-generator/page'; // Adjust import path

interface PreviewModalResult {
  showPreviewModal: boolean;
  previewArticle: ArticleRecord | null;
  isPreviewLoading: boolean;
  previewError: string | null;
  previewFileType: 'docx' | 'iframe' | 'unsupported' | 'error' | null;
  docxHtml: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>; // Ref is managed here now
  openPreview: (article: ArticleRecord) => void;
  closePreview: () => void;
}

export function usePreviewModal(): PreviewModalResult {
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewArticle, setPreviewArticle] = useState<ArticleRecord | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<'docx' | 'iframe' | 'unsupported' | 'error' | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const loadAndRenderDocx = useCallback(async (url: string) => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    console.log("Attempting to load and render DOCX (from hook):", url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法加载文档: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log("DOCX fetched (hook), converting...");
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        console.log("DOCX converted to HTML (hook)");
        const styledHtml = `
            <style>
                /* Basic document styles */
                .mammoth-container { padding: 1rem; }
                .mammoth-container h1, .mammoth-container h2, .mammoth-container h3, .mammoth-container h4, .mammoth-container h5, .mammoth-container h6 { margin-top: 1.5em; margin-bottom: 0.8em; font-weight: 600; line-height: 1.25; color: #111827; }
                .mammoth-container h1 { font-size: 1.75em; }
                .mammoth-container h2 { font-size: 1.5em; }
                .mammoth-container h3 { font-size: 1.25em; }
                .mammoth-container p { margin-bottom: 1em; line-height: 1.6; color: #374151; }
                .mammoth-container strong { font-weight: bold; }
                .mammoth-container em { font-style: italic; }
                .mammoth-container ul, .mammoth-container ol { margin-bottom: 1em; padding-left: 2em; color: #374151; }
                .mammoth-container li { margin-bottom: 0.5em; }
                .mammoth-container table { border-collapse: collapse; width: 100%; margin-bottom: 1em; border: 1px solid #e5e7eb; }
                .mammoth-container th, .mammoth-container td { border: 1px solid #e5e7eb; padding: 0.75em; text-align: left; vertical-align: top; }
                .mammoth-container th { background-color: #f9fafb; font-weight: 600; color: #1f2937; }
                .mammoth-container a { color: #007bea; text-decoration: underline; }
                .mammoth-container img { max-width: 100%; height: auto; margin-top: 1em; margin-bottom: 1em; }
            </style>
            <div class="mammoth-container">
               ${result.value}
            </div>
        `;
        setDocxHtml(styledHtml);
        setPreviewFileType('docx');
    } catch (error: any) {
        console.error('DOCX 预览失败 (hook): ', error);
        setPreviewError(`DOCX 预览加载失败: ${error.message}`);
        setPreviewFileType('error');
    } finally {
        setIsPreviewLoading(false);
    }
  }, []); // Dependencies are implicit via state setters

  const openPreview = useCallback((article: ArticleRecord) => {
    setPreviewArticle(article);
    setShowPreviewModal(true);
    // Reset state before loading
    setIsPreviewLoading(true);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    if (iframeRef.current) iframeRef.current.src = 'about:blank';

    const url = article.public_url;
    console.log("Opening preview (hook) for URL:", url);

    if (!url) {
        setPreviewError("文章URL无效，无法预览。");
        setIsPreviewLoading(false);
        setPreviewFileType('error');
        return;
    }

    if (url.toLowerCase().endsWith('.docx')) {
        console.log("File type is DOCX (hook), loading...");
        loadAndRenderDocx(url);
    } else if (url.toLowerCase().endsWith('.pdf')) { 
        console.log("File type is PDF (hook), setting type...");
        setPreviewFileType('iframe');
        setIsPreviewLoading(false);
    } else {
        console.log("File type unsupported (hook).");
        setPreviewError("此文件格式不支持在线预览，请下载查看。");
        setPreviewFileType('unsupported');
        setIsPreviewLoading(false);
    }
  }, [loadAndRenderDocx]); // Add loadAndRenderDocx dependency

  const closePreview = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewArticle(null);
    setIsPreviewLoading(false);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    if (iframeRef.current) iframeRef.current.src = 'about:blank';
  }, []);

  return {
    showPreviewModal,
    previewArticle,
    isPreviewLoading,
    previewError,
    previewFileType,
    docxHtml,
    iframeRef, // Return ref
    openPreview,
    closePreview,
  };
} 