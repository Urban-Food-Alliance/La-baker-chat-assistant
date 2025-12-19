# Fix CORS Issue - Deploy OpenAI Proxy

## Problem
OpenAI API blocks direct browser calls from GitHub Pages due to CORS policy. You're seeing:
- `Access-Control-Allow-Origin` CORS error
- `401 Unauthorized` errors

## Solution: Use a Serverless Proxy

### Option 1: Deploy to Vercel (Recommended - Free)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variable:**
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Add: `OPENAI_API_KEY` = your OpenAI API key

4. **Update config.js:**
   ```javascript
   openaiProxyUrl: 'https://your-app.vercel.app/api/openai-proxy'
   ```

### Option 2: Deploy to Netlify (Free)

1. **Create `netlify.toml`:**
   ```toml
   [build]
     functions = "api"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. **Create `api/openai-proxy.js`** (Netlify format):
   ```javascript
   exports.handler = async (event, context) => {
     if (event.httpMethod !== 'POST') {
       return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
     }

     const { messages, model, max_tokens, temperature } = JSON.parse(event.body);
     const apiKey = process.env.OPENAI_API_KEY;

     const response = await fetch('https://api.openai.com/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${apiKey}`
       },
       body: JSON.stringify({ model, messages, max_tokens, temperature })
     });

     const data = await response.json();
     return {
       statusCode: 200,
       headers: { 'Access-Control-Allow-Origin': '*' },
       body: JSON.stringify(data)
     };
   };
   ```

3. **Deploy to Netlify** and set `OPENAI_API_KEY` in environment variables

### Option 3: Quick Fix - Use Existing CORS Proxy (Temporary)

For quick testing, you can temporarily use a CORS proxy, but this is **NOT recommended for production**:

Update `config.js`:
```javascript
openaiProxyUrl: 'https://cors-anywhere.herokuapp.com/https://api.openai.com/v1/chat/completions'
```

**Warning**: This exposes your API key and is unreliable.

## After Deploying Proxy

1. Update `config.js` with your proxy URL
2. Push to GitHub
3. Wait for GitHub Pages to rebuild
4. Test the chat - CORS errors should be gone!

## Files Created

- `api/openai-proxy.js` - Serverless function for Vercel/Netlify
- `vercel.json` - Vercel configuration
- Updated `script.js` - Now supports proxy URL
- Updated `config.js` - Added `openaiProxyUrl` option

