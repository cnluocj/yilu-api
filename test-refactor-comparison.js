/**
 * 重构对比测试脚本
 * 用于验证新的模块化Dify实现与原有实现的功能一致性
 */

// 模拟测试数据
const testData = {
  titleRequest: {
    direction: "儿科护理",
    userid: "test-user-123"
  },
  
  articleRequest: {
    name: "张医生",
    unit: "测试医院",
    direction: "儿科护理",
    title: "儿童发热护理指导",
    word_count: "2000",
    style: "生动有趣，角度新颖",
    journal: "健康向导",
    outline: "",
    userid: "test-user-123"
  },

  caseTopicRequest: {
    summary: "患者，男，65岁，因胸痛3小时入院...",
    ext: "心血管内科",
    userid: "test-user-123"
  }
};

// 配置信息
const testConfig = {
  apiKey: process.env.TITLES_DIFY_API_KEY || 'test-key',
  baseUrl: process.env.DIFY_BASE_URL || 'http://sandboxai.jinzhibang.com.cn',
  apiUrl: process.env.DIFY_API_URL || 'http://sandboxai.jinzhibang.com.cn/v1',
};

/**
 * 捕获和比较流输出
 */
async function captureStreamOutput(stream, testName) {
  const events = [];
  const reader = stream.getReader();
  
  console.log(`\\n=== 开始捕获 ${testName} 的输出 ===`);
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.substring(6));
            events.push({
              timestamp: new Date().toISOString(),
              event: eventData.event,
              progress: eventData.data?.progress,
              status: eventData.data?.status,
              title: eventData.data?.title,
              hasResult: !!eventData.data?.result,
              resultLength: eventData.data?.result?.length || 0
            });
            
            console.log(`[${testName}] ${eventData.event} - 进度: ${eventData.data?.progress || 'N/A'}% - 标题: ${eventData.data?.title || 'N/A'}`);
          } catch (e) {
            console.warn(`[${testName}] 解析事件失败:`, line.substring(6));
          }
        }
      }
    }
  } catch (error) {
    console.error(`[${testName}] 流处理出错:`, error);
    events.push({
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
  
  console.log(`=== ${testName} 输出结束，共捕获 ${events.length} 个事件 ===\\n`);
  return events;
}

/**
 * 比较两个事件序列
 */
function compareEventSequences(originalEvents, refactoredEvents, testName) {
  console.log(`\\n### 对比分析: ${testName} ###`);
  console.log(`原始实现事件数: ${originalEvents.length}`);
  console.log(`重构实现事件数: ${refactoredEvents.length}`);
  
  const differences = [];
  const maxLength = Math.max(originalEvents.length, refactoredEvents.length);
  
  for (let i = 0; i < maxLength; i++) {
    const orig = originalEvents[i];
    const refact = refactoredEvents[i];
    
    if (!orig && refact) {
      differences.push(`位置 ${i}: 重构版本多了事件 ${refact.event}`);
    } else if (orig && !refact) {
      differences.push(`位置 ${i}: 原始版本多了事件 ${orig.event}`);
    } else if (orig && refact) {
      if (orig.event !== refact.event) {
        differences.push(`位置 ${i}: 事件类型不一致 - 原始: ${orig.event}, 重构: ${refact.event}`);
      }
      if (orig.progress !== refact.progress) {
        differences.push(`位置 ${i}: 进度不一致 - 原始: ${orig.progress}, 重构: ${refact.progress}`);
      }
      if (orig.status !== refact.status) {
        differences.push(`位置 ${i}: 状态不一致 - 原始: ${orig.status}, 重构: ${refact.status}`);
      }
    }
  }
  
  if (differences.length === 0) {
    console.log(`✅ ${testName}: 事件序列完全一致！`);
  } else {
    console.log(`❌ ${testName}: 发现 ${differences.length} 个差异:`);
    differences.forEach(diff => console.log(`  - ${diff}`));
  }
  
  return differences.length === 0;
}

/**
 * 主测试函数
 */
async function runComparisonTests() {
  console.log('🚀 开始Dify重构对比测试');
  console.log('='.repeat(50));
  
  try {
    // 测试1: 标题生成对比
    console.log('\\n🧪 测试1: 标题生成功能对比');
    console.log('-'.repeat(30));
    
    // 动态导入模块，避免编译时错误
    const originalDify = await import('./src/utils/dify.ts');
    const newDify = await import('./src/utils/dify/index.ts');
    
    console.log('调用原始标题生成API...');
    const originalTitleStream = await originalDify.callDifyWorkflowAPI(testConfig, testData.titleRequest);
    const originalTitleEvents = await captureStreamOutput(originalTitleStream, '原始版本');
    
    console.log('调用重构标题生成API...');
    const refactoredTitleStream = await newDify.callDifyWorkflowAPI(testConfig, testData.titleRequest);
    const refactoredTitleEvents = await captureStreamOutput(refactoredTitleStream, '重构版本');
    
    const titleTestPassed = compareEventSequences(originalTitleEvents, refactoredTitleEvents, '标题生成');
    
    // 测试2: 病案拟题对比 (较简单，风险较低)
    console.log('\\n🧪 测试2: 病案拟题功能对比');
    console.log('-'.repeat(30));
    
    const caseTopicConfig = originalDify.getCaseTopicDifyConfig();
    
    console.log('调用原始病案拟题API...');
    const originalTopicStream = await originalDify.callDifyCaseTopicAPI(caseTopicConfig, testData.caseTopicRequest);
    const originalTopicEvents = await captureStreamOutput(originalTopicStream, '原始版本');
    
    console.log('调用重构病案拟题API...');
    const refactoredTopicStream = await newDify.callDifyCaseTopicAPI(caseTopicConfig, testData.caseTopicRequest);
    const refactoredTopicEvents = await captureStreamOutput(refactoredTopicStream, '重构版本');
    
    const topicTestPassed = compareEventSequences(originalTopicEvents, refactoredTopicEvents, '病案拟题');
    
    // 总结测试结果
    console.log('\\n📊 测试结果总结');
    console.log('='.repeat(50));
    console.log(`标题生成测试: ${titleTestPassed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`病案拟题测试: ${topicTestPassed ? '✅ 通过' : '❌ 失败'}`);
    
    const allTestsPassed = titleTestPassed && topicTestPassed;
    console.log(`\\n${allTestsPassed ? '🎉 所有测试通过！' : '⚠️  存在测试失败，请检查差异'}`);
    
    if (allTestsPassed) {
      console.log('\\n✅ 重构验证完成，新实现与原实现功能一致');
      console.log('可以安全地更新导入引用并清理旧代码');
    } else {
      console.log('\\n❌ 重构验证失败，需要修复差异后重新测试');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    console.error('详细错误信息:', error.stack);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  runComparisonTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runComparisonTests,
  captureStreamOutput,
  compareEventSequences
};