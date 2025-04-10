import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Yilu API</h1>
        
        <div className="bg-white/5 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">API 文档</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-2">POST /api/generate_titles</h3>
            <p className="mb-4">根据输入参数生成内容标题。</p>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">请求格式:</h4>
              <pre className="bg-gray-800 p-4 rounded overflow-x-auto">
                {`{
  "openid": "wx_abcd1234efgh5678",
  "direction": "心血管疾病预防与保健",
  "word_count": 15,
  "name": "张医生",
  "unit": "北京协和医院心内科"
}`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">响应:</h4>
              <p>服务器发送事件(SSE)流，包含进度更新和最终结果。</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-2">POST /api/generate_article</h3>
            <p className="mb-4">根据输入参数生成文章内容，输出Word文档。</p>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">请求格式:</h4>
              <pre className="bg-gray-800 p-4 rounded overflow-x-auto">
                {`{
  "openid": "wx_abcd1234efgh5678",
  "direction": "心血管疾病预防与保健",
  "title": "高血压防治：日常生活中的饮食调理与血压监测",
  "word_count": 15,
  "name": "张医生",
  "unit": "北京协和医院心内科"
}`}
              </pre>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">响应:</h4>
              <p>服务器发送事件(SSE)流，包含进度更新和最终结果。结果中包含文档下载链接。</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">完成事件示例:</h4>
              <pre className="bg-gray-800 p-4 rounded overflow-x-auto">
                {`{
  "event": "workflow_finished",
  "task_id": "620ee1c3-3679-4852-b4cc-339b0a1bc419",
  "workflow_run_id": "620ee1c3-3679-4852-b4cc-339b0a1bc419",
  "data": {
    "workflow_id": "68e14b11-c091-4499-ae78-fb77c062ad73",
    "progress": "100",
    "files": [
      {
        "url": "http://sandboxai.jinzhibang.com.cn/files/tools/e4d272f1-3003-4c0a-a5e5-449c6d2ca48d.docx?timestamp=1743492930&nonce=e468bd528f2acc6c28b06728cc7ce8cd&sign=-oYdGyEXtIGREOguq35m_LsDfnSZYFxwzToPoSxxgfc="
      }
    ],
    "elapsed_time": "12.5",
    "status": "succeeded"
  }
}`}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">当前实现</h2>
          <p className="mb-4">
            API 已支持将请求转发到 Dify 服务。您可以通过修改环境变量在模拟数据和实际 API 间切换。
          </p>
          
          <div className="flex gap-4">
            <Link 
              href="/test.html" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              在浏览器中测试
            </Link>
            
            <a 
              href="https://github.com/yourusername/yilu-api" 
              target="_blank"
              rel="noopener noreferrer" 
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              查看源代码
            </a>
          </div>
        </div>
        
        <div className="bg-white/5 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">配置</h2>
          <p className="mb-4">
            使用 <code className="bg-gray-800 px-2 py-1 rounded">.env.local</code> 文件配置 Dify API 参数。查看 README 获取更多信息。
          </p>
          
          <pre className="bg-gray-800 p-4 rounded overflow-x-auto mb-4">
            {`# Dify API配置
DIFY_API_KEY=your_api_key_here
DIFY_BASE_URL=http://sandboxai.jinzhibang.com.cn
DIFY_API_URL=http://sandboxai.jinzhibang.com.cn/v1
DIFY_WORKFLOW_ID=your_workflow_id_here

# 设置为true使用模拟数据，false使用实际Dify API
USE_MOCK_DATA=false

# 服务运行在端口9090
# 启动命令: npm run dev`}
          </pre>
        </div>
        
        <div className="bg-white/5 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">相关链接</h2>
          <ul className="list-disc pl-6">
            <li>
              <a 
                href="/test-unified.html" 
                target="_blank"
                className="text-blue-400 hover:text-blue-300"
              >
                API测试页面（标题生成与文章生成）
              </a>
            </li>
            <li>
              <a 
                href="/test-unified.html#quota" 
                target="_blank"
                className="text-blue-400 hover:text-blue-300"
              >
                用户配额管理（查询与添加配额）
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
