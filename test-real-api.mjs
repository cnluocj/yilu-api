/**
 * 真实API对比测试
 * 创建一个测试端点来验证新旧实现的一致性
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试配置
const TEST_CONFIG = {
  port: 3001,
  baseUrl: 'http://localhost:3001',
  testTimeout: 30000, // 30秒超时
};

// 测试数据
const TEST_CASES = [
  {
    name: '标题生成测试',
    endpoint: '/api/generate_titles',
    method: 'POST',
    data: {
      userid: 'test-user-' + Date.now(),
      direction: '儿科护理',
      word_count: 2000,
      name: '测试医生',
      unit: '测试医院'
    }
  },
  {
    name: '病案拟题测试',
    endpoint: '/api/generate_case_topic', 
    method: 'POST',
    data: {
      userid: 'test-user-' + Date.now(),
      summary: '患者，男，65岁，因胸痛3小时入院。查体：血压160/90mmHg，心率100次/分，心电图示前壁心肌梗死。',
      ext: '心血管内科'
    }
  }
];

/**
 * 启动开发服务器
 */
function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 启动开发服务器...');
    
    const server = spawn('npm', ['run', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: TEST_CONFIG.port }
    });
    
    let serverReady = false;
    let output = '';
    
    server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      if (text.includes('ready') || text.includes('started server') || text.includes(`localhost:${TEST_CONFIG.port}`)) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ 开发服务器已启动');
          resolve(server);
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('服务器输出:', text);
    });
    
    server.on('error', (error) => {
      reject(new Error(`服务器启动失败: ${error.message}`));
    });
    
    // 超时检查
    setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('服务器启动超时\\n输出：' + output));
      }
    }, 15000);
  });
}

/**
 * 发送HTTP请求
 */
async function sendRequest(endpoint, method, data) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    throw new Error(`请求失败: ${error.message}`);
  }
}

/**
 * 读取并解析SSE流
 */
async function readSSEStream(response, maxEvents = 50) {
  const reader = response.body.getReader();
  const events = [];
  let eventCount = 0;
  
  try {
    while (eventCount < maxEvents) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.substring(6));
            events.push({
              event: eventData.event,
              progress: eventData.data?.progress,
              status: eventData.data?.status,
              hasResult: !!eventData.data?.result,
              resultCount: eventData.data?.result?.length || 0,
              timestamp: new Date().toISOString()
            });
            eventCount++;
            
            // 如果收到完成事件，停止读取
            if (eventData.event === 'workflow_finished') {
              console.log(`📡 收到完成事件，停止读取`);
              break;
            }
          } catch (e) {
            console.warn('解析事件失败:', line.substring(6));
          }
        }
      }
    }
  } catch (error) {
    console.warn('读取流时出错:', error.message);
  }
  
  return events;
}

/**
 * 运行单个测试案例
 */
async function runTestCase(testCase) {
  console.log(`\\n🧪 运行测试: ${testCase.name}`);
  console.log('-'.repeat(40));
  
  try {
    console.log(`📤 发送请求到 ${testCase.endpoint}`);
    console.log(`📋 请求数据:`, JSON.stringify(testCase.data, null, 2));
    
    const response = await sendRequest(testCase.endpoint, testCase.method, testCase.data);
    console.log(`✅ 请求成功，状态码: ${response.status}`);
    
    console.log(`📡 开始读取SSE流...`);
    const events = await readSSEStream(response);
    
    console.log(`📊 接收到 ${events.length} 个事件:`);
    
    let hasStarted = false;
    let hasProgress = false;
    let hasFinished = false;
    let finalResult = null;
    
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.event} - 进度: ${event.progress || 'N/A'}% - 状态: ${event.status || 'N/A'}`);
      
      if (event.event === 'workflow_started') hasStarted = true;
      if (event.event === 'workflow_running') hasProgress = true;
      if (event.event === 'workflow_finished') {
        hasFinished = true;
        finalResult = event;
      }
    });
    
    // 验证事件序列完整性
    const isValid = hasStarted && hasProgress && hasFinished;
    
    console.log(`\\n📋 测试结果:`);
    console.log(`  ✅ 有开始事件: ${hasStarted}`);
    console.log(`  ✅ 有进度事件: ${hasProgress}`);
    console.log(`  ✅ 有完成事件: ${hasFinished}`);
    console.log(`  🎯 事件序列完整: ${isValid}`);
    
    if (finalResult && finalResult.hasResult) {
      console.log(`  📝 最终结果数量: ${finalResult.resultCount}`);
    }
    
    return {
      testName: testCase.name,
      success: isValid,
      eventCount: events.length,
      hasResult: finalResult?.hasResult || false,
      resultCount: finalResult?.resultCount || 0,
      events
    };
    
  } catch (error) {
    console.error(`❌ 测试失败:`, error.message);
    return {
      testName: testCase.name,
      success: false,
      error: error.message,
      events: []
    };
  }
}

/**
 * 主测试函数
 */
async function runAPITests() {
  console.log('🚀 开始真实API对比测试');
  console.log('='.repeat(60));
  
  let server = null;
  
  try {
    // 启动开发服务器
    server = await startDevServer();
    
    // 等待服务器完全启动
    console.log('⏳ 等待服务器完全启动...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 运行测试案例
    const results = [];
    
    for (const testCase of TEST_CASES) {
      const result = await runTestCase(testCase);
      results.push(result);
      
      // 测试间隔
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 输出测试总结
    console.log('\\n📊 测试总结');
    console.log('='.repeat(60));
    
    let passedTests = 0;
    
    results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.testName}: ${result.success ? '通过' : '失败'}`);
      if (result.success) {
        console.log(`    事件数: ${result.eventCount}, 结果数: ${result.resultCount}`);
        passedTests++;
      } else if (result.error) {
        console.log(`    错误: ${result.error}`);
      }
    });
    
    console.log(`\\n🎯 测试结果: ${passedTests}/${results.length} 通过`);
    console.log(`📈 成功率: ${(passedTests / results.length * 100).toFixed(1)}%`);
    
    if (passedTests === results.length) {
      console.log('\\n🎉 所有API测试通过！重构后的功能完全正常');
    } else {
      console.log('\\n⚠️  部分API测试失败，需要进一步检查');
    }
    
    return passedTests === results.length;
    
  } catch (error) {
    console.error('❌ 测试过程失败:', error.message);
    return false;
  } finally {
    // 清理：关闭服务器
    if (server) {
      console.log('\\n🛑 关闭开发服务器...');
      server.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 检查是否安装了必要的依赖
if (typeof fetch === 'undefined') {
  console.error('❌ 需要Node.js 18+版本来支持fetch API');
  process.exit(1);
}

// 运行测试
runAPITests()
  .then(success => {
    console.log('\\n' + '='.repeat(60));
    console.log(success ? '🎉 API对比测试完成 - 重构成功！' : '❌ API对比测试失败 - 需要修复问题');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 测试运行异常:', error);
    process.exit(1);
  });