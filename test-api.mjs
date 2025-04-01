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

    console.log('Receiving SSE events:');
    
    // Process the stream as text
    const stream = response.body;
    
    // Set up event listeners on the stream
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      console.log(text);
    });
    
    stream.on('end', () => {
      console.log('Stream ended.');
    });
    
    stream.on('error', (err) => {
      console.error('Stream error:', err);
    });
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApi(); 