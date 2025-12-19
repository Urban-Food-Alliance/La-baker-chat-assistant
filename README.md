# La-baker-chat-assistant

A user-friendly chat assistant for LA Baker restaurant, integrated with n8n workflow and OpenAI GPT-4o-mini for intelligent question generation.

## Features

- 🤖 **AI-Powered Chat**: Integrated with n8n webhook for restaurant queries
- 💡 **Smart Question Suggestions**: Uses OpenAI GPT-4o-mini to generate 2 relevant follow-up questions based on conversation context
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- ⭐ **Feedback System**: Collects user feedback when closing the chat
- 🎨 **Modern UI**: Clean, intuitive interface inspired by modern chat applications

## Setup Instructions

### 1. OpenAI API Key Configuration

To enable the smart question generation feature, you need to add your OpenAI API key:

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Copy the example config file:
   ```bash
   cp config.example.js config.js
   ```
3. Open `config.js` and replace `'sk-your-openai-api-key-here'` with your actual API key

**Security Note**: The `config.js` file is gitignored and will NOT be committed to your repository. This keeps your API key secure. Always use `config.example.js` as a template.

### 2. GitHub Pages Deployment

1. Push this repository to GitHub
2. Go to your repository settings
3. Navigate to "Pages" in the left sidebar
4. Select the branch (usually `main` or `master`)
5. Select the folder (usually `/root`)
6. Click "Save"

Your chat assistant will be available at: `https://yourusername.github.io/repository-name/`

### 3. Customization

You can customize the following in `config.js`:

- `n8nWebhookUrl`: Your n8n webhook endpoint
- `openaiApiKey`: Your OpenAI API key (for generating sample questions)
- `restaurantName`: Display name for the restaurant
- `restaurantUrl`: Website URL

## File Structure

```
.
├── index.html          # Main HTML structure
├── styles.css          # Styling and layout
├── script.js           # Chat logic and API integrations
├── config.js           # Configuration file with API keys (gitignored)
├── config.example.js   # Configuration template (safe to commit)
└── README.md          # This file
```

## How It Works

1. **User sends a message**: The message is sent to the n8n webhook
2. **Bot responds**: The response from n8n is displayed to the user
3. **Question generation**: OpenAI GPT-4o-mini generates 2 relevant follow-up questions
4. **Quick options**: Generated questions + default options are shown as clickable buttons
5. **Feedback**: When user closes chat, a feedback modal appears

## API Integration

### n8n Webhook

The chat sends POST requests to your n8n webhook with the following format:

```json
{
  "message": "User's message",
  "conversationHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

### OpenAI API

The assistant uses OpenAI's Chat Completions API with the `gpt-4o-mini` model to generate contextual follow-up questions.

## Security Notes

⚠️ **Important**: The `config.js` file is gitignored and contains your API key. This file will NOT be committed to your repository.

**For GitHub Pages deployment:**
- The `config.js` file will NOT be uploaded to GitHub (it's gitignored)
- You'll need to manually add `config.js` to your GitHub Pages deployment, OR
- Consider using GitHub Secrets with GitHub Actions to inject the key during build
- Alternatively, use a serverless function (Vercel, Netlify Functions, etc.) as a proxy for the OpenAI API

**Best Practice**: Never commit `config.js` to version control. Always use `config.example.js` as a template.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available for use.

## Support

For issues or questions, please contact the development team.

