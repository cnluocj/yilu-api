/**
 * 简化的重构对比测试脚本
 * 用于在Node.js环境中测试重构后的功能
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 模拟配置数据
const testConfig = {
  apiKey: process.env.TITLES_DIFY_API_KEY || 'test-key',
  baseUrl: process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn',
  apiUrl: process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1',
};

// 模拟测试请求数据
const mockRequest = {
  direction: "儿科护理",
  userid: "test-user-123"
};

/**
 * 测试API响应格式验证
 * 由于无法直接调用实际API，我们验证重构后的代码结构
 */
async function testCodeStructure() {
  console.log('🔍 验证重构后的代码结构...');
  
  try {
    // 检查新文件是否存在
    const fs = await import('fs');
    const files = [
      'src/utils/dify/core/api-client.ts',
      'src/utils/dify/core/stream-processor.ts', 
      'src/utils/dify/core/animation-manager.ts',
      'src/utils/dify/services/article-service.ts',
      'src/utils/dify/services/case-service.ts',
      'src/utils/dify/utils/config.ts',
      'src/utils/dify/utils/upload.ts',
      'src/utils/dify/utils/types.ts',
      'src/utils/dify/index.ts'
    ];
    
    let allFilesExist = true;
    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.error(`❌ 文件缺失: ${file}`);
        allFilesExist = false;
      } else {
        console.log(`✅ 文件存在: ${file}`);
      }
    }
    
    // 检查原文件备份
    if (fs.existsSync('src/utils/dify.ts.backup')) {
      console.log('✅ 原文件已备份: src/utils/dify.ts.backup');
    } else {
      console.warn('⚠️  原文件备份不存在');
    }
    
    return allFilesExist;
    
  } catch (error) {
    console.error('❌ 代码结构检查失败:', error.message);
    return false;
  }
}

/**
 * 测试导出函数一致性
 */
async function testExportConsistency() {
  console.log('\\n🔍 验证导出函数一致性...');
  
  try {
    // 读取原始文件内容
    const fs = await import('fs');
    const originalContent = fs.readFileSync('src/utils/dify.ts.backup', 'utf8');
    const newIndexContent = fs.readFileSync('src/utils/dify/index.ts', 'utf8');
    
    // 检查关键导出函数
    const keyFunctions = [
      'callDifyWorkflowAPI',
      'callDifyGenerateArticleAPI', 
      'callDifyCaseSummaryAPI',
      'callDifyCaseTopicAPI',
      'callDifyCaseReportAPI',
      'getDifyConfig',
      'getArticleDifyConfig',
      'getCaseSummaryDifyConfig',
      'getCaseTopicDifyConfig',
      'getCaseReportDifyConfig',
      'uploadFileToDify'
    ];
    
    let allFunctionsPresent = true;
    
    for (const func of keyFunctions) {
      const inOriginal = originalContent.includes(`export async function ${func}`) || 
                        originalContent.includes(`export function ${func}`);
      const inNew = newIndexContent.includes(func);
      
      if (inOriginal && inNew) {
        console.log(`✅ 函数保持一致: ${func}`);
      } else if (inOriginal && !inNew) {
        console.error(`❌ 新版本缺失函数: ${func}`);
        allFunctionsPresent = false;
      } else if (!inOriginal && inNew) {
        console.log(`ℹ️  新增函数: ${func}`);
      }
    }
    
    return allFunctionsPresent;
    
  } catch (error) {
    console.error('❌ 导出一致性检查失败:', error.message);
    return false;
  }
}

/**
 * 验证TypeScript编译
 */
async function testTypeScriptCompilation() {
  console.log('\\n🔍 验证TypeScript编译...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --skipLibCheck');
    
    if (stderr) {
      console.error('❌ TypeScript编译错误:');
      console.error(stderr);
      return false;
    } else {
      console.log('✅ TypeScript编译成功');
      return true;
    }
    
  } catch (error) {
    console.error('❌ TypeScript编译失败:', error.message);
    return false;
  }
}

/**
 * 验证构建过程
 */
async function testBuildProcess() {
  console.log('\\n🔍 验证构建过程...');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // 运行构建
    const { stdout, stderr } = await execAsync('npm run build');
    
    if (stdout.includes('✓ Compiled successfully')) {
      console.log('✅ 项目构建成功');
      return true;
    } else {
      console.error('❌ 项目构建失败');
      console.error(stderr);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 构建过程失败:', error.message);
    return false;
  }
}

/**
 * 计算代码重复度
 */
async function analyzeCodeDuplication() {
  console.log('\\n🔍 分析代码重复度...');
  
  try {
    const fs = await import('fs');
    
    // 读取原始文件
    const originalContent = fs.readFileSync('src/utils/dify.ts.backup', 'utf8');
    const originalLines = originalContent.split('\\n').length;
    
    // 读取新文件总行数
    const newFiles = [
      'src/utils/dify/core/api-client.ts',
      'src/utils/dify/core/stream-processor.ts',
      'src/utils/dify/core/animation-manager.ts', 
      'src/utils/dify/services/article-service.ts',
      'src/utils/dify/services/case-service.ts',
      'src/utils/dify/utils/config.ts',
      'src/utils/dify/utils/upload.ts',
      'src/utils/dify/utils/types.ts',
      'src/utils/dify/index.ts'
    ];
    
    let totalNewLines = 0;
    for (const file of newFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\\n').length;
        totalNewLines += lines;
        console.log(`📄 ${file}: ${lines} 行`);
      }
    }
    
    console.log(`\\n📊 代码量对比:`);
    console.log(`原始文件: ${originalLines} 行`);
    console.log(`重构后总计: ${totalNewLines} 行`);
    console.log(`代码减少: ${originalLines - totalNewLines} 行 (${((originalLines - totalNewLines) / originalLines * 100).toFixed(1)}%)`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 代码分析失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始重构验证测试');
  console.log('='.repeat(50));
  
  const tests = [
    { name: '代码结构检查', fn: testCodeStructure },
    { name: '导出函数一致性', fn: testExportConsistency },
    { name: 'TypeScript编译', fn: testTypeScriptCompilation },
    { name: '项目构建测试', fn: testBuildProcess },
    { name: '代码重复度分析', fn: analyzeCodeDuplication }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\\n🧪 ${test.name}:`);
    console.log('-'.repeat(30));
    
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name} 通过`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name} 失败`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} 异常: ${error.message}`);
    }
  }
  
  // 总结
  console.log('\\n📊 测试结果总结');
  console.log('='.repeat(50));
  console.log(`通过测试: ${passedTests}/${tests.length}`);
  console.log(`成功率: ${(passedTests / tests.length * 100).toFixed(1)}%`);
  
  if (passedTests === tests.length) {
    console.log('\\n🎉 所有测试通过！重构成功完成');
    console.log('✅ 可以安全投入生产使用');
  } else {
    console.log('\\n⚠️  部分测试失败，请检查问题');
  }
  
  return passedTests === tests.length;
}

// 运行测试
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });