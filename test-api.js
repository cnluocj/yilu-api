// Simple Node.js script to test the API endpoint
import fetch from 'node-fetch';

async function testApi() {
  const url = 'http://localhost:3000/api/generate_titles';
  const payload = {
    openid: "wx_abcd1234efgh5678",
    direction: "心血管疾病预防与保健",
    word_count: 15,
    name: "张医生",
    unit: "北京协和医院心内科"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle Server-Sent Events (SSE)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    console.log('Receiving SSE events:');
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      console.log(text);
    }
    
    console.log('Stream ended.');
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi(); 