# Yilu API

Next.js API that forwards requests to Dify service.

## Project Structure

```
/src
  /app
    /api
      /generate_titles - API endpoint for generating titles
```

## API Endpoints

### `POST /generate_titles`

Generates content titles based on input parameters.

**Request Format:**

```json
{
  "openid": "wx_abcd1234efgh5678",
  "direction": "心血管疾病预防与保健",
  "word_count": 15,
  "name": "张医生",
  "unit": "北京协和医院心内科"
}
```

**Response:**

Server-sent events (SSE) stream with progress updates and final results.

## Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The server will be available at http://localhost:3000.

## Current Implementation

Currently, the API returns mock data to simulate the Dify service response. Future versions will forward requests to the actual Dify service.
