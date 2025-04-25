"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import UserInfoForm from './components/UserInfoForm'; // Import the new component
import TitleSelection from './components/TitleSelection'; // Import the new component
import ArticleGeneration from './components/ArticleGeneration'; // Import the new component
import HistoryPanel from './components/HistoryPanel'; // Import the new component
import LoginForm from './components/LoginForm'; // Import the new component
import PreviewModal from './components/PreviewModal'; // Import the new component
import Header from './components/Header'; // Import the new component
import { useTitleGeneration } from '@/hooks/useTitleGeneration'; // Import the custom hook
import { useArticleGeneration } from '@/hooks/useArticleGeneration'; // Import the custom hook
import { useArticleHistory } from '@/hooks/useArticleHistory'; // Import the custom hook
import { usePreviewModal } from '@/hooks/usePreviewModal'; // Import the custom hook

// Temporary Placeholder JWT - Replace with actual auth logic
const TEMP_SYSTEM_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJzeXN0ZW0t5ZCO56uvIiwicm9sZSI6InN5c3RlbSIsInBlcm1pc3Npb25zIjpbInF1b3RhOnJlYWQiLCJxdW90YTp3cml0ZSIsImFydGljbGU6cmVhZCIsImFydGljbGU6d3JpdGUiLCJhcnRpY2xlOmRlbGV0ZSJdLCJpYXQiOjE3NDQyNDg3NDEsImV4cCI6MTc0Njg0MDc0MX0.aKnFmck6xwt4MMbegrLsssF7hZaZSrHbsgrjB24XJys';

// Define UserInfo Type
interface UserInfo {
  userid: string;
  name: string;
  unit: string;
  direction: string;
  word_count: number;
  style: string;
  title?: string; // 添加可选的title字段
}

// Define Article Record Type for History
export interface ArticleRecord {
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
  // --- State Definitions ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [userid, setUserid] = useState<string>('');
  const [loginInput, setLoginInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null); // 通用表单错误

  // Page 1 Form State (Remains here, passed to UserInfoForm)
  const [name, setName] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(2500);
  const [selectedStyle, setSelectedStyle] = useState<string>('生动有趣，角度新颖');
  const [customStyle, setCustomStyle] = useState<string>('');

  // Page 2 State (Most moved to hook)
  const [selectedTitle, setSelectedTitle] = useState<string>(''); 
  const [customTitleInput, setCustomTitleInput] = useState<string>('');

  // Page 3 State (Managed by hook)

  // History State (Moved to hook)

  // Preview State (Moved to hook)
  const {
    showPreviewModal, 
    previewArticle, 
    isPreviewLoading, 
    previewError, 
    previewFileType, 
    docxHtml,
    iframeRef, // Get ref from hook now
    openPreview, 
    closePreview 
  } = usePreviewModal();

  // --- Custom Hooks ---
  const {
    isGeneratingTitles,
    titleProgress,
    generatedTitles,
    titleError,
    generateTitles
  } = useTitleGeneration();

  const {
    isGeneratingArticle,
    articleProgress,
    generatedArticleUrl,
    articleError,
    generateArticle, // Function from the hook
    articleStatusTitle, // Get the new state from the hook
  } = useArticleGeneration();

  const {
    isLoadingHistory,
    historyArticles,
    historyError,
    loadHistory // Function from the hook
  } = useArticleHistory();

  // --- Event Handlers (Moved completeLogin up) ---
  const completeLogin = useCallback((uname: string) => {
    setIsLoggedIn(true);
    setUsername(uname);
    const currentUserId = 'internal_' + uname;
    setUserid(currentUserId);
    setLoginError(null); 
    setLoginInput(''); 
    // History loading is now triggered by the useEffect watching userid
  }, [setUserid]);

