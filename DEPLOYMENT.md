# Deployment Guide for GitHub Pages

## Quick Start

1. **Create a GitHub Repository**
   - Go to GitHub and create a new repository
   - Name it something like `la-baker-chat-assistant`

2. **Push Your Code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: LA Baker Chat Assistant"
   git branch -M main
   git remote add origin https://github.com/yourusername/la-baker-chat-assistant.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on "Settings"
   - Scroll down to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

4. **Access Your Chat**
   - Your chat will be available at: `https://yourusername.github.io/la-baker-chat-assistant/`
   - It may take a few minutes for the site to be live

## Setting Up OpenAI API Key

### Option 1: Direct Configuration (Simple but Less Secure)

1. Open `script.js`
2. Find the `CONFIG` object
3. Add your API key:
   ```javascript
   openaiApiKey: 'sk-your-api-key-here'
   ```

**⚠️ Warning**: This exposes your API key in the public repository. Only use this for testing or if the repository is private.

### Option 2: Using a Proxy (Recommended for Public Repos)

For better security, create a serverless function that acts as a proxy:

#### Using Vercel (Free)

1. Create a `api/openai-proxy.js` file:
   ```javascript
   export default async function handler(req, res) {
     if (req.method !== 'POST') {
       return res.status(405).json({ error: 'Method not allowed' });
     }

     const { prompt } = req.body;
     const apiKey = process.env.OPENAI_API_KEY;

     const response = await fetch('https://api.openai.com/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${apiKey}`
       },
       body: JSON.stringify({
         model: 'gpt-4o-mini',
         messages: [
           {
             role: 'system',
             content: 'You are a helpful assistant for LA Baker. Generate exactly 2 relevant follow-up questions. Return only the questions, one per line.'
           },
           {
             role: 'user',
             content: prompt
           }
         ],
         max_tokens: 100,
         temperature: 0.7
       })
     });

     const data = await response.json();
     res.json(data);
   }
   ```

2. Deploy to Vercel and set `OPENAI_API_KEY` in environment variables
3. Update `script.js` to call your Vercel function instead of OpenAI directly

#### Using Netlify Functions

Similar approach but using Netlify's serverless functions.

## Customization

### Changing Colors

Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #9333EA;  /* Change this */
    --primary-hover: #7C3AED;   /* And this */
    /* ... other colors */
}
```

### Modifying Default Options

Edit the `defaultOptions` array in `script.js`:
```javascript
const defaultOptions = [
    'Menu & Products',
    'Hours & Location',
    'Catering Services',
    'Contact Information'
];
```

### Updating n8n Webhook URL

Change the URL in `script.js`:
```javascript
n8nWebhookUrl: 'https://your-new-webhook-url'
```

## Testing Locally

1. Open `index.html` in a web browser
2. Or use a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with http-server)
   npx http-server
   ```
3. Navigate to `http://localhost:8000`

## Troubleshooting

### Chat not responding?
- Check browser console for errors
- Verify n8n webhook URL is correct
- Ensure CORS is enabled on your n8n webhook

### Questions not generating?
- Verify OpenAI API key is set correctly
- Check browser console for API errors
- Ensure you have credits in your OpenAI account

### Styling issues?
- Clear browser cache
- Check that `styles.css` is loading correctly
- Verify all file paths are correct

## Support

For issues or questions, check the main README.md file or contact support.

