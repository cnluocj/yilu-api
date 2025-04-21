import { useState } from 'react';

interface GenerateArticlePayload {
  userid: string;
  direction: string;
  title: string;
  word_count: number;
  name: string;
  unit: string;
  style: string | null;
}

interface ArticleGenerationResult {
  isGeneratingArticle: boolean;
  articleProgress: number;
  generatedArticleUrl: string | null;
  articleError: string | null;
  generateArticle: (payload: GenerateArticlePayload, onComplete?: () => void) => Promise<void>;
}

export function useArticleGeneration(): ArticleGenerationResult {
  const [isGeneratingArticle, setIsGeneratingArticle] = useState<boolean>(false);
  const [articleProgress, setArticleProgress] = useState<number>(0);
  const [generatedArticleUrl, setGeneratedArticleUrl] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);

  const generateArticle = async (payload: GenerateArticlePayload, onComplete?: () => void) => {
    setIsGeneratingArticle(true);
    setArticleProgress(0);
    setGeneratedArticleUrl(null);
    setArticleError(null);

    console.log('生成文章请求数据 (来自 hook):', JSON.stringify(payload));

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
                  const finalUrl = eventData.data.files[0].url;
                  setGeneratedArticleUrl(finalUrl);
                  setIsGeneratingArticle(false);
                  console.log("Article generated (from hook), URL:", finalUrl);
                  // Call the onComplete callback if provided
                  if (onComplete) {
                    // Optional: Add a small delay before reloading history
                    setTimeout(onComplete, 1500); 
                  }
                  // No return, state handles update
                } else {
                  throw new Error(eventData.data?.error || '生成文章失败，未收到文件URL');
                }
              } else if (eventData.event === 'workflow_failed') {
                 throw new Error(eventData.data?.error || '生成文章工作流失败');
              }
            } catch (e: any) {
              console.error('Error parsing article event data (in hook):', e);
              if (e instanceof SyntaxError) {
                 console.warn("Incomplete JSON received (in hook)...");
              } else {
                 setArticleError(`处理文章事件时出错: ${e.message}`);
                 setIsGeneratingArticle(false);
                 // Potentially break loop?
              }
            }
          }
        }
      } // End while loop
      
      // Final check
      if (isGeneratingArticle) { // Still generating after loop?
         setIsGeneratingArticle(false);
         if (!generatedArticleUrl && !articleError) {
            setArticleError("文章生成超时或未返回结果");
         }
      }

    } catch (error: any) {
      console.error('Error generating article (in hook):', error);
      setArticleError(`生成文章时出错: ${error.message}`);
      setIsGeneratingArticle(false);
    }
  };

  return {
    isGeneratingArticle,
    articleProgress,
    generatedArticleUrl,
    articleError,
    generateArticle,
  };
} 