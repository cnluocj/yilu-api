import { useState, useCallback, useEffect } from 'react';

interface GenerateArticlePayload {
  userid: string;
  direction: string;
  title: string;
  word_count: number;
  name: string;
  unit: string;
  style: string | null;
}

// 存储生成参数，用于断点续传
interface StoredGenerationTask {
  taskId: string;
  userId: string;
  payload: GenerateArticlePayload;
  timestamp: number;
}

interface ArticleGenerationResult {
  isGeneratingArticle: boolean;
  articleProgress: number;
  articleStatusTitle: string | null;
  generatedArticleUrl: string | null;
  articleError: string | null;
  currentTaskId: string | null;
  generateArticle: (payload: GenerateArticlePayload, onComplete?: () => void) => Promise<void>;
  resumeGeneration: () => Promise<void>;
}

// 本地存储任务信息的键名
const TASK_STORAGE_KEY = 'article_generation_task';

// 轮询间隔 (毫秒)
const POLL_INTERVAL = 3000;

export function useArticleGeneration(): ArticleGenerationResult {
  const [isGeneratingArticle, setIsGeneratingArticle] = useState<boolean>(false);
  const [articleProgress, setArticleProgress] = useState<number>(0);
  const [articleStatusTitle, setArticleStatusTitle] = useState<string | null>(null);
  const [generatedArticleUrl, setGeneratedArticleUrl] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);

  // 停止状态轮询
  const stopPolling = useCallback(() => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
  }, [pollingTimer]);

  // 检测到页面可见性变化时的处理
  useEffect(() => {
    // 页面可见性变化处理函数
    const handleVisibilityChange = () => {
      const storedTask = getStoredTask();
      
      if (document.visibilityState === 'visible') {
        // 页面变为可见状态，如果有存储的任务且当前没有进行中的任务，自动恢复
        if (storedTask && !isGeneratingArticle && !generatedArticleUrl) {
          console.log('页面恢复可见，自动恢复任务:', storedTask.taskId);
          resumeTaskStatus(storedTask.userId, storedTask.taskId);
        }
      }
    };

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 组件卸载时清理
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [isGeneratingArticle, generatedArticleUrl, stopPolling]);

  // 初始化时检查是否有未完成的任务
  useEffect(() => {
    const storedTask = getStoredTask();
    if (storedTask && !isGeneratingArticle && !generatedArticleUrl) {
      // 检查任务是否过期 (超过2小时)
      const isExpired = Date.now() - storedTask.timestamp > 2 * 60 * 60 * 1000;
      
      if (isExpired) {
        console.log('存储的任务已过期，清除任务');
        clearStoredTask();
      } else {
        console.log('检测到未完成的任务，自动恢复:', storedTask.taskId);
        resumeTaskStatus(storedTask.userId, storedTask.taskId);
      }
    }
  }, []);

  // 保存任务信息到本地存储
  const storeTask = (taskId: string, userId: string, payload: GenerateArticlePayload) => {
    try {
      const taskInfo: StoredGenerationTask = {
        taskId,
        userId,
        payload,
        timestamp: Date.now()
      };
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskInfo));
      console.log('已保存任务信息到本地存储:', taskId);
    } catch (e) {
      console.error('保存任务信息失败:', e);
    }
  };

  // 从本地存储获取任务信息
  const getStoredTask = (): StoredGenerationTask | null => {
    try {
      const stored = localStorage.getItem(TASK_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      console.error('读取存储的任务信息失败:', e);
      return null;
    }
  };

  // 清除存储的任务信息
  const clearStoredTask = () => {
    try {
      localStorage.removeItem(TASK_STORAGE_KEY);
      console.log('已清除存储的任务信息');
    } catch (e) {
      console.error('清除任务信息失败:', e);
    }
  };

  // 启动任务状态轮询
  const startPolling = useCallback((userId: string, taskId: string) => {
    // 确保先停止现有的轮询
    stopPolling();
    
    console.log('启动任务状态轮询:', taskId);
    
    // 创建新的轮询定时器
    const timer = setInterval(async () => {
      try {
        console.log('轮询任务状态:', taskId);
        const response = await fetch(`/api/article_status?task_id=${taskId}&user_id=${userId}`);
        
        if (!response.ok) {
          console.error('轮询任务状态失败:', response.status);
          return;
        }
        
        const taskStatus = await response.json();
        console.log('任务状态更新:', taskStatus);
        
        // 更新状态
        setArticleProgress(taskStatus.progress || 0);
        
        // 检查任务是否完成
        if (taskStatus.status === 'completed') {
          console.log('任务已完成');
          stopPolling();
          setIsGeneratingArticle(false);
          setArticleProgress(100);
          
          if (taskStatus.result?.fileUrl) {
            setGeneratedArticleUrl(taskStatus.result.fileUrl);
            clearStoredTask(); // 任务成功完成，清除存储
          }
        } 
        // 检查任务是否失败
        else if (taskStatus.status === 'failed') {
          console.log('任务已失败');
          stopPolling();
          setIsGeneratingArticle(false);
          setArticleError(taskStatus.result?.error || '生成失败');
          clearStoredTask(); // 任务失败，清除存储
        }
      } catch (error) {
        console.error('轮询过程中出错:', error);
      }
    }, POLL_INTERVAL);
    
    setPollingTimer(timer);
    
    // 确保组件卸载时清理
    return () => clearInterval(timer);
  }, [stopPolling]);

  // 查询任务状态并恢复
  const resumeTaskStatus = async (userId: string, taskId: string) => {
    try {
      setIsGeneratingArticle(true);
      setCurrentTaskId(taskId);
      setArticleError(null);
      setArticleStatusTitle('恢复生成文章');
      
      console.log('恢复任务状态:', taskId);
      const response = await fetch(`/api/article_status?task_id=${taskId}&user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error(`查询任务失败: ${response.status}`);
      }
      
      const taskStatus = await response.json();
      console.log('获取到任务状态:', taskStatus);
      
      // 更新状态
      setArticleProgress(taskStatus.progress || 0);
      
      // 检查任务状态
      if (taskStatus.status === 'completed') {
        setIsGeneratingArticle(false);
        setArticleProgress(100);
        
        if (taskStatus.result?.fileUrl) {
          setGeneratedArticleUrl(taskStatus.result.fileUrl);
          clearStoredTask(); // 清除存储的任务
        } else {
          throw new Error('任务已完成，但未找到文件URL');
        }
      } 
      else if (taskStatus.status === 'failed') {
        setIsGeneratingArticle(false);
        setArticleError(taskStatus.result?.error || '生成失败');
        clearStoredTask(); // 清除存储的任务
      }
      else {
        // 任务仍在进行中，启动轮询
        startPolling(userId, taskId);
      }
    } catch (error: any) {
      console.error('恢复任务状态时出错:', error);
      setArticleError(`恢复任务时出错: ${error.message}`);
      setIsGeneratingArticle(false);
    }
  };

  // 生成文章函数
  const generateArticle = async (payload: GenerateArticlePayload, onComplete?: () => void) => {
    setIsGeneratingArticle(true);
    setArticleProgress(0);
    setArticleStatusTitle('开始生成文章');
    setGeneratedArticleUrl(null);
    setArticleError(null);
    setCurrentTaskId(null);
    
    // 停止可能存在的轮询
    stopPolling();

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
      
      // 获取任务ID
      const taskId = response.headers.get('X-Task-ID');
      if (taskId) {
        console.log('收到任务ID:', taskId);
        setCurrentTaskId(taskId);
        
        // 存储任务信息，用于断点续传
        storeTask(taskId, payload.userid, payload);
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
              if ((eventData.event === 'workflow_started' || eventData.event === 'workflow_running') && 
                   eventData.data?.title && 
                   typeof eventData.data.title === 'string') {
                setArticleStatusTitle(eventData.data.title);
              }
              if (eventData.event === 'workflow_finished') {
                setArticleStatusTitle(null);
                if (eventData.data && eventData.data.files && eventData.data.files.length > 0 && eventData.data.files[0].url) {
                  const finalUrl = eventData.data.files[0].url;
                  setGeneratedArticleUrl(finalUrl);
                  setIsGeneratingArticle(false);
                  console.log("Article generated (from hook), URL:", finalUrl);
                  clearStoredTask(); // 任务成功完成，清除存储
                  if (onComplete) {
                    setTimeout(onComplete, 1500); 
                  }
                } else {
                  const errorDetail = eventData.data?.error || '生成文章失败，未收到文件URL或状态为失败';
                  throw new Error(errorDetail);
                }
              }
            } catch (e: any) {
              console.error('Error parsing article event data (in hook):', e);
              setArticleStatusTitle('❌ 处理事件时出错');
              if (e instanceof SyntaxError) {
                 console.warn("Incomplete JSON received (in hook)...");
              } else {
                 setArticleError(`处理文章事件时出错: ${e.message}`);
                 setIsGeneratingArticle(false);
                 clearStoredTask(); // 清除存储的任务
              }
            }
          }
        }
      } // End while loop
      
      // 流结束但仍在生成中，启动轮询
      if (taskId && isGeneratingArticle) {
        console.log('流结束但任务仍在进行中，启动轮询');
        startPolling(payload.userid, taskId);
      }
      // Final check for timeout/errors
      else if (isGeneratingArticle) {
         setIsGeneratingArticle(false);
         if (!generatedArticleUrl && !articleError) {
            setArticleError("文章生成超时或未返回结果");
            setArticleStatusTitle('⏱️ 生成超时');
            clearStoredTask(); // 清除存储的任务
         }
      }

    } catch (error: any) {
      console.error('Error generating article (in hook):', error);
      setArticleError(`生成文章时出错: ${error.message}`);
      setArticleStatusTitle('🔥 生成出错');
      setIsGeneratingArticle(false);
      
      // 如果有任务ID，则启动轮询以获取最终状态
      if (currentTaskId) {
        startPolling(payload.userid, currentTaskId);
      } else {
        clearStoredTask(); // 清除存储的任务
      }
    }
  };

  // 恢复生成函数，用于从存储的任务中恢复
  const resumeGeneration = async () => {
    const storedTask = getStoredTask();
    if (!storedTask) {
      console.error('没有找到存储的任务信息');
      setArticleError('无法恢复生成，没有找到存储的任务信息');
      return;
    }
    
    await resumeTaskStatus(storedTask.userId, storedTask.taskId);
  };

  return {
    isGeneratingArticle,
    articleProgress,
    articleStatusTitle,
    generatedArticleUrl,
    articleError,
    currentTaskId,
    generateArticle,
    resumeGeneration,
  };
} 