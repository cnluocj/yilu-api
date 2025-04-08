/**
 * 测试配额管理API
 * 运行方式: node test-quota.js
 */

const fetch = require('node-fetch');
const readline = require('readline');

// 配置
const API_BASE_URL = 'http://localhost:3000/api';
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 登录并获取JWT令牌
async function login(username, password) {
  try {
    console.log(`\n正在登录系统 (${username})...`);
    
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('\n登录失败:');
      console.error(JSON.stringify(result, null, 2));
      return null;
    }
    
    console.log('\n登录成功!');
    console.log(`用户: ${result.data.user.username}`);
    console.log(`角色: ${result.data.user.role}`);
    console.log(`权限: ${result.data.user.permissions.join(', ')}`);
    
    return {
      token: result.data.token,
      user: result.data.user
    };
  } catch (error) {
    console.error('\n登录过程中发生错误:', error.message);
    return null;
  }
}

// 获取用户配额
async function getUserQuota(userId, serviceId, token) {
  try {
    console.log(`\n正在查询用户 ${userId} 的 ${serviceId} 服务配额...`);
    
    const response = await fetch(`${API_BASE_URL}/quota?user_id=${userId}&service_id=${serviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('\n查询结果:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('\n查询失败:');
      console.error(JSON.stringify(result, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('\n查询过程中发生错误:', error.message);
  }
}

// 添加用户配额
async function addUserQuota(userId, serviceId, amount, token) {
  try {
    console.log(`\n正在为用户 ${userId} 添加 ${amount} 单位的 ${serviceId} 服务配额...`);
    
    const response = await fetch(`${API_BASE_URL}/quota`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_id: userId,
        service_id: serviceId,
        amount: amount
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('\n添加成功:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('\n添加失败:');
      console.error(JSON.stringify(result, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('\n添加过程中发生错误:', error.message);
  }
}

// 主菜单
function showMainMenu() {
  console.log('\n========== 配额管理测试 ==========');
  console.log('1. 查询用户配额');
  console.log('2. 添加用户配额');
  console.log('3. 重新登录');
  console.log('0. 退出');
  console.log('==================================');
}

// 主程序
async function main() {
  console.log('欢迎使用配额管理测试工具!');
  
  // 登录获取JWT令牌
  console.log('请登录系统:');
  const username = await new Promise(resolve => {
    rl.question(`用户名 (默认: ${DEFAULT_USERNAME}): `, answer => resolve(answer || DEFAULT_USERNAME));
  });
  
  const password = await new Promise(resolve => {
    rl.question(`密码 (默认: ${DEFAULT_PASSWORD}): `, answer => resolve(answer || DEFAULT_PASSWORD));
  });
  
  let authData = await login(username, password);
  
  if (!authData) {
    console.error('登录失败，无法继续测试');
    rl.close();
    return;
  }
  
  let running = true;
  
  while (running) {
    showMainMenu();
    
    const choice = await new Promise(resolve => {
      rl.question('请选择操作: ', answer => resolve(answer));
    });
    
    switch (choice) {
      case '1':
        const queryUserId = await new Promise(resolve => {
          rl.question('用户ID: ', answer => resolve(answer));
        });
        
        const queryServiceId = await new Promise(resolve => {
          rl.question('服务ID (translation, image_generation, voice): ', answer => resolve(answer));
        });
        
        await getUserQuota(queryUserId, queryServiceId, authData.token);
        break;
        
      case '2':
        const addUserId = await new Promise(resolve => {
          rl.question('用户ID: ', answer => resolve(answer));
        });
        
        const addServiceId = await new Promise(resolve => {
          rl.question('服务ID (translation, image_generation, voice): ', answer => resolve(answer));
        });
        
        const amountStr = await new Promise(resolve => {
          rl.question('配额数量: ', answer => resolve(answer));
        });
        
        const amount = parseInt(amountStr, 10);
        
        if (isNaN(amount) || amount <= 0) {
          console.error('配额数量必须为正整数!');
          break;
        }
        
        await addUserQuota(addUserId, addServiceId, amount, authData.token);
        break;
      
      case '3':
        console.log('\n重新登录');
        const newUsername = await new Promise(resolve => {
          rl.question(`用户名 (默认: ${DEFAULT_USERNAME}): `, answer => resolve(answer || DEFAULT_USERNAME));
        });
        
        const newPassword = await new Promise(resolve => {
          rl.question(`密码 (默认: ${DEFAULT_PASSWORD}): `, answer => resolve(answer || DEFAULT_PASSWORD));
        });
        
        authData = await login(newUsername, newPassword);
        
        if (!authData) {
          console.error('登录失败');
        }
        break;
        
      case '0':
        console.log('退出程序');
        running = false;
        break;
        
      default:
        console.log('无效选项，请重新选择');
    }
  }
  
  rl.close();
}

// 运行主程序
main().catch(error => {
  console.error('程序执行出错:', error);
  rl.close();
}); 