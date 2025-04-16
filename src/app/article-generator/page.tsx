"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import cn from 'classnames'; // 引入classnames库来帮助动态合并类名
import * as mammoth from 'mammoth'; // Import mammoth

// Temporary Placeholder JWT - Replace with actual auth logic
const TEMP_SYSTEM_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJzeXN0ZW0t5ZCO56uvIiwicm9sZSI6InN5c3RlbSIsInBlcm1pc3Npb25zIjpbInF1b3RhOnJlYWQiLCJxdW90YTp3cml0ZSIsImFydGljbGU6cmVhZCIsImFydGljbGU6d3JpdGUiLCJhcnRpY2xlOmRlbGV0ZSJdLCJpYXQiOjE3NDQyNDg3NDEsImV4cCI6MTc0Njg0MDc0MX0.aKnFmck6xwt4MMbegrLsssF7hZaZSrHbsgrjB24XJys';

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

// 定义 UserInfo 类型
interface UserInfo {
  openid: string;
  name: string;
  unit: string;
  direction: string;
  word_count: number;
  style: string;
  title?: string; // 添加可选的title字段
}

// Define Article Record Type for History
interface ArticleRecord {
  id: number;
  title: string | null;
  author_name: string | null;
  word_count: number | null;
  created_at: string; // Assuming ISO string format from backend
  style: string | null;
  public_url: string | null;
  // Add other potential fields if needed
}

