/**
 * 测试文章管理API
 * 执行方式: node test-articles.js
 */

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = process.env.QUOTA_API_KEY || 'your_api_key_here';
const USER_ID = 'test_user_123';

// 异步包装函数
async function main() {
  try {
    console.log('=== 开始测试文章API ===');
    console.log(`使用API密钥: ${API_KEY}`);
    console.log(`使用用户ID: ${USER_ID}`);
    
    // 测试获取文章列表
    await testGetArticles();
    
    // 测试删除文章
    // 注意：需要替换为实际存在的文章ID
    const articleIdToDelete = '1'; // 替换为实际的文章ID
    await testDeleteArticle(articleIdToDelete);
    
    console.log('=== 文章API测试完成 ===');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

/**
 * 测试获取文章列表
 */
async function testGetArticles() {
  console.log('\n--- 测试获取文章列表 ---');
  
  try {
    // 构建请求URL
    const url = new URL('/api/articles', API_BASE_URL);
    url.searchParams.append('user_id', USER_ID);
    url.searchParams.append('limit', '10');
    url.searchParams.append('offset', '0');
    
    console.log(`请求URL: ${url.toString()}`);
    
    // 发送请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    // 解析响应
    const result = await response.json();
    
    // 输出结果
    console.log(`状态码: ${response.status}`);
    console.log('响应数据:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log(`总文章数: ${result.total}`);
      console.log(`已返回文章数: ${result.records.length}`);
      
      // 输出文章标题列表
      if (result.records.length > 0) {
        console.log('文章列表:');
        result.records.forEach((article, index) => {
          console.log(`${index + 1}. ID: ${article.id}, 标题: ${article.title || '无标题'}`);
        });
      } else {
        console.log('没有找到文章');
      }
    } else {
      console.log('获取文章列表失败');
    }
  } catch (error) {
    console.error('获取文章列表出错:', error);
  }
}

/**
 * 测试删除文章
 */
async function testDeleteArticle(articleId) {
  console.log('\n--- 测试删除文章 ---');
  
  try {
    // 检查文章ID
    if (!articleId) {
      console.log('跳过删除测试: 需要提供有效的文章ID');
      return;
    }
    
    // 构建请求URL
    const url = new URL('/api/articles', API_BASE_URL);
    url.searchParams.append('user_id', USER_ID);
    url.searchParams.append('article_id', articleId);
    
    console.log(`请求URL: ${url.toString()}`);
    
    // 发送请求
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    // 解析响应
    const result = await response.json();
    
    // 输出结果
    console.log(`状态码: ${response.status}`);
    console.log('响应数据:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log(`文章(ID: ${articleId})已成功删除`);
    } else {
      console.log(`删除文章失败: ${result.error || '未知错误'}`);
      if (result.message) {
        console.log(`错误信息: ${result.message}`);
      }
    }
  } catch (error) {
    console.error('删除文章出错:', error);
  }
}

// 执行测试
main().catch(error => {
  console.error('执行测试脚本时出错:', error);
}); 