# CORS Issue Solution

## Problem
OpenAI API blocks direct browser calls from GitHub Pages due to CORS policy. This is a security feature.

## Solutions

### Option 1: Use a CORS Proxy (Quick Fix - Not Recommended for Production)

Create a simple proxy using a free service like:
- https://cors-anywhere.herokuapp.com/ (may be rate-limited)
- Or use Cloudflare Workers (free tier available)

### Option 2: Use Serverless Function (Recommended)

#### Using Vercel (Free):
1. Create `api/openai-proxy.js`:
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, body } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. Deploy to Vercel
3. Set `OPENAI_API_KEY` in Vercel environment variables
4. Update `script.js` to call your Vercel function instead

### Option 3: Use Netlify Functions (Free)

Similar to Vercel, create a serverless function.

### Option 4: Backend API (Best for Production)

Create a simple backend API that handles OpenAI calls.

## Quick Fix for Testing

For now, you can test locally where CORS might not be an issue, or use a CORS proxy service temporarily.

