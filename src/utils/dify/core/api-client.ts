import { DifyAPIConfig } from '@/types';

/**
 * 基础Dify API客户端
 * 封装HTTP请求和错误处理逻辑
 */
export class DifyAPIClient {
  constructor(private config: DifyAPIConfig) {}

  /**
   * 调用Dify工作流API
   */
  async callWorkflowAPI(
    inputs: Record<string, any>, 
    userid: string
  ): Promise<Response> {
    const requestBody = {
      inputs,
      response_mode: "streaming",
      user: userid
    };

    // 记录请求信息 - 保持原有日志格式
    console.log(`[${new Date().toISOString()}] 请求Dify API - 用户: ${userid}`);
    console.log(`[${new Date().toISOString()}] 请求Dify API - URL: ${this.config.apiUrl}/workflows/run`);
    console.log(`[${new Date().toISOString()}] 请求Dify API - 请求体: ${JSON.stringify(requestBody)}`);

    const response = await fetch(`${this.config.apiUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // 记录响应状态 - 保持原有日志格式
    console.log(`[${new Date().toISOString()}] Dify API响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] Dify API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Dify API 请求失败: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * 上传文件到Dify
   */
  async uploadFile(file: any): Promise<string> {
    console.log(`[${new Date().toISOString()}] 开始上传文件到Dify: ${file.name || 'unknown'}, 大小: ${file.size || 'unknown'} bytes`);

    const uploadUrl = `${this.config.apiUrl}/files/upload`;
    console.log(`[${new Date().toISOString()}] 文件上传URL: ${uploadUrl}`);

    let response: Response;

    // 检查是否是我们的自定义文件对象（包含buffer属性）
    if (file.buffer && Buffer.isBuffer(file.buffer)) {
      console.log(`[${new Date().toISOString()}] 检测到Base64转换的文件，使用multipart/form-data手动构建`);

      // 手动构建multipart/form-data
      const boundary = '----formdata-' + Math.random().toString(36);
      const CRLF = '\r\n';

      let body = '';
      body += `--${boundary}${CRLF}`;
      body += `Content-Disposition: form-data; name="file"; filename="${file.name}"${CRLF}`;
      body += `Content-Type: ${file.type}${CRLF}`;
      body += CRLF;

      // 将body转换为Buffer，然后拼接文件数据
      const bodyStart = Buffer.from(body, 'utf8');
      const bodyEnd = Buffer.from(`${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="user"${CRLF}${CRLF}api-user${CRLF}--${boundary}--${CRLF}`, 'utf8');

      const finalBody = Buffer.concat([bodyStart, file.buffer, bodyEnd]);

      response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': finalBody.length.toString(),
        },
        body: finalBody
      });
    } else {
      console.log(`[${new Date().toISOString()}] 使用标准FormData上传`);
      // 对于普通文件，使用标准FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', 'api-user');

      response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData
      });
    }

    console.log(`[${new Date().toISOString()}] 文件上传响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] 文件上传失败: ${response.status} - ${errorText}`);
      throw new Error(`文件上传失败: ${response.status} ${response.statusText}`);
    }

    const uploadResult = await response.json();
    console.log(`[${new Date().toISOString()}] 文件上传成功: ${JSON.stringify(uploadResult)}`);

    if (!uploadResult.id) {
      console.error(`[${new Date().toISOString()}] 上传结果中没有文件ID: ${JSON.stringify(uploadResult)}`);
      throw new Error('上传结果中没有文件ID');
    }

    console.log(`[${new Date().toISOString()}] 文件上传完成，ID: ${uploadResult.id}`);
    return uploadResult.id;
  }
}