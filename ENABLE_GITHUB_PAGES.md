# How to Enable GitHub Pages (Step-by-Step)

## Quick Fix for 404 Error

The 404 error means GitHub Pages isn't enabled yet. Follow these steps:

### Step 1: Go to Repository Settings

1. Open: https://github.com/Urban-Food-Alliance/La-baker-chat-assistant
2. Click the **Settings** tab (top right of the repository)

### Step 2: Enable GitHub Pages

1. In the left sidebar, scroll down and click **Pages**
2. Under **Source**, you'll see a dropdown
3. Select:
   - **Branch**: `main`
   - **Folder**: `/ (root)` or `/`
4. Click **Save**

### Step 3: Wait for Deployment

- GitHub will show: "Your site is ready to be published at..."
- Wait 1-2 minutes for the site to build
- Refresh the page to see the deployment status

### Step 4: Access Your Site

Your site will be available at:
**https://urban-food-alliance.github.io/La-baker-chat-assistant/**

## Troubleshooting

### If you still see 404:

1. **Check the branch name**: Make sure it's `main` (not `master`)
2. **Check the folder**: Should be `/ (root)` or `/`
3. **Wait a bit longer**: First deployment can take 2-5 minutes
4. **Check Actions tab**: Go to **Actions** tab to see if there are any build errors

### If Pages option is missing:

- Make sure you have **admin/write access** to the repository
- The repository must be **public** (or you need GitHub Pro for private repos)

### Common Issues:

- **"No published site"**: Click "Save" again in Pages settings
- **Build failed**: Check the Actions tab for error messages
- **Still 404 after 5 minutes**: Try changing the branch to `main` and back, then save

## Verify Files Are Correct

Make sure these files exist in your repository:
- ✅ `index.html` (must be in root)
- ✅ `.nojekyll` (for GitHub Pages)
- ✅ All other files (styles.css, script.js, etc.)

## After Pages is Enabled

1. You'll see a green checkmark in the Pages settings
2. The site URL will be displayed
3. It may take a few minutes to be accessible
4. You can check deployment status in the **Actions** tab

