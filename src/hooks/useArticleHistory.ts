import { useState, useCallback } from 'react';
import { ArticleRecord } from '../app/article-generator/page'; // Adjust import path

// Potentially get JWT from a context or helper
const TEMP_SYSTEM_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJzeXN0ZW0t5ZCO56uvIiwicm9sZSI6InN5c3RlbSIsInBlcm1pc3Npb25zIjpbInF1b3RhOnJlYWQiLCJxdW90YTp3cml0ZSIsImFydGljbGU6cmVhZCIsImFydGljbGU6d3JpdGUiLCJhcnRpY2xlOmRlbGV0ZSJdLCJpYXQiOjE3NDQyNDg3NDEsImV4cCI6MTc0Njg0MDc0MX0.aKnFmck6xwt4MMbegrLsssF7hZaZSrHbsgrjB24XJys';

interface HistoryResult {
  isLoadingHistory: boolean;
  historyArticles: ArticleRecord[];
  historyError: string | null;
  loadHistory: (userId: string) => Promise<void>;
}

export function useArticleHistory(): HistoryResult {
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [historyArticles, setHistoryArticles] = useState<ArticleRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async (userId: string) => {
    if (!userId) {
      console.log("User ID not provided, cannot load history.");
      setHistoryArticles([]);
      setIsLoadingHistory(false);
      return;
    }

    console.log("Attempting to load article history (from hook) for:", userId);
    setIsLoadingHistory(true);
    setHistoryError(null); 

    try {
      const response = await fetch(`/api/articles?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Accept': '*/*', 
          'Authorization': `Bearer ${TEMP_SYSTEM_JWT}` // Use JWT
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      console.log("History data received (in hook):", data);
      setHistoryArticles(data.records || []);
      
    } catch (error: any) {
      console.error('Error loading article history (in hook):', error);
      setHistoryError(`加载历史文章失败: ${error.message}`);
      setHistoryArticles([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []); // Empty dependency array for useCallback, as JWT is constant for now

  return {
    isLoadingHistory,
    historyArticles,
    historyError,
    loadHistory,
  };
} 