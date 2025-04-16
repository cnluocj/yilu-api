"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import cn from 'classnames'; // 引入classnames库来帮助动态合并类名
import * as mammoth from 'mammoth'; // Import mammoth

// Temporary Placeholder JWT - Replace with actual auth logic
const TEMP_SYSTEM_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJzeXN0ZW0t5ZCO56uvIiwicm9sZSI6InN5c3RlbSIsInBlcm1pc3Npb25zIjpbInF1b3RhOnJlYWQiLCJxdW90YTp3cml0ZSIsImFydGljbGU6cmVhZCIsImFydGljbGU6d3JpdGUiLCJhcnRpY2xlOmRlbGV0ZSJdLCJpYXQiOjE3NDQyNDg3NDEsImV4cCI6MTc0Njg0MDc0MX0.aKnFmck6xwt4MMbegrLsssF7hZaZSrHbsgrjB24XJys';

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
  const [currentStep, setCurrentStep] = useState<number>(1); // 当前步骤状态
  const [formError, setFormError] = useState<string | null>(null); // 通用表单错误

  // Page 1 Form State
  const [name, setName] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(1500);
  const [selectedStyle, setSelectedStyle] = useState<string>('生动有趣，角度新颖');
  const [customStyle, setCustomStyle] = useState<string>('');
  
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

  // User Info State (保存验证后的表单数据)
  const [userInfo, setUserInfo] = useState<Partial<UserInfo>>({});

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
  const iframeRef = useRef<HTMLIFrameElement>(null); // Ref for the iframe

  // --- 副作用 ---
  // 组件加载时检查登录状态
  useEffect(() => {
    const savedUsername = localStorage.getItem('articleGenerator_username');
    if (savedUsername) {
      completeLogin(savedUsername);
      setCurrentStep(1); // 登录后默认回到第一步
    } else {
      setCurrentStep(1); // 未登录也显示第一步（但会被模态框遮挡）
      setIsLoadingHistory(false);
    }
  }, []);

  // 登录成功后加载历史记录 (依赖 userOpenid)
  useEffect(() => {
    if (userOpenid) {
      console.log("用户已登录，OpenID:", userOpenid, "可以加载历史记录了");
      loadArticleHistory();
    } else {
      // Clear history if user logs out
      setHistoryArticles([]);
      setIsLoadingHistory(false);
    }
  }, [userOpenid]);
  
  // 进入第二步时自动生成标题 (仅当没有生成过标题时)
  useEffect(() => {
    if (currentStep === 2 && !isGeneratingTitles && generatedTitles.length === 0 && !titleError) {
      handleGenerateTitles();
    }
  }, [currentStep, isGeneratingTitles, generatedTitles.length, titleError]); // 添加依赖

  // 进入第三步时自动生成文章 (仅当未生成过且没有错误时)
  useEffect(() => {
    if (currentStep === 3 && !isGeneratingArticle && !generatedArticleUrl && !articleError && userInfo.title) {
      handleGenerateArticle();
    }
    // Depend on currentStep and essential userInfo fields needed for payload
  }, [currentStep, isGeneratingArticle, generatedArticleUrl, articleError, userInfo.title, userInfo.openid, userInfo.direction, userInfo.word_count, userInfo.name, userInfo.unit, userInfo.style]);

  // --- 事件处理函数 ---
  const completeLogin = useCallback((uname: string) => {
    setIsLoggedIn(true);
    setUsername(uname);
    const openid = 'internal_' + uname;
    setUserOpenid(openid);
    setLoginError(null); // 清除错误
    setLoginInput(''); // 清空输入框
    setCurrentStep(1); // 登录后强制回到第一步
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
    setCurrentStep(1); // 登出后回到第一步
    // 重置表单状态
    setName('');
    setUnit('');
    setDirection('');
    setWordCount(1500);
    setSelectedStyle('生动有趣，角度新颖');
    setCustomStyle('');
    // 重置第二步状态
    setGeneratedTitles([]);
    setSelectedTitle('');
    setCustomTitleInput('');
    setIsGeneratingTitles(false);
    setTitleProgress(0);
    setTitleError(null);
    // Reset Page 3 state
    setIsGeneratingArticle(false);
    setArticleProgress(0);
    setGeneratedArticleUrl(null);
    setArticleError(null);
    // 清空保存的用户信息
    setUserInfo({});
    setFormError(null);
    setHistoryError(null);
    // Reset Preview State on Logout
    setShowPreviewModal(false);
    setPreviewArticle(null);
    setIsPreviewLoading(false);
    setPreviewError(null);
    setDocxHtml(null);
    setPreviewFileType(null);
    console.log("用户已登出");
  };

  // --- 表单验证函数 ---
  const validatePage1 = () => {
    setFormError(null); // 清除旧错误
    if (!name.trim()) {
      setFormError("请输入您的姓名");
      return false;
    }
    if (!unit.trim()) {
      setFormError("请输入您的科室");
      return false;
    }
    if (!direction.trim()) {
      setFormError("请输入文章方向或主题");
      return false;
    }
    if (wordCount < 100 || wordCount > 5000) {
      setFormError("字数必须在100-5000之间");
      return false;
    }
    if (selectedStyle === 'custom' && !customStyle.trim()) {
      setFormError("请输入自定义风格描述");
      return false;
    }
    console.log("Page 1 validation passed");
    return true;
  };
  
  const validatePage2 = () => {
    setFormError(null); // 清除旧错误
    if (!selectedTitle) {
        setFormError('请选择一个标题');
        return false;
    }
    if (selectedTitle === 'custom' && !customTitleInput.trim()) {
        setFormError('请输入自定义标题');
        return false;
    }
    console.log("Page 2 validation passed");
    return true;
  };

  // --- API Call Functions ---
  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true);
    setTitleProgress(0);
    setGeneratedTitles([]);
    setSelectedTitle('');
    setCustomTitleInput('');
    setTitleError(null);
    setFormError(null); // 清除通用表单错误
    
    // 使用保存的 userInfo
    const payload = {
      openid: userInfo.openid || 'anonymous',
      direction: userInfo.direction || '健康科普',
      word_count: userInfo.word_count || 1500,
      name: userInfo.name || '未知用户',
      unit: userInfo.unit || '未知科室'
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
    setIsGeneratingArticle(true);
    setArticleProgress(0);
    setGeneratedArticleUrl(null); // Reset previous URL
    setArticleError(null);
    setFormError(null); // Clear general form error

    if (!userInfo.title) {
      setArticleError("无法生成文章：未选择标题。请返回上一步选择标题。");
      setIsGeneratingArticle(false);
      return;
    }

    const payload: UserInfo = {
      openid: userInfo.openid || 'anonymous',
      direction: userInfo.direction || '健康科普',
      title: userInfo.title, // Use the title saved in userInfo
      word_count: userInfo.word_count || 1500,
      name: userInfo.name || '未知用户',
      unit: userInfo.unit || '未知科室',
      style: userInfo.style || '生动有趣，角度新颖'
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

  // Rename this function
  const triggerArticleRegeneration = () => {
      handleGenerateArticle(); // Simply call the generation function again
  };

  // --- Step Navigation Functions ---
  const goToStep = (step: number) => {
    setFormError(null); // 切换步骤时清除错误
    setTitleError(null); // 切换步骤时清除标题错误
    setArticleError(null); // Clear article error on step change
    setCurrentStep(step);
    window.scrollTo(0, 0); // 切换步骤时滚动到页面顶部
  };

  const handleNextToTitles = () => {
    if (!validatePage1()) {
      return; // 验证失败则停止
    }
    // 保存用户信息到状态
    const currentStyle = selectedStyle === 'custom' ? customStyle.trim() : selectedStyle;
    const currentUserInfo: Partial<UserInfo> = {
      openid: userOpenid,
      name: name.trim(),
      unit: unit.trim(),
      direction: direction.trim(),
      word_count: wordCount,
      style: currentStyle,
    };
    setUserInfo(currentUserInfo);
    console.log("User Info Saved:", currentUserInfo);
    // 清空第二步的旧状态
    setGeneratedTitles([]);
    setSelectedTitle('');
    setCustomTitleInput('');
    setIsGeneratingTitles(false); //确保重置加载状态
    setTitleProgress(0);
    setTitleError(null);
    
    goToStep(2);
    // Title generation will be triggered by the useEffect hook for step 2
  };

  const handleBackToInfo = () => {
    goToStep(1);
  };

  const handleNextToGenerate = () => {
    if (!validatePage2()) {
      return; // 验证失败则停止
    }
    // 保存最终选择的标题到 userInfo
    const finalTitle = selectedTitle === 'custom' ? customTitleInput.trim() : selectedTitle;
    // Update userInfo state *before* navigating
    const updatedUserInfo = { ...userInfo, title: finalTitle };
    setUserInfo(updatedUserInfo);
    
    console.log("Navigating to Step 3 with Title:", finalTitle);
    // Reset Page 3 state before navigating
    setIsGeneratingArticle(false);
    setArticleProgress(0);
    setGeneratedArticleUrl(null);
    setArticleError(null);
    goToStep(3);
    // Article generation will be triggered by the useEffect hook for step 3
  };

  const handleBackToTitles = () => {
    // Reset Page 3 state when going back
    setIsGeneratingArticle(false);
    setArticleProgress(0);
    setGeneratedArticleUrl(null);
    setArticleError(null);
    goToStep(2);
  };
  
  // --- Title Selection Handlers ---
  const handleSelectTitle = (titleValue: string) => {
      setSelectedTitle(titleValue);
      setFormError(null); // Clear potential validation error on selection
      if (titleValue !== 'custom') {
          setCustomTitleInput(''); // Clear custom input if a preset is selected
      }
  };

  const handleRegenerateTitles = () => {
      // 不需要检查 userInfo，因为在进入第二步时已经验证并保存
      handleGenerateTitles(); // 直接调用生成函数
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

  // --- 辅助函数 (获取步骤样式) ---
  const getStepClasses = (stepNumber: number) => {
    const isActive = currentStep === stepNumber;
    const isCompleted = currentStep > stepNumber;

    return {
      number: cn(
        'step-number w-8 h-8 rounded-full flex items-center justify-center font-medium mb-2 transition-all',
        {
          'bg-blue-600 text-white': isActive, 
          'bg-green-500 text-white': isCompleted,
          'bg-gray-200 text-gray-500': !isActive && !isCompleted,
        }
      ),
      title: cn('step-title text-sm transition-all', {
        'text-blue-700 font-medium': isActive,
        'text-gray-900': isCompleted,
        'text-gray-500': !isActive && !isCompleted,
      }),
    };
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
        {/* Main Content - Left Side */}
        <div className="flex-1 lg:max-w-3xl mb-8 lg:mb-0"> {/* Add bottom margin for smaller screens */} 
          {/* Progress Steps - Styles seem okay */} 
          <div className="relative flex justify-between mb-10">
            <div className="absolute top-4 left-0 right-0 h-[2px] bg-gray-200 z-0"></div>
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="relative flex flex-col items-center z-10">
                <div className={getStepClasses(stepNum).number}>{stepNum}</div>
                <div className={getStepClasses(stepNum).title}>
                  {stepNum === 1 ? '基本信息' : stepNum === 2 ? '选择标题' : '生成文章'}
                </div>
              </div>
            ))}
          </div>

          {/* Container for Pages - Styles seem okay */} 
          <div className="w-full">
            {/* Page 1 */} 
            {currentStep === 1 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">请输入基本信息</h2>
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
                  <label htmlFor="style" className="block text-sm font-medium mb-2 text-gray-700">文章风格</label>
                  <select 
                    id="style" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white bg-no-repeat bg-right pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]"
                    value={selectedStyle} 
                    onChange={(e) => setSelectedStyle(e.target.value)}
                  >
                    <option value="生动有趣，角度新颖">生动有趣，角度新颖</option>
                    <option value="通俗易懂，深入浅出">通俗易懂，深入浅出</option>
                    <option value="幽默风趣，轻松活泼">幽默风趣，轻松活泼</option>
                    <option value="严谨专业，循证可靠">严谨专业，循证可靠</option>
                    <option value="亲切温暖，富有同理心">亲切温暖，富有同理心</option>
                    <option value="故事化叙述，情景再现">故事化叙述，情景再现</option>
                    <option value="生活化演绎，实用性强">生活化演绎，实用性强</option>
                    <option value="custom">自定义风格</option>
                  </select>
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
                <div className="mt-6">
                  <button 
                    onClick={handleNextToTitles}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    下一步
                  </button>
                </div>
              </div>
            )}
            
            {/* Page 2 */} 
            {currentStep === 2 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">请选择文章标题</h2>
                
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
                    
                    {/* Custom Title Option */}
                    <div 
                      onClick={() => handleSelectTitle('custom')}
                      className={cn(
                         'border rounded-md p-4 cursor-pointer transition-all relative hover:border-blue-400',
                        {
                           'border-blue-500 bg-blue-50 ring-1 ring-blue-500': selectedTitle === 'custom',
                           'border-gray-300': selectedTitle !== 'custom'
                         }
                      )}
                    >
                      <div className="font-medium mb-1 text-sm">自定义标题</div>
                      <div 
                        className={cn(
                          'absolute top-3 right-3 w-5 h-5 border-2 rounded-full flex items-center justify-center',
                         {
                            'border-blue-500 bg-white': selectedTitle === 'custom',
                            'border-gray-300': selectedTitle !== 'custom'
                          }
                        )}
                      >
                         {selectedTitle === 'custom' && (
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                         )}
                      </div>
                      <input type="radio" name="title" value="custom" checked={selectedTitle === 'custom'} className="absolute opacity-0 w-0 h-0" readOnly />
                    </div>
                    
                    {/* Custom Title Input Area */}
                    {selectedTitle === 'custom' && (
                      <div className="mt-4 animate-fade-in">
                        <div className="mb-5">
                          <input 
                             type="text" 
                             id="customTitle" 
                             placeholder="请输入您的标题" 
                             className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                             value={customTitleInput}
                             onChange={(e) => setCustomTitleInput(e.target.value)}
                           />
                        </div>
                      </div>
                    )}
                    
                    {/* Buttons */} 
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                      <button 
                        onClick={handleBackToInfo} 
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isGeneratingTitles}
                      >
                        上一步
                      </button>
                      <button 
                        onClick={handleRegenerateTitles} 
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isGeneratingTitles}
                      >
                        重新生成
                      </button>
                      <button 
                        onClick={handleNextToGenerate}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled={!selectedTitle || isGeneratingTitles || (selectedTitle === 'custom' && !customTitleInput.trim())}
                      >
                        生成文章
                      </button>
                    </div>
                  </div>
                )}

                {/* Placeholder or initial message if not loading and no titles/error yet */}
                 {!isGeneratingTitles && generatedTitles.length === 0 && !titleError && (
                   <p className="text-sm text-gray-500 text-center py-4">请等待标题生成...</p>
                 )}
              </div>
            )}

            {/* Page 3 */} 
            {currentStep === 3 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">文章生成</h2>
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
                      {articleError ? '请返回上一步重试或联系管理员。' : '您的文章已生成完毕，可立即下载'}
                    </p>
                    {generatedArticleUrl && !articleError && (
                      <a 
                        href={generatedArticleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md transition-all mb-6 text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        下载文章 (DOCX)
                      </a>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                      <button 
                        onClick={handleBackToTitles} 
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={isGeneratingArticle}
                      >
                        选择其他标题
                      </button>
                      <button 
                        onClick={triggerArticleRegeneration} 
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled={isGeneratingArticle}
                      >
                        重新生成文章
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Placeholder or initial message if not loading and no result/error yet */}
                {!isGeneratingArticle && !generatedArticleUrl && !articleError && (
                    <p className="text-sm text-gray-500 text-center py-4">请等待文章生成...</p>
                )}
              </div>
            )}

          </div>

          {/* Form Error message container - Styles seem okay */} 
          {formError && (
            <div className="mt-4 bg-red-100 border border-red-300 text-red-700 text-sm rounded-md p-4 mb-5">
              {formError}
            </div>
          )}
        </div>

        {/* History Panel - Right Side - Styles seem okay */} 
        <div className="lg:w-80 lg:shrink-0"> {/* Use shrink-0 to prevent shrinking */} 
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