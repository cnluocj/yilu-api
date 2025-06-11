/**
 * 手动API测试脚本
 * 用于测试重构后的API功能
 */

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:9090', // 使用默认开发端口
  testTimeout: 30000,
};

// 测试数据
const TEST_CASES = [
  {
    name: '标题生成API测试',
    endpoint: '/api/generate_titles',
    method: 'POST',
    data: {
      userid: 'test-user-' + Date.now(),
      direction: '儿科护理',
      word_count: 2000,
      name: '测试医生',
      unit: '测试医院'
    }
  }
];

/**
 * 发送HTTP请求并读取SSE流
 */
async function testAPI(testCase) {
  console.log(`\\n🧪 测试: ${testCase.name}`);
  console.log('-'.repeat(40));
  
  const url = `${TEST_CONFIG.baseUrl}${testCase.endpoint}`;
  console.log(`📤 请求URL: ${url}`);
  console.log(`📋 请求数据:`, JSON.stringify(testCase.data, null, 2));
  
  try {
    const response = await fetch(url, {
      method: testCase.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.data)
    });
    
    console.log(`📡 响应状态: ${response.status} ${response.statusText}`);
    console.log(`📡 响应头:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // 读取SSE流
    const reader = response.body.getReader();
    const events = [];
    let eventCount = 0;
    const maxEvents = 30;
    
    console.log(`📡 开始读取SSE流...`);
    
    try {
      while (eventCount < maxEvents) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`📡 流结束`);
          break;
        }
        
        const chunk = new TextDecoder().decode(value);
        console.log(`📦 收到数据块:`, chunk.replace(/\\n/g, '\\\\n'));
        
        const lines = chunk.split('\\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              events.push(eventData);
              eventCount++;
              
              console.log(`📨 事件 ${eventCount}: ${eventData.event} - 进度: ${eventData.data?.progress || 'N/A'}%`);
              
              if (eventData.event === 'workflow_finished') {
                console.log(`🏁 收到完成事件，结果数量: ${eventData.data?.result?.length || 0}`);
                return {
                  success: true,
                  events,
                  resultCount: eventData.data?.result?.length || 0
                };
              }
            } catch (e) {
              console.warn('⚠️  解析事件失败:', line.substring(6));
            }
          }
        }
      }
      
      return {
        success: events.length > 0,
        events,
        resultCount: 0
      };
      
    } catch (streamError) {
      console.error('❌ 读取流时出错:', streamError.message);
      return {
        success: false,
        error: streamError.message,
        events
      };
    }
    
  } catch (error) {
    console.error(`❌ 请求失败:`, error.message);
    return {
      success: false,
      error: error.message,
      events: []
    };
  }
}

/**
 * 主测试函数
 */
async function runManualTest() {
  console.log('🚀 手动API功能测试');
  console.log('='.repeat(50));
  console.log('请确保开发服务器正在运行: npm run dev');
  console.log('='.repeat(50));
  
  // 先测试服务器是否可访问
  try {
    console.log('🔍 检查服务器状态...');
    const healthResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/health`);
    console.log(`✅ 服务器状态: ${healthResponse.status}`);
  } catch (error) {
    console.error('❌ 服务器不可访问:', error.message);
    console.log('\\n请先运行: npm run dev');
    return false;
  }
  
  // 运行测试
  let allPassed = true;
  
  for (const testCase of TEST_CASES) {
    const result = await testCase(testCase);
    
    console.log(`\\n📊 ${testCase.name} 结果:`);
    console.log(`  成功: ${result.success}`);
    console.log(`  事件数: ${result.events.length}`);
    console.log(`  结果数: ${result.resultCount}`);
    
    if (!result.success) {
      allPassed = false;
      if (result.error) {
        console.log(`  错误: ${result.error}`);
      }
    }
    
    // 测试间隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\\n='.repeat(50));
  console.log(allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败');
  
  return allPassed;
}

// 检查环境
if (typeof fetch === 'undefined') {
  console.error('❌ 需要Node.js 18+版本');
  process.exit(1);
}

// 修复testAPI调用
async function runTest() {
  console.log('🚀 手动API功能测试');
  console.log('='.repeat(50));
  
  // 检查服务器
  try {
    const healthResponse = await fetch(`${TEST_CONFIG.baseUrl}/api/health`);
    console.log(`✅ 服务器状态: ${healthResponse.status}`);
  } catch (error) {
    console.error('❌ 服务器不可访问，请先运行: npm run dev');
    return false;
  }
  
  // 运行标题生成测试
  const result = await testAPI(TEST_CASES[0]);
  
  console.log('\\n📊 测试总结:');
  console.log(`成功: ${result.success}`);
  console.log(`事件数: ${result.events.length}`);
  console.log(`结果数: ${result.resultCount || 0}`);
  
  return result.success;
}

runTest()
  .then(success => {
    console.log(success ? '\\n🎉 API测试成功！重构后功能正常' : '\\n❌ API测试失败');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试异常:', error);
    process.exit(1);
  });