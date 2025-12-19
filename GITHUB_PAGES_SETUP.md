# GitHub Pages Deployment Guide

## ✅ Step 1: Enable GitHub Pages

1. Go to your repository: https://github.com/Urban-Food-Alliance/La-baker-chat-assistant
2. Click on **Settings** (top menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

Your site will be available at:
`https://urban-food-alliance.github.io/La-baker-chat-assistant/`

## ⚠️ Important: API Key Configuration

Since `config.js` is gitignored (for security), you need to add it manually to GitHub Pages. Here are your options:

### Option 1: Manual Upload (Quick but Less Secure)

1. Go to your repository on GitHub
2. Click **Add file** → **Create new file**
3. Name it: `config.js`
4. Copy the content from `config.example.js` and add your actual API key:
   ```javascript
   const CONFIG = {
       n8nWebhookUrl: 'https://n8n.srv1155798.hstgr.cloud/webhook/8f0737aa-cde7-4089-bd96-7690120f89f7/chat',
       openaiApiKey: 'your-actual-api-key-here',
       restaurantName: 'LA Baker',
       restaurantUrl: 'https://www.labaker.com/'
   };
   ```
5. Click **Commit new file**

**⚠️ Warning**: This exposes your API key in a public repository. Only use this for testing.

### Option 2: Use GitHub Secrets with GitHub Actions (Recommended)

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
4. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Create config.js
           run: |
             echo "const CONFIG = {" > config.js
             echo "  n8nWebhookUrl: 'https://n8n.srv1155798.hstgr.cloud/webhook/8f0737aa-cde7-4089-bd96-7690120f89f7/chat'," >> config.js
             echo "  openaiApiKey: '${{ secrets.OPENAI_API_KEY }}'," >> config.js
             echo "  restaurantName: 'LA Baker'," >> config.js
             echo "  restaurantUrl: 'https://www.labaker.com/'" >> config.js
             echo "};" >> config.js
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./
   ```

### Option 3: Use Environment Variables (Advanced)

For production, consider using a serverless function (Vercel, Netlify) as a proxy for the OpenAI API to keep your key secure.

## 📝 Files Included

- ✅ `index.html` - Main chat interface
- ✅ `styles.css` - Styling
- ✅ `script.js` - Chat logic
- ✅ `config.example.js` - Template (safe to commit)
- ✅ `.nojekyll` - GitHub Pages configuration
- ✅ `.gitignore` - Excludes `config.js` (contains API key)

## 🔒 Security Notes

- `config.js` is **NOT** in the repository (gitignored)
- You must manually create it on GitHub Pages or use GitHub Secrets
- Never commit your actual API key to the repository

## 🚀 After Deployment

1. Wait a few minutes for GitHub Pages to build
2. Visit: `https://urban-food-alliance.github.io/La-baker-chat-assistant/`
3. Test the chat interface
4. If you see errors, check the browser console (F12)

## 🐛 Troubleshooting

- **404 Error**: Make sure GitHub Pages is enabled and pointing to `main` branch
- **API Key Error**: Ensure `config.js` exists with your API key
- **CORS Error**: Check that your n8n webhook allows requests from GitHub Pages domain