export default function ArticleGeneratorPage() {
  // --- 状态定义 ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [userOpenid, setUserOpenid] = useState<string>('');
  const [loginInput, setLoginInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null); // 通用表单错误

  // Page 1 Form State
  const [name, setName] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(2500);
  const [selectedStyle, setSelectedStyle] = useState<string>('生动有趣，角度新颖');
  const [customStyle, setCustomStyle] = useState<string>('');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false); // State for custom dropdown
  
  // Page 2 State
  const [isGeneratingTitles, setIsGeneratingTitles] = useState<boolean>(false);
  const [titleProgress, setTitleProgress] = useState<number>(0);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>(''); // Holds the actual selected title string or 'custom'
  const [customTitleInput, setCustomTitleInput] = useState<string>('');
  const [titleError, setTitleError] = useState<string | null>(null);

  // Page 3 State
  const [isGeneratingArticle, setIsGeneratingArticle] = useState<boolean>(false);
  const [articleProgress, setArticleProgress] = useState<number>(0);
  const [generatedArticleUrl, setGeneratedArticleUrl] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);

  // --- 模拟状态，后续移除 ---
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true); // 初始加载
  const [historyArticles, setHistoryArticles] = useState<ArticleRecord[]>([]); // 类型应更具体
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewArticle, setPreviewArticle] = useState<ArticleRecord | null>(null); // 类型应更具体

  // Add Preview Modal State
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [previewFileType, setPreviewFileType] = useState<'docx' | 'iframe' | 'unsupported' | 'error' | null>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null); // Ref for style dropdown
  const iframeRef = useRef<HTMLIFrameElement>(null); // Ref for the iframe

  // --- Derived State for UI Control --- 
  const isBasicInfoValid = useCallback(() => {
      // Simple check, reuse logic from validateBasicInfo if needed for more complex rules
      return name.trim() !== '' && unit.trim() !== '' && direction.trim() !== '' && wordCount >= 100 && wordCount <= 5000 && (selectedStyle !== 'custom' || customStyle.trim() !== '');
  }, [name, unit, direction, wordCount, selectedStyle, customStyle]);

  const isTitleSelected = useCallback(() => {
      return selectedTitle && (selectedTitle !== 'custom' || customTitleInput.trim() !== '');
  }, [selectedTitle, customTitleInput]);

  // --- 副作用 ---
  useEffect(() => {
    const savedUsername = localStorage.getItem('articleGenerator_username');
    if (savedUsername) {
      completeLogin(savedUsername);
    } else {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (userOpenid) {
      loadArticleHistory();
    } else {
      setHistoryArticles([]);
      setIsLoadingHistory(false);
    }
  }, [userOpenid]);
  
  // Click outside handler for style dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setIsStyleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- 事件处理函数 ---
  const completeLogin = useCallback((uname: string) => {
    setIsLoggedIn(true);
    setUsername(uname);
    const openid = 'internal_' + uname;
    setUserOpenid(openid);
    setLoginError(null); // 清除错误
    setLoginInput(''); // 清空输入框
    // 实际应用中，这里会调用 loadArticleHistory()
  }, []);

  const handleLoginAttempt = () => {
    setLoginError(null); // 清除之前的错误
    const trimmedInput = loginInput.trim();
    if (!trimmedInput) {
      setLoginError('请输入账号');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(trimmedInput)) {
      setLoginError('账号只能包含英文字母和数字');
      return;
    }
    localStorage.setItem('articleGenerator_username', trimmedInput);
    completeLogin(trimmedInput);
  };

  const handleLoginKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLoginAttempt();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('articleGenerator_username');
    setIsLoggedIn(false);
    setUsername('');
    setUserOpenid('');
    setHistoryArticles([]); // 清空历史
    setName('');
    setUnit('');
    setDirection('');
    setWordCount(2500);
    setSelectedStyle('生动有趣，角度新颖');
    setCustomStyle('');
    setGeneratedTitles([]);
    setSelectedTitle('');
    setCustomTitleInput('');
    setIsGeneratingTitles(false);
    setTitleProgress(0);
    setTitleError(null);
    setIsGeneratingArticle(false);
    setArticleProgress(0);
    setGeneratedArticleUrl(null);
    setArticleError(null);
    setFormError(null);
    setHistoryError(null);
    setShowPreviewModal(false);
    setPreviewArticle(null);
    setIsPreviewLoading(false);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    console.log("用户已登出");
  };

  // --- Validation Functions (Simplified/Renamed) ---
  const validateBasicInfo = () => {
    setFormError(null); 
    if (!name.trim()) { setFormError("请输入您的姓名"); return false; }
    if (!unit.trim()) { setFormError("请输入您的科室"); return false; }
    if (!direction.trim()) { setFormError("请输入文章方向或主题"); return false; }
    if (wordCount < 100 || wordCount > 5000) { setFormError("字数必须在100-5000之间"); return false; }
    const currentStyle = selectedStyle === 'custom' ? customStyle.trim() : selectedStyle;
    if (!currentStyle) { setFormError("请选择或输入文章风格"); return false; }
    console.log("Basic Info validation passed");
    return true;
  };
  
  const validateTitleSelection = () => {
    setFormError(null);
    // A title is valid if EITHER a generated title is selected OR the custom input has text
    const generatedTitleIsSelected = selectedTitle && selectedTitle !== 'custom';
    const customTitleIsEntered = customTitleInput.trim() !== '';
    
    if (!generatedTitleIsSelected && !customTitleIsEntered) {
      // No title selected or entered
      return false;
    }
    // If custom title radio is selected, ensure the input isn't empty
    if (selectedTitle === 'custom' && !customTitleIsEntered) {
        return false;
    }
    console.log("Title selection validation passed");
    return true;
  };

  // --- API Call Functions ---
  const handleGenerateTitles = async () => {
    if (!validateBasicInfo()) { 
        // Optionally set formError if button is clicked explicitly with invalid info
        setFormError("请先完善并验证基本信息");
        return; 
    }
    setIsGeneratingTitles(true);
    setTitleProgress(0);
    setGeneratedTitles([]);
    // Don't reset selectedTitle or customTitleInput here
    setTitleError(null);
    setFormError(null);
    
    // Read directly from state
    const payload = {
      openid: userOpenid || 'anonymous', // Use logged in user's openid
      direction: direction.trim(),
      word_count: wordCount, // Use word count from basic info
      name: name.trim(),
      unit: unit.trim()
    };
    
    console.log('生成标题请求数据:', JSON.stringify(payload));
    
    try {
      const response = await fetch('/api/generate_titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Process SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // Buffer for incomplete JSON objects
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep the last incomplete part in the buffer
        
        for (const eventString of events) {
          if (eventString.trim().startsWith('data:')) {
            try {
              const eventData = JSON.parse(eventString.replace('data:', '').trim());
              if (eventData.data && eventData.data.progress !== undefined) {
                setTitleProgress(parseInt(eventData.data.progress));
              }
              if (eventData.event === 'workflow_finished') {
                if (eventData.data && eventData.data.result && Array.isArray(eventData.data.result)) {
                  setGeneratedTitles(eventData.data.result);
                  setIsGeneratingTitles(false); // 标记生成结束
                  console.log("Titles generated:", eventData.data.result);
                  // 不再在这里结束循环，让 reader.read() 自然结束
                } else {
                  const errorMsg = eventData.data?.error || '生成标题失败，未收到有效结果';
                  throw new Error(errorMsg);
                }
              } else if (eventData.event === 'workflow_failed') {
                const errorMsg = eventData.data?.error || '生成标题工作流失败';
                throw new Error(errorMsg);
              }
            } catch (e: any) { 
              console.error('Error parsing title event data:', e); 
              // Handle JSON parsing errors more gracefully if needed
              if (e instanceof SyntaxError) {
                console.warn("Incomplete JSON received, waiting for more data...");
              } else {
                setTitleError(`处理标题生成事件时出错: ${e.message}`);
                setIsGeneratingTitles(false); // Stop on error
                return; // Exit the loop on critical parsing error
              }
            }
          }
        }
      }
      // Ensure loading state is set to false if loop finishes without 'workflow_finished' (edge case)
      if (isGeneratingTitles) {
         setIsGeneratingTitles(false);
         if (generatedTitles.length === 0 && !titleError) {
           setTitleError("标题生成超时或未返回结果");
         }
      }

    } catch (error: any) {
      console.error('Error generating titles:', error);
      setTitleError(`生成标题时出错: ${error.message}`);
      setIsGeneratingTitles(false); // Stop on error
    }
  };

  const handleGenerateArticle = async () => {
    if (!validateBasicInfo()) {
        setFormError("请先完善基本信息");
        return; 
    }
    if (!validateTitleSelection()) {
        setFormError("请选择或输入一个标题"); 
        return; 
    }

    setIsGeneratingArticle(true);
    setArticleProgress(0);
    setGeneratedArticleUrl(null);
    setArticleError(null);
    setFormError(null);

    // Determine the final title based on selection and custom input
    let finalTitle = '';
    if (selectedTitle && selectedTitle !== 'custom') {
      finalTitle = selectedTitle; // Use explicitly selected generated title
    } else if (customTitleInput.trim()) {
      finalTitle = customTitleInput.trim(); // Use custom input if available (even if radio not clicked)
    } else {
      // This case should ideally be prevented by validateTitleSelection, but have a fallback
      setArticleError("无法确定标题");
      setIsGeneratingArticle(false);
      return;
    }

    const currentStyle = selectedStyle === 'custom' ? customStyle.trim() : selectedStyle;

    const payload = {
      openid: userOpenid || 'anonymous',
      direction: direction.trim(),
      title: finalTitle,
      word_count: wordCount,
      name: name.trim(),
      unit: unit.trim(),
      style: currentStyle
    };

    console.log('生成文章请求数据:', JSON.stringify(payload));

    try {
      const response = await fetch('/api/generate_article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventString of events) {
          if (eventString.trim().startsWith('data:')) {
            try {
              const eventData = JSON.parse(eventString.replace('data:', '').trim());
              if (eventData.data && eventData.data.progress !== undefined) {
                setArticleProgress(parseInt(eventData.data.progress));
              }
              if (eventData.event === 'workflow_finished') {
                if (eventData.data && eventData.data.files && eventData.data.files.length > 0 && eventData.data.files[0].url) {
                  setGeneratedArticleUrl(eventData.data.files[0].url);
                  setIsGeneratingArticle(false);
                  console.log("Article generated, URL:", eventData.data.files[0].url);
                  setTimeout(() => loadArticleHistory(), 1500); // Reload history after generation
                } else {
                  throw new Error(eventData.data?.error || '生成文章失败，未收到文件URL');
                }
              } else if (eventData.event === 'workflow_failed') {
                 throw new Error(eventData.data?.error || '生成文章工作流失败');
              }
            } catch (e: any) {
              console.error('Error parsing article event data:', e);
              if (e instanceof SyntaxError) {
                 console.warn("Incomplete JSON received...");
              } else {
                 setArticleError(`处理文章事件时出错: ${e.message}`);
                 setIsGeneratingArticle(false);
                 return;
              }
            }
          }
        }
      }
      if (isGeneratingArticle) {
         setIsGeneratingArticle(false);
         if (!generatedArticleUrl && !articleError) {
            setArticleError("文章生成超时或未返回结果");
         }
      }

    } catch (error: any) {
      console.error('Error generating article:', error);
      setArticleError(`生成文章时出错: ${error.message}`);
      setIsGeneratingArticle(false);
    }
  };

  // --- History API Call ---
  const loadArticleHistory = async () => {
      if (!userOpenid) {
          console.log("User not logged in, cannot load history.");
          setHistoryArticles([]);
          setIsLoadingHistory(false);
          return;
      }
      
      console.log("Attempting to load article history for:", userOpenid);
      setIsLoadingHistory(true);
      setHistoryError(null); // Clear previous errors
      
      try {
          const response = await fetch(`/api/articles?user_id=${encodeURIComponent(userOpenid)}`, {
              method: 'GET',
              headers: {
                  'Accept': '*/*', // Keep as per original working call
                  'Authorization': `Bearer ${TEMP_SYSTEM_JWT}` // Use temporary JWT
              }
          });
          
          if (!response.ok) {
              const errorData = await response.text(); // Read error text
              throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
          }
          
          const data = await response.json();
          console.log("History data received:", data);
          setHistoryArticles(data.records || []);
          
      } catch (error: any) {
          console.error('Error loading article history:', error);
          setHistoryError(`加载历史文章失败: ${error.message}`);
          setHistoryArticles([]); // Clear articles on error
      } finally {
          setIsLoadingHistory(false);
      }
  };

  // --- Preview Content Loader ---
  const loadAndRenderDocx = async (url: string) => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    console.log("Attempting to load and render DOCX:", url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法加载文档: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log("DOCX fetched, converting...");
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        console.log("DOCX converted to HTML");
        // Basic styling for the converted HTML
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
        console.error('DOCX 预览失败:', error);
        setPreviewError(`DOCX 预览加载失败: ${error.message}`);
        setPreviewFileType('error');
    } finally {
        setIsPreviewLoading(false);
    }
  };

  // --- Preview Modal Handlers ---
  const handleOpenPreview = (article: ArticleRecord) => {
    setPreviewArticle(article);
    setShowPreviewModal(true);
    // Reset previous preview state
    setIsPreviewLoading(true);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    if (iframeRef.current) iframeRef.current.src = 'about:blank'; // Clear iframe

    const url = article.public_url;
    console.log("Opening preview for URL:", url);

    if (!url) {
        setPreviewError("文章URL无效，无法预览。");
        setIsPreviewLoading(false);
        setPreviewFileType('error');
        return;
    }

    if (url.toLowerCase().endsWith('.docx')) {
        console.log("File type is DOCX, loading with Mammoth...");
        loadAndRenderDocx(url);
    } else if (url.toLowerCase().endsWith('.pdf')) { 
        console.log("File type is PDF, loading in iframe...");
        // Allow iframe to load naturally
        setPreviewFileType('iframe');
        setIsPreviewLoading(false); // Let iframe handle its own loading indicator (if any)
        // We set the src later in the JSX based on the file type
    } else {
        console.log("File type is unsupported for direct preview.");
        setPreviewError("此文件格式不支持在线预览，请下载查看。");
        setPreviewFileType('unsupported');
        setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setPreviewArticle(null);
    // Reset preview state
    setIsPreviewLoading(false);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    if (iframeRef.current) iframeRef.current.src = 'about:blank'; // Clear iframe on close
  };

  // --- Title Selection Handlers ---
  const handleSelectTitle = (titleValue: string) => {
      setSelectedTitle(titleValue);
      setFormError(null); 
      if (titleValue !== 'custom') setCustomTitleInput('');
  };

  const handleCustomTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newCustomValue = e.target.value;
      setCustomTitleInput(newCustomValue);
      // If user types in custom field, ALWAYS set selection to 'custom'
      if (newCustomValue.trim() !== '') {
          setSelectedTitle('custom');
      } else {
          // If they clear the custom input, deselect the title entirely
          setSelectedTitle(''); 
      }
      setFormError(null); // Clear form error on input change
  };

  // Date Formatting Helper
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '未知日期';
    try {
      const date = new Date(dateStr);
      // Basic formatting, adjust as needed
      return date.toLocaleString('zh-CN', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
      });
    } catch (e) {
      console.error("Error formatting date:", dateStr, e);
      return '日期无效';
    }
  };

  const handleSelectStyle = (value: string) => {
    setSelectedStyle(value);
    setIsStyleDropdownOpen(false);
    setFormError(null); // Clear error on selection
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans relative">
      {/* 2. Add Consistent Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30"> {/* Lower z-index than modal */} 
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side: Page Title */}
            <div className="flex items-center">
              <span className="text-lg font-semibold text-gray-800">科普文章生成系统</span>
            </div>
            {/* Right side: Logged in user display */}
            <div className="flex items-center">
              {isLoggedIn && (
                <div className="flex items-center gap-3">
                   <span className="text-sm text-gray-600">操作员:</span>
                   <span className="text-sm font-medium text-gray-800">{username}</span>
                   <button 
                     onClick={handleLogout} 
                     className="text-xs font-medium px-2 py-1 rounded transition-all hover:bg-gray-100 text-gray-600 border border-gray-300 ml-2"
                   >
                     切换
                   </button>
                 </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 lg:flex lg:gap-8">
        {/* Main Content - Left Side (All Sections) */} 
        <div className="flex-1 lg:max-w-3xl mb-8 lg:mb-0 space-y-8">
          
          {/* Section 1: Basic Info */}
          <section id="basic-info-section">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">1. 基本信息</h2>
              <div className="mb-5">
                <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-700">姓名</label>
                <input 
                  type="text" 
                  id="name" 
                  placeholder="请输入您的姓名" 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="mb-5">
                <label htmlFor="unit" className="block text-sm font-medium mb-2 text-gray-700">科室</label>
                <input 
                  type="text" 
                  id="unit" 
                  placeholder="请输入您的科室" 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={unit} 
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <div className="mb-5">
                <label htmlFor="direction" className="block text-sm font-medium mb-2 text-gray-700">方向</label>
                <input 
                  type="text" 
                  id="direction" 
                  placeholder="请输入文章方向或主题" 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                />
              </div>
              <div className="mb-5">
                <label htmlFor="word_count" className="block text-sm font-medium mb-2 text-gray-700">字数</label>
                <input 
                  type="number" 
                  id="word_count" 
                  min="100" 
                  max="5000" 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                  value={wordCount} 
                  onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                />
              </div>
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
                      {/* Chevron up/down icon - Updated Path */}
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                         {/* DELETE OLD PATH AND REPLACE WITH NEW PATH BELOW */}
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
                            { 'bg-blue-50 text-blue-900': selectedStyle === option.value } // Optional: Highlight selected in list
                          )}
                        >
                          <span className={cn('block truncate', { 'font-semibold': selectedStyle === option.value })}>
                            {option.label}
                          </span>
                          {/* Optional Checkmark for selected */}
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
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Title Selection */} 
          <section id="title-selection-section">
            <fieldset disabled={!isBasicInfoValid()} className="disabled:opacity-60 disabled:cursor-not-allowed">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">2. 选择或生成标题</h2>
                <p className="text-sm text-gray-500 mb-4">您可以选择下方 AI 生成的标题，或输入自定义标题。标题生成过程不会影响您继续操作。</p>

                {/* Generate Titles Button - KEEP */}
                <div className="mb-4">
                  <button
                    onClick={handleGenerateTitles}
                    className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isGeneratingTitles || !isBasicInfoValid()}
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
                          {/* Hidden actual radio for semantics if needed, but onClick handles it */}
                          <input type="radio" name="title" value={title} checked={selectedTitle === title} className="absolute opacity-0 w-0 h-0" readOnly />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Title Input Area - MOVED HERE and Always Visible (within fieldset) */}
                <div className="mt-4"> {/* Adjust margin if needed */} 
                   <label htmlFor="customTitle" className="block text-sm font-medium mb-2 text-gray-700">自定义标题</label>
                   <input 
                      type="text" 
                      id="customTitle" 
                      placeholder="在此输入自定义标题 (可选, 或使用上方AI建议)" 
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                      value={customTitleInput}
                      onChange={handleCustomTitleChange}
                      // Disable if an AI title is EXPLICITLY selected
                      // disabled={selectedTitle !== '' && selectedTitle !== 'custom'}
                    />
                 </div>

                {/* Placeholder or initial message if not loading and no titles/error yet */}
                 {!isGeneratingTitles && generatedTitles.length === 0 && !titleError && (
                   <p className="text-sm text-gray-500 text-center py-4">点击 "AI 生成标题建议" 获取智能推荐。</p> /* Updated placeholder */ 
                 )}
              </div>
            </fieldset>
          </section>

          {/* Section 3: Generate Article */} 
          <section id="generate-article-section">
            <fieldset disabled={!isBasicInfoValid() || !isTitleSelected()} className="disabled:opacity-60 disabled:cursor-not-allowed">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">3. 生成文章</h2>
                {/* Article Generation Progress */}
                {isGeneratingArticle && (
                  <div className="mt-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <div className="text-sm text-gray-500">正在生成文章...</div>
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
                
                {/* Article Result - Show when not generating AND (URL exists OR there was an error) */}
                {(!isGeneratingArticle && (generatedArticleUrl || articleError)) && (
                  <div className="animate-fade-in text-center p-8">
                    {/* Show success icon only if URL exists and no error */}
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
                        {/* Add Preview Button Here */}
                        <button
                          onClick={() => {
                            // Temporary placeholder:
                            if (generatedArticleUrl) {
                                handleOpenPreview({ 
                                    public_url: generatedArticleUrl, 
                                    // Need to get title and style from state
                                    title: customTitleInput || selectedTitle || '生成文章', // Placeholder title
                                    style: selectedStyle === 'custom' ? customStyle : selectedStyle || null, // Placeholder style
                                    // Add missing required fields to satisfy ArticleRecord type:
                                    id: -1, // Placeholder ID for non-history item
                                    author_name: name || null, // Use name from state
                                    word_count: wordCount || null, // Use wordCount from state
                                    created_at: new Date().toISOString() // Use current time
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
                
                {/* Placeholder or initial message if not loading and no result/error yet */}
                {!isGeneratingArticle && !generatedArticleUrl && !articleError && (
                    <p className="text-sm text-gray-500 text-center py-4">请等待文章生成...</p>
                )}

                {/* Generate Article Button - KEEP */}
                <div className="mt-6">
                   <button 
                      onClick={handleGenerateArticle}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                      disabled={!isBasicInfoValid() || !isTitleSelected() || isGeneratingArticle} 
                    >
                      {isGeneratingArticle ? '正在生成...' : '生成文章'}
                    </button>
                </div>
              </div>
            </fieldset>
          </section>

        </div>

        {/* History Panel - Right Side */}
        <div className="lg:w-80 lg:shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm sticky top-24"> {/* Add sticky positioning */} 
            <h2 className="text-lg font-semibold pb-3 mb-4 border-b border-gray-200 text-gray-800">历史文章</h2>
            {isLoadingHistory ? (
              <div id="historyLoadingContainer" className="text-center py-5 text-gray-500">
                <svg className="animate-spin h-5 w-5 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm">加载历史文章...</p>
              </div>
            ) : (
              <div id="historyList" className="space-y-3 max-h-[600px] overflow-y-auto">
                {historyError && !isLoadingHistory && (
                  <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded p-3">
                    {historyError}
                  </div>
                )}
                {!historyError && historyArticles.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {isLoggedIn ? '暂无历史文章' : '请先登录查看历史记录'}
                  </p>
                )}
                {!historyError && historyArticles.length > 0 && (
                  historyArticles.map((article) => (
                    <div 
                      key={article.id} 
                      onClick={() => handleOpenPreview(article)}
                      className="p-3 border border-gray-200 rounded-md cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm"
                    >
                      <div className="font-medium mb-1 break-words text-sm text-gray-800">
                        {article.title || '无标题'}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{article.author_name || '未知作者'}</span>
                        <span>{article.word_count ? `${article.word_count} 字` : '? 字'}</span>
                      </div>
                      {article.style && (
                         <div className="text-xs text-blue-600 italic mt-1">
                            风格: {article.style}
                         </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(article.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal - Styles seem okay */} 
      {!isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)]">
          <div className="bg-white rounded-lg shadow-xl p-8 w-11/12 max-w-md">
            <h2 className="text-xl font-semibold mb-2 text-center text-gray-800">登录系统</h2>
            <p className="text-sm text-gray-500 text-center mb-6">请输入您的账号</p>
            {/* Login Error Display */}
            {loginError && (
              <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded-md p-3 mb-4">
                {loginError}
              </div>
            )}
            <input 
              type="text" 
              placeholder="请输入账号" 
              maxLength={20} 
              className="mb-5 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={loginInput} 
              onChange={(e) => setLoginInput(e.target.value)}
              onKeyPress={handleLoginKeyPress}
            />
            <button 
              onClick={handleLoginAttempt} 
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              登录
            </button>
          </div>
        </div>
      )}
      
      {/* Preview Modal - Styles seem okay */} 
      {showPreviewModal && previewArticle && (
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
            
            {/* Modal Content - Make scrollable */} 
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
      )}

    </div>
  );
} 