import { useState } from 'react';

interface GenerateTitlesPayload {
  userid: string;
  direction: string;
  word_count: number;
  name: string;
  unit: string;
}

interface TitleGenerationResult {
  isGeneratingTitles: boolean;
  titleProgress: number;
  generatedTitles: string[];
  titleError: string | null;
  generateTitles: (payload: GenerateTitlesPayload) => Promise<void>;
}

export function useTitleGeneration(): TitleGenerationResult {
  const [isGeneratingTitles, setIsGeneratingTitles] = useState<boolean>(false);
  const [titleProgress, setTitleProgress] = useState<number>(0);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [titleError, setTitleError] = useState<string | null>(null);

  const generateTitles = async (payload: GenerateTitlesPayload) => {
    setIsGeneratingTitles(true);
    setTitleProgress(0);
    setGeneratedTitles([]);
    setTitleError(null);
    
    console.log('生成标题请求数据 (来自 hook):', JSON.stringify(payload));
    
    try {
      const response = await fetch('/api/generate_titles', {
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
                setTitleProgress(parseInt(eventData.data.progress));
              }
              if (eventData.event === 'workflow_finished') {
                if (eventData.data && eventData.data.result && Array.isArray(eventData.data.result)) {
                  setGeneratedTitles(eventData.data.result);
                  setIsGeneratingTitles(false); 
                  console.log("Titles generated (from hook):", eventData.data.result);
                  // No return needed here, state updates trigger re-render
                } else {
                  const errorMsg = eventData.data?.error || '生成标题失败，未收到有效结果';
                  throw new Error(errorMsg);
                }
              } else if (eventData.event === 'workflow_failed') {
                const errorMsg = eventData.data?.error || '生成标题工作流失败';
                throw new Error(errorMsg);
              }
            } catch (e: any) { 
              console.error('Error parsing title event data (in hook):', e); 
              if (e instanceof SyntaxError) {
                console.warn("Incomplete JSON received (in hook), waiting for more data...");
              } else {
                setTitleError(`处理标题生成事件时出错: ${e.message}`);
                setIsGeneratingTitles(false); 
                // We don't need to return here, just set the error state
                // Potentially break the inner loop if error is critical?
              }
            }
          }
        }
      } // End of while loop
      
      // Final check after loop finishes
      if (isGeneratingTitles) { // Check if it was still generating when loop ended
         setIsGeneratingTitles(false); // Ensure loading is off
         if (generatedTitles.length === 0 && !titleError) {
           setTitleError("标题生成超时或未返回结果");
         }
      }

    } catch (error: any) {
      console.error('Error generating titles (in hook):', error);
      setTitleError(`生成标题时出错: ${error.message}`);
      setIsGeneratingTitles(false); 
    }
  };

  return {
    isGeneratingTitles,
    titleProgress,
    generatedTitles,
    titleError,
    generateTitles,
  };
} 