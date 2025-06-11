import { DifyAPIConfig } from '@/types';

/**
 * 上传文件到Dify
 * 从原有uploadFileToDify函数提取的逻辑
 */
export async function uploadFileToDify(file: any, config: DifyAPIConfig): Promise<string> {
  console.log(`[${new Date().toISOString()}] 开始上传文件到Dify: ${file.name || 'unknown'}`);

  // 创建FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', 'api-user');

  console.log(`[${new Date().toISOString()}] 准备上传到: ${config.apiUrl}/files/upload`);

  try {
    const uploadResponse = await fetch(`${config.apiUrl}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: formData
    });

    console.log(`[${new Date().toISOString()}] 上传响应状态: ${uploadResponse.status} ${uploadResponse.statusText}`);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`[${new Date().toISOString()}] 文件上传失败: ${uploadResponse.status} - ${errorText}`);
      throw new Error(`文件上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log(`[${new Date().toISOString()}] 文件上传成功: ${JSON.stringify(uploadResult)}`);

    if (!uploadResult.id) {
      console.error(`[${new Date().toISOString()}] 上传结果中没有文件ID: ${JSON.stringify(uploadResult)}`);
      throw new Error('上传结果中没有文件ID');
    }

    console.log(`[${new Date().toISOString()}] 文件上传完成，ID: ${uploadResult.id}`);
    return uploadResult.id;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] 文件上传过程中出错:`, error);
    throw error;
  }
}