  // --- Derived State for UI Control --- 
  const isBasicInfoValid = useCallback(() => {
    // Reuse logic, depends on state held in this parent component
    return name.trim() !== '' && unit.trim() !== '' && direction.trim() !== '' && wordCount >= 100 && wordCount <= 5000 && (selectedStyle !== 'custom' || customStyle.trim() !== '');
  }, [name, unit, direction, wordCount, selectedStyle, customStyle]);

  const isTitleSelected = useCallback((): boolean => {
      return !!(selectedTitle && (selectedTitle !== 'custom' || customTitleInput.trim() !== ''));
  }, [selectedTitle, customTitleInput]);

  // --- Side Effects ---
  useEffect(() => {
    const savedUsername = localStorage.getItem('articleGenerator_username');
    if (savedUsername) {
      completeLogin(savedUsername); // Now defined above
    } else {
      // setIsLoadingHistory(false); // Loading state now handled by hook
    }
  }, [completeLogin]); // Added completeLogin dependency

  useEffect(() => {
    if (userid) {
      loadHistory(userid); // Call the hook's function
    } else {
      // setHistoryArticles([]); // State handled by hook
    }
  }, [userid, loadHistory]); // Watch renamed state, add loadHistory dependency

  // --- Event Handlers ---
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
    setUserid('');
    setName('');
    setUnit('');
    setDirection('');
    setWordCount(2500);
    setSelectedStyle('生动有趣，角度新颖');
    setCustomStyle('');
    setSelectedTitle('');
    setCustomTitleInput('');
    setFormError(null);
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

  // Trigger Hook Handlers
  const triggerTitleGeneration = useCallback(() => {
    console.log("Triggering Title Generation..."); 
    const basicInfoIsValid = validateBasicInfo();
    console.log("Basic Info Validation Result:", basicInfoIsValid); 
    if (!basicInfoIsValid) { 
        return; 
    }
    setFormError(null); 
    const payload = {
        userid: userid || 'anonymous',
        direction: direction.trim(),
        word_count: wordCount, 
        name: name.trim(),
        unit: unit.trim()
    };
    console.log("Calling generateTitles from hook..."); 
    generateTitles(payload); 
  }, [userid, direction, wordCount, name, unit, validateBasicInfo, generateTitles, setFormError]);

  const triggerArticleGeneration = useCallback(() => {
    if (!validateBasicInfo()) {
        setFormError("请先完善基本信息");
        return; 
    }
    if (!isTitleSelected()) {
        setFormError("请选择或输入一个标题"); 
        return; 
    }
    setFormError(null);

    let finalTitle = '';
    if (selectedTitle && selectedTitle !== 'custom') {
      finalTitle = selectedTitle;
    } else if (customTitleInput.trim()) {
      finalTitle = customTitleInput.trim();
    } 

    const currentStyle = selectedStyle === 'custom' ? customStyle.trim() : selectedStyle;

    const payload = {
      userid: userid || 'anonymous',
      direction: direction.trim(),
      title: finalTitle,
      word_count: wordCount,
      name: name.trim(),
      unit: unit.trim(),
      style: currentStyle || '生动有趣，角度新颖'
    };

    generateArticle(payload); // Removed loadHistory callback here

  }, [
    validateBasicInfo, 
    isTitleSelected, 
    selectedTitle, 
    customTitleInput, 
    selectedStyle, 
    customStyle, 
    userid,
    direction, 
    wordCount, 
    name, 
    unit, 
    generateArticle,
    setFormError
  ]);
  
  // Title Selection Handlers 
  const handleSelectTitle = (titleValue: string) => {
      setSelectedTitle(titleValue);
      setFormError(null); 
      if (titleValue !== 'custom') setCustomTitleInput('');
  };

  const handleCustomTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newCustomValue = e.target.value;
      setCustomTitleInput(newCustomValue);
      if (newCustomValue.trim() !== '') {
          setSelectedTitle('custom');
      } else {
          setSelectedTitle(''); 
      }
      setFormError(null); 
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

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans relative">
      {/* Render the Header component */}
      <Header 
        isLoggedIn={isLoggedIn}
        username={username}
        handleLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 lg:flex lg:gap-8">
        {/* Main Content - Left Side (All Sections) */} 
        <div className="flex-1 lg:max-w-3xl mb-8 lg:mb-0 space-y-8">
          
          {/* General Form Error Display */}
          {formError && (
             <div className="bg-red-100 border border-red-300 text-red-700 text-sm rounded-md p-4 mb-6 animate-fade-in">
                {formError}
             </div>
           )}
          
          {/* Section 1: Basic Info - Render the new component */}
          <UserInfoForm 
             name={name}
             unit={unit}
             direction={direction}
             wordCount={wordCount}
             selectedStyle={selectedStyle}
             customStyle={customStyle}
             onNameChange={setName}
             onUnitChange={setUnit}
             onDirectionChange={setDirection}
             onWordCountChange={setWordCount}
             onSelectedStyleChange={setSelectedStyle} // Pass the setter directly
             onCustomStyleChange={setCustomStyle}
           />

          {/* Section 2: Title Selection - Use hook state/trigger */}
           <TitleSelection
             isGeneratingTitles={isGeneratingTitles} // From hook
             titleProgress={titleProgress}         // From hook
             generatedTitles={generatedTitles}       // From hook
             selectedTitle={selectedTitle}         // From page state
             customTitleInput={customTitleInput}   // From page state
             titleError={titleError}             // From hook
             isBasicInfoValid={isBasicInfoValid()} 
             handleGenerateTitles={triggerTitleGeneration} // CORRECTED: Use triggerTitleGeneration
             handleSelectTitle={handleSelectTitle}         // From page state
             handleCustomTitleChange={handleCustomTitleChange} // From page state
           />

          {/* Section 3: Generate Article - Use hook state/trigger */}
           <ArticleGeneration 
             isGeneratingArticle={isGeneratingArticle} // From hook
             articleProgress={articleProgress}         // From hook
             generatedArticleUrl={generatedArticleUrl}   // From hook
             articleError={articleError}             // From hook
             articleStatusTitle={articleStatusTitle}   // Pass down the new state
             isBasicInfoValid={isBasicInfoValid()} 
             isTitleSelected={isTitleSelected()} 
             handleGenerateArticle={triggerArticleGeneration} // Pass new trigger
             handleOpenPreview={openPreview}         // Use openPreview from hook
             // Pass state needed for preview object construction
             name={name}
             wordCount={wordCount}
             customTitleInput={customTitleInput}
             selectedTitle={selectedTitle}
             selectedStyle={selectedStyle}
             customStyle={customStyle}
           />

        </div>

        {/* History Panel - Right Side - Render the new component */}
        <HistoryPanel 
          isLoadingHistory={isLoadingHistory}
          historyError={historyError}
          historyArticles={historyArticles}
          handleOpenPreview={openPreview}         // Use openPreview from hook
          formatDate={formatDate}
          isLoggedIn={isLoggedIn}
        />

      </div>

      {/* Login Modal - Render the new component conditionally */}
      {!isLoggedIn && (
          <LoginForm 
             loginInput={loginInput}
             loginError={loginError}
             handleLoginAttempt={handleLoginAttempt}
             handleLoginKeyPress={handleLoginKeyPress}
             setLoginInput={setLoginInput}
           />
      )}
      
      {/* Preview Modal - Use hook state/functions */}
      <PreviewModal 
        showPreviewModal={showPreviewModal} // From hook
        previewArticle={previewArticle}     // From hook
        isPreviewLoading={isPreviewLoading} // From hook
        previewError={previewError}         // From hook
        previewFileType={previewFileType}   // From hook
        docxHtml={docxHtml}                 // From hook
        handleClosePreview={closePreview}   // From hook
        iframeRef={iframeRef}             // From hook
      />

    </div>
  );
} 