# Next Steps After Adding GitHub Secret

## ✅ Step 1: Done - Added GitHub Secret
You've added `OPENAI_API_KEY` to GitHub Secrets. Great!

## 🔧 Step 2: Remove Exposed API Key from Repository

The API key in `config.js` needs to be removed from git history. Do this:

### Option A: Use GitHub's Secret Removal Tool (Recommended)
1. Go to your repository on GitHub
2. GitHub should show you a warning about the exposed secret
3. Click on "removing the secret from your commit and commit history"
4. Follow GitHub's automated tool to remove it

### Option B: Manual Removal
Run these commands locally:
```bash
# Remove config.js from git (it's already gitignored)
git rm --cached config.js
git commit -m "Remove config.js with exposed API key"
git push
```

## ⚙️ Step 3: Enable GitHub Actions

1. Go to: https://github.com/Urban-Food-Alliance/La-baker-chat-assistant/settings/actions
2. Under **"Workflow permissions"**, select: **"Read and write permissions"**
3. Check: **"Allow GitHub Actions to create and approve pull requests"**
4. Click **"Save"**

## 📄 Step 4: Switch GitHub Pages to Use Actions

1. Go to: https://github.com/Urban-Food-Alliance/La-baker-chat-assistant/settings/pages
2. Under **"Source"**, change from **"Deploy from a branch"** to **"GitHub Actions"**
3. The workflow will automatically deploy

## 🚀 Step 5: Trigger the Workflow

The workflow will run automatically on the next push, OR you can trigger it manually:

1. Go to: https://github.com/Urban-Food-Alliance/La-baker-chat-assistant/actions
2. Click on **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"** button
4. Watch it build and deploy

## ✅ Step 6: Verify Deployment

1. Wait for the workflow to complete (green checkmark)
2. Your site will be at: https://urban-food-alliance.github.io/La-baker-chat-assistant/
3. Test the chat - it should work with the API key from secrets!

## 🔍 Troubleshooting

- **Workflow not showing**: Make sure Actions are enabled in repository settings
- **Workflow failing**: Check the Actions tab for error messages
- **API key not working**: Verify the secret name is exactly `OPENAI_API_KEY`
- **Pages not updating**: Make sure Pages source is set to "GitHub Actions"

## 📝 What Happens Now

- GitHub Actions will read `OPENAI_API_KEY` from Secrets
- Create `config.js` during build with your API key
- Deploy to GitHub Pages
- Your API key stays secure and never exposed in the repository!

