# Setup Environment Variables for GitHub Pages

## Problem
GitHub detected your OpenAI API key in the repository. We need to use GitHub Secrets instead.

## Solution: Use GitHub Actions with Secrets

### Step 1: Add OpenAI API Key to GitHub Secrets

1. Go to your repository: https://github.com/Urban-Food-Alliance/La-baker-chat-assistant
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `OPENAI_API_KEY`
5. Value: Your OpenAI API key (starts with `sk-proj-...`)
6. Click **Add secret**

### Step 2: Remove API Key from Repository

The `config.js` file with your API key needs to be removed from git history:

1. **Option A: Remove from current commit (if not pushed yet)**
   ```bash
   git rm --cached config.js
   git commit -m "Remove config.js with API key"
   ```

2. **Option B: Remove from git history (if already pushed)**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch config.js" \
     --prune-empty --tag-name-filter cat -- --all
   git push origin --force --all
   ```

3. **Option C: Use GitHub's secret removal tool**
   - GitHub will show you options to remove the secret
   - Follow their instructions

### Step 3: Enable GitHub Actions

1. Go to repository **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select: **Read and write permissions**
3. Check: **Allow GitHub Actions to create and approve pull requests**
4. Click **Save**

### Step 4: Disable GitHub Pages (Actions will handle it)

1. Go to **Settings** → **Pages**
2. Change source to: **GitHub Actions**
3. Or disable it - the workflow will deploy automatically

### Step 5: Verify

1. Push any change to trigger the workflow
2. Go to **Actions** tab to see the workflow running
3. Once complete, your site will be deployed with the API key from secrets

## How It Works

- GitHub Actions workflow runs on every push
- It reads `OPENAI_API_KEY` from GitHub Secrets
- Creates `config.js` file with the secret value
- Deploys to GitHub Pages
- The API key is never exposed in the repository

## For Local Development

1. Copy `config.example.js` to `config.js`
2. Add your API key in `config.js`
3. `config.js` is gitignored, so it won't be committed

## Security Notes

- ✅ API key stored in GitHub Secrets (encrypted)
- ✅ API key injected during build (not in repository)
- ✅ `config.js` is gitignored for local development
- ✅ No API keys in git history after cleanup

