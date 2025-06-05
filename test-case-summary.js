/**
 * 病案总结API测试脚本
 * 
 * 使用方法:
 * node test-case-summary.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_BASE_URL = 'http://localhost:9090';
const TEST_USER_ID = 'test_user_case_summary';

/**
 * 创建测试用的图片文件（模拟）
 */
function createTestImageFile() {
  // 创建一个简单的测试图片数据（1x1像素的PNG）
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // image data
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return new Blob([pngData], { type: 'image/png' });
}

/**
 * 测试病案总结API
 */
async function testCaseSummaryAPI() {
  console.log('🏥 开始测试病案总结API...\n');
  
  try {
    // 准备测试数据
    const formData = new FormData();
    formData.append('userid', TEST_USER_ID);
    formData.append('name', '测试医生');
    formData.append('unit', '测试科室');
    
    // 添加测试图片文件
    const testImage = createTestImageFile();
    formData.append('files', testImage, 'test-case-image.png');
    
    console.log('📋 测试参数:');
    console.log(`- 用户ID: ${TEST_USER_ID}`);
    console.log(`- 医生姓名: 测试医生`);
    console.log(`- 科室: 测试科室`);
    console.log(`- 文件数量: 1`);
    console.log('');
    
    // 发送请求
    console.log('🚀 发送病案总结请求...');
    const response = await fetch(`${API_BASE_URL}/api/generate_case_summary`, {
      method: 'POST',
      body: formData
    });
    
    console.log(`📡 响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }
    
    // 获取任务ID
    const taskId = response.headers.get('X-Task-ID');
    console.log(`🆔 任务ID: ${taskId}`);
    console.log('');
    
    // 处理SSE流
    console.log('📺 开始接收SSE事件流...');
    console.log('----------------------------------------');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;
    let results = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.substring(6));
            eventCount++;
            
            console.log(`[事件 ${eventCount}] ${eventData.event}`);
            
            if (eventData.event === 'workflow_started') {
              console.log(`  ✅ 工作流开始`);
              console.log(`  📊 进度: ${eventData.data?.progress || 0}%`);
            } else if (eventData.event === 'workflow_running') {
              const progress = eventData.data?.progress || 0;
              const title = eventData.data?.title || '处理中';
              console.log(`  🔄 ${title} (${progress}%)`);
            } else if (eventData.event === 'text_chunk') {
              const text = eventData.data?.text || '';
              if (text) {
                results.push(text);
                console.log(`  📝 文本片段: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
              }
            } else if (eventData.event === 'workflow_finished') {
              console.log(`  🎉 工作流完成`);
              console.log(`  📊 最终进度: ${eventData.data?.progress || 100}%`);
              console.log(`  ⏱️  耗时: ${eventData.data?.elapsed_time || 'unknown'}秒`);
              console.log(`  📋 状态: ${eventData.data?.status || 'unknown'}`);
              
              if (eventData.data?.result && eventData.data.result.length > 0) {
                console.log(`  📄 结果数量: ${eventData.data.result.length}`);
                console.log('');
                console.log('🎯 最终结果:');
                console.log('========================================');
                eventData.data.result.forEach((result, index) => {
                  console.log(`${index + 1}. ${result}`);
                });
                console.log('========================================');
              } else if (results.length > 0) {
                console.log('');
                console.log('🎯 累积结果:');
                console.log('========================================');
                console.log(results.join(''));
                console.log('========================================');
              }
            }
          } catch (e) {
            console.log(`  ❌ 解析事件失败: ${e.message}`);
          }
        }
      }
    }
    
    console.log('');
    console.log(`✅ 测试完成！共接收 ${eventCount} 个事件`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.cause) {
      console.error('原因:', error.cause);
    }
    
    process.exit(1);
  }
}

/**
 * 测试配额查询
 */
async function testQuotaQuery() {
  console.log('\n💰 测试配额查询...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/quota?user_id=${TEST_USER_ID}&service_id=generate_case_summary`);
    
    if (response.ok) {
      const quotaData = await response.json();
      console.log('📊 配额信息:', quotaData);
    } else {
      console.log('⚠️  配额查询失败:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('⚠️  配额查询出错:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 病案总结API测试工具');
  console.log('========================\n');
  
  // 检查服务器是否运行
  try {
    const healthCheck = await fetch(`${API_BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('健康检查失败');
    }
    console.log('✅ 服务器运行正常\n');
  } catch (error) {
    console.log('❌ 无法连接到服务器，请确保服务器在 http://localhost:9090 运行');
    console.log('   启动命令: npm run dev\n');
    process.exit(1);
  }
  
  // 运行测试
  await testQuotaQuery();
  await testCaseSummaryAPI();
  
  console.log('\n🎉 所有测试完成！');
}

// 运行测试
main().catch(console.error);
