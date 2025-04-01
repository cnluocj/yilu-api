import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">Yilu API</h1>
        
        <div className="bg-white/5 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">API Documentation</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-2">POST /api/generate_titles</h3>
            <p className="mb-4">Generates content titles based on input parameters.</p>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Request Format:</h4>
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
              <h4 className="font-medium mb-2">Response:</h4>
              <p>Server-sent events (SSE) stream with progress updates and final results.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">Current Implementation</h2>
          <p className="mb-4">
            This API currently returns mock data to simulate the Dify service response. 
            Future versions will forward requests to the actual Dify service.
          </p>
          
          <Link 
            href="/test.html" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try the API in Browser
          </Link>
        </div>
      </div>
    </main>
  )
}
