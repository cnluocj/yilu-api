import { DifyAPIConfig } from '@/types';

/**
 * 获取默认Dify配置（标题生成）
 */
export function getDifyConfig(): DifyAPIConfig {
  const config = {
    apiKey: process.env.TITLES_DIFY_API_KEY || '',
    baseUrl: process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn',
    apiUrl: process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1',
  };
  
  console.log(`[${new Date().toISOString()}] Dify配置: baseUrl=${config.baseUrl}`);
  console.log(`[${new Date().toISOString()}] Dify配置: apiUrl=${config.apiUrl}`);
  // 不打印API密钥，以保护安全
  
  return config;
}

/**
 * 获取生成文章专用的Dify配置
 */
export function getArticleDifyConfig(): DifyAPIConfig {
  // 文章生成专用API Key
  const apiKey = process.env.ARTICLE_DIFY_API_KEY || '';

  // 使用与标题生成相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案总结专用的Dify配置
 */
export function getCaseSummaryDifyConfig(): DifyAPIConfig {
  // 病案总结专用API Key
  const apiKey = process.env.CASE_SUMMARY_DIFY_API_KEY || 'app-TFflIaFV2yYVRljnhiypkPTy';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案拟题专用的Dify配置
 */
export function getCaseTopicDifyConfig(): DifyAPIConfig {
  // 病案拟题专用API Key
  const apiKey = process.env.CASE_TOPIC_DIFY_API_KEY || 'app-h0GZLxEkF2uDP5l8CnvoY7ZH';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案报告专用的Dify配置
 */
export function getCaseReportDifyConfig(): DifyAPIConfig {
  // 病案报告专用API Key
  const apiKey = process.env.CASE_REPORT_DIFY_API_KEY || 'app-gWH39gHNorohRp018C7Wll0Q';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}

/**
 * 获取病案段落优化专用的Dify配置
 */
export function getCaseParagraphOptimizeDifyConfig(): DifyAPIConfig {
  // 病案段落优化专用API Key
  const apiKey = process.env.CASE_PARAGRAPH_OPTIMIZE_DIFY_API_KEY || 'app-uMCwPVVAMmWZAoNRwokV7BVh';

  // 使用相同的baseUrl
  const baseUrl = process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn';
  const apiUrl = process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1';

  return {
    apiKey,
    baseUrl,
    apiUrl,
  };
}