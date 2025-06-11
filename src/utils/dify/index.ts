// 重新导出所有配置函数（保持向后兼容）
export {
  getDifyConfig,
  getArticleDifyConfig,
  getCaseSummaryDifyConfig,
  getCaseTopicDifyConfig,
  getCaseReportDifyConfig,
  getCaseParagraphOptimizeDifyConfig
} from './utils/config';

// 重新导出文件上传函数（保持向后兼容）
export { uploadFileToDify } from './utils/upload';

// 导出新的服务类
export { ArticleService } from './services/article-service';
export { CaseService } from './services/case-service';

// 导出核心组件（用于高级用法）
export { DifyAPIClient } from './core/api-client';
export { SSEStreamProcessor } from './core/stream-processor';
export { AnimationManager } from './core/animation-manager';

// 导出类型定义
export * from './utils/types';

// 保持向后兼容的函数封装
import { GenerateTitlesRequest, GenerateArticleRequest, GenerateCaseSummaryRequest, GenerateCaseTopicRequest, GenerateCaseReportRequest, OptimizeCaseParagraphRequest, DifyAPIConfig } from '@/types';
import { ArticleService } from './services/article-service';
import { CaseService } from './services/case-service';
import { getDifyConfig, getArticleDifyConfig, getCaseSummaryDifyConfig, getCaseTopicDifyConfig, getCaseReportDifyConfig, getCaseParagraphOptimizeDifyConfig } from './utils/config';

/**
 * 生成标题API - 向后兼容封装
 */
export async function callDifyWorkflowAPI(
  config: DifyAPIConfig,
  request: GenerateTitlesRequest
): Promise<ReadableStream<Uint8Array>> {
  const service = new ArticleService(config);
  return service.generateTitles(request);
}

/**
 * 生成文章API - 向后兼容封装
 */
export async function callDifyGenerateArticleAPI(
  config: DifyAPIConfig,
  request: GenerateArticleRequest
): Promise<ReadableStream<Uint8Array>> {
  const service = new ArticleService(config);
  return service.generateArticle(request);
}

/**
 * 生成病案摘要API - 向后兼容封装
 */
export async function callDifyCaseSummaryAPI(
  config: DifyAPIConfig,
  request: GenerateCaseSummaryRequest
): Promise<ReadableStream<Uint8Array>> {
  const service = new CaseService(config);
  return service.generateCaseSummary(request);
}

/**
 * 生成病案拟题API - 向后兼容封装
 */
export async function callDifyCaseTopicAPI(
  config: DifyAPIConfig,
  request: GenerateCaseTopicRequest
): Promise<ReadableStream<Uint8Array>> {
  const service = new CaseService(config);
  return service.generateCaseTopic(request);
}

/**
 * 生成病案报告API - 向后兼容封装
 */
export async function callDifyCaseReportAPI(
  config: DifyAPIConfig,
  request: GenerateCaseReportRequest
): Promise<ReadableStream<Uint8Array>> {
  const service = new CaseService(config);
  return service.generateCaseReport(request);
}

/**
 * 病案段落优化API - 向后兼容封装
 */
export async function callDifyCaseParagraphOptimizeAPI(
  config: DifyAPIConfig,
  request: OptimizeCaseParagraphRequest
): Promise<ReadableStream<Uint8Array>> {
  const service = new CaseService(config);
  return service.optimizeCaseParagraph(request);
}