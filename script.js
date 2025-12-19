// Configuration is loaded from config.js file (gitignored for security)
// Make sure config.js exists - copy config.example.js to config.js if needed
if (typeof CONFIG === 'undefined') {
    console.error('CONFIG is not defined. Please create config.js from config.example.js');
    // Fallback configuration (without API key) - assign to window to avoid redeclaration
    window.CONFIG = {
        n8nWebhookUrl: 'https://n8n.srv1155798.hstgr.cloud/webhook/8f0737aa-cde7-4089-bd96-7690120f89f7/chat',
        openaiApiKey: '',
        restaurantName: 'LA Baker',
        restaurantUrl: 'https://www.labaker.com/'
    };
}
// CONFIG is already declared in config.js, so we just use it directly

// State management
const state = {
    conversationHistory: [],
    selectedRating: null,
    isLoading: false,
    defaultOptionsShown: false // Track if default options have been shown once
};

// DOM Elements - will be initialized after DOM loads
let chatMessages, messageInput, sendBtn, quickOptions, loadingIndicator;
let feedbackModal, closeBtn, modalCloseBtn, submitFeedbackBtn, feedbackText;
let ratingButtons, optionButtons;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    console.log('CONFIG:', CONFIG ? 'Loaded' : 'Missing');
    if (CONFIG) {
        console.log('n8n URL:', CONFIG.n8nWebhookUrl);
        console.log('OpenAI Key:', CONFIG.openaiApiKey ? 'Set' : 'Not set');
    }
    
    if (!initializeDOMElements()) {
        console.error('Failed to initialize DOM elements');
        console.log('Available elements:', {
            chatMessages: !!document.getElementById('chatMessages'),
            messageInput: !!document.getElementById('messageInput'),
            sendBtn: !!document.getElementById('sendBtn'),
            quickOptions: !!document.getElementById('quickOptions')
        });
        return;
    }
    
    console.log('DOM elements initialized successfully');
    setupEventListeners();
    console.log('Event listeners setup complete');
    console.log('Option buttons found:', optionButtons ? optionButtons.length : 0);
    
    if (messageInput) {
        messageInput.focus();
        console.log('Message input focused');
    }
});

// Initialize DOM elements
function initializeDOMElements() {
    chatMessages = document.getElementById('chatMessages');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    quickOptions = document.getElementById('quickOptions');
    loadingIndicator = document.getElementById('loadingIndicator');
    feedbackModal = document.getElementById('feedbackModal');
    closeBtn = document.getElementById('closeBtn');
    modalCloseBtn = document.getElementById('modalCloseBtn');
    submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    feedbackText = document.getElementById('feedbackText');
    ratingButtons = document.querySelectorAll('.rating-btn');
    optionButtons = document.querySelectorAll('.option-btn');

    // Check if all critical elements exist
    if (!chatMessages || !messageInput || !sendBtn || !quickOptions) {
        console.error('Critical DOM elements not found!');
        return false;
    }
    return true;
}

// Event Listeners
function setupEventListeners() {
    if (!chatMessages || !messageInput || !sendBtn) {
        console.error('Cannot setup event listeners - DOM elements not ready');
        return;
    }

    // Send message on button click
    sendBtn.addEventListener('click', handleSendMessage);
    
    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Quick option buttons
    if (optionButtons && optionButtons.length > 0) {
        console.log(`Setting up ${optionButtons.length} option buttons`);
        optionButtons.forEach((btn, index) => {
            const option = btn.getAttribute('data-option');
            console.log(`Button ${index}: ${option}`);
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Option button clicked:', option);
                if (option) {
                    sendMessage(option, 'user');
                    // Generate sample questions first, then send to n8n
                    await handleOptionClick(option);
                }
            });
        });
    } else {
        console.warn('No option buttons found in DOM');
        // Try to find them again
        optionButtons = document.querySelectorAll('.option-btn');
        console.log('Retried finding option buttons:', optionButtons.length);
    }

    // Close chat button
    if (closeBtn) {
        closeBtn.addEventListener('click', showFeedbackModal);
    }

    // Feedback modal
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeFeedbackModal);
    }
    if (feedbackModal) {
        feedbackModal.addEventListener('click', (e) => {
            if (e.target === feedbackModal) {
                closeFeedbackModal();
            }
        });
    }

    // Rating buttons
    if (ratingButtons && ratingButtons.length > 0) {
        ratingButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                ratingButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.selectedRating = btn.getAttribute('data-rating');
            });
        });
    }

    // Submit feedback
    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', handleSubmitFeedback);
    }

    // Back button (optional functionality)
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            console.log('Back button clicked');
        });
    }
}

// Handle send message
async function handleSendMessage() {
    console.log('handleSendMessage called');
    if (!messageInput) {
        console.error('Message input not found');
        return;
    }
    
    const message = messageInput.value.trim();
    console.log('Message:', message);
    console.log('Is loading:', state.isLoading);
    
    if (!message || state.isLoading) {
        console.log('Message empty or already loading, returning');
        return;
    }

    sendMessage(message, 'user');
    messageInput.value = '';
    await handleUserMessage(message);
}

// Format message text - convert markdown to HTML
function formatMessageText(text) {
    if (!text) return '';
    
    // Escape HTML first to prevent XSS
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Convert markdown bold **text** to <strong>text</strong> first
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Then convert remaining single *text* to <em>text</em> (italic)
    html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    html = html.replace(/\n/g, '<br>');
    
    // Convert email links [text](mailto:email) to <a href="mailto:email">text</a>
    html = html.replace(/\[([^\]]+)\]\(mailto:([^)]+)\)/g, '<a href="mailto:$2">$1</a>');
    
    // Convert URLs to links
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    return html;
}

// Send message to chat
function sendMessage(text, type) {
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Render text with markdown/HTML support
    const p = document.createElement('div');
    p.innerHTML = formatMessageText(text);
    contentDiv.appendChild(p);
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    metaDiv.textContent = type === 'user' 
        ? `You • ${timestamp}`
        : `${CONFIG.restaurantName} Assistant • AI Agent • ${timestamp}`;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(metaDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle option button click - generate questions first, then send to n8n
async function handleOptionClick(option) {
    if (!option) {
        console.error('No option provided');
        return;
    }
    
    console.log('Handling option click:', option);
    state.isLoading = true;
    showLoading(true);
    if (sendBtn) sendBtn.disabled = true;

    try {
        // Step 1: Generate sample questions using OpenAI based on the clicked option
        let generatedQuestions = [];
        
        if (CONFIG.openaiApiKey) {
            try {
                const prompt = `You are a helpful assistant for ${CONFIG.restaurantName}, a bakery in NYC. The user clicked on "${option}". Generate exactly 2 relevant follow-up questions that a customer might ask about this topic. Return only the 2 questions, one per line, without numbering or bullets.`;

                // Use proxy if configured, otherwise try direct (may fail due to CORS)
                const proxyUrl = CONFIG.openaiProxyUrl || null;
                const apiUrl = proxyUrl || 'https://api.openai.com/v1/chat/completions';
                
                const requestBody = {
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a helpful assistant for ${CONFIG.restaurantName}. Generate exactly 2 relevant follow-up questions based on the user's selected option. Return only the questions, one per line, without numbering.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.7
                };

                const headers = {
                    'Content-Type': 'application/json'
                };

                if (proxyUrl) {
                    requestBody.messages = requestBody.messages;
                } else {
                    headers['Authorization'] = `Bearer ${CONFIG.openaiApiKey}`;
                }

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();
                    const questionsText = data.choices[0].message.content.trim();
                    generatedQuestions = questionsText.split('\n')
                        .map(q => q.replace(/^\d+[\.\)]\s*/, '').trim())
                        .filter(q => q.length > 0)
                        .slice(0, 2);
                }
            } catch (error) {
                console.error('Error generating questions:', error);
                // Continue even if question generation fails
            }
        }

        // Step 2: Send the clicked option to n8n webhook
        state.conversationHistory.push({
            role: 'user',
            content: option
        });

        console.log('Sending to n8n:', CONFIG.n8nWebhookUrl);
        console.log('Request body:', { chatInput: option });
        
        const n8nResponse = await fetch(CONFIG.n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatInput: option
            })
        });
        
        console.log('n8n response status:', n8nResponse.status);

        if (!n8nResponse.ok) {
            const errorText = await n8nResponse.text();
            console.error('n8n webhook error:', n8nResponse.status, errorText);
            throw new Error(`n8n webhook error: ${n8nResponse.status} - ${errorText}`);
        }

        let n8nData;
        try {
            n8nData = await n8nResponse.json();
        } catch (e) {
            // If response is not JSON, treat it as text
            const textResponse = await n8nResponse.text();
            n8nData = { response: textResponse };
        }
        // Handle different response formats from n8n
        let rawResponse = '';
        if (typeof n8nData === 'string') {
            rawResponse = n8nData;
        } else if (n8nData.response) {
            rawResponse = n8nData.response;
        } else if (n8nData.message) {
            rawResponse = n8nData.message;
        } else if (n8nData.text) {
            rawResponse = n8nData.text;
        } else if (n8nData.output && n8nData.output.response) {
            rawResponse = n8nData.output.response;
        } else {
            rawResponse = 'I apologize, but I couldn\'t process that request.';
        }

        // Step 3: Format the response using OpenAI to make it user-friendly
        const botResponse = await formatResponseWithOpenAI(rawResponse, option);

        // Add bot response to history
        state.conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });

        // Step 4: Display bot response
        sendMessage(botResponse, 'bot');

        // Step 5: Generate 2 new sample questions based on the conversation
        await generateAndShowSampleQuestions(option, botResponse);

    } catch (error) {
        console.error('Error in handleOptionClick:', error);
        let errorMessage = 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
        
        // More specific error messages
        if (error.message && error.message.includes('n8n webhook error')) {
            errorMessage = 'Unable to connect to our chat service. Please check your internet connection and try again.';
        } else if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        sendMessage(errorMessage, 'bot');
        // Don't show default options again (already shown once at start)
    } finally {
        state.isLoading = false;
        showLoading(false);
        if (sendBtn) sendBtn.disabled = false;
        if (messageInput) messageInput.focus();
    }
}

// Handle user message and get response
async function handleUserMessage(userMessage) {
    state.isLoading = true;
    showLoading(true);
    sendBtn.disabled = true;

    try {
        // Add to conversation history
        state.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        // Send to n8n webhook
        console.log('Sending message to n8n:', CONFIG.n8nWebhookUrl);
        console.log('Request body:', { chatInput: userMessage });
        
        const response = await fetch(CONFIG.n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatInput: userMessage
            })
        });
        
        console.log('n8n response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('n8n webhook error:', response.status, errorText);
            throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
        }

        let data;
        try {
            data = await response.json();
        } catch (e) {
            // If response is not JSON, treat it as text
            const textResponse = await response.text();
            data = { response: textResponse };
        }
        
        // Handle different response formats from n8n
        let rawResponse = '';
        if (typeof data === 'string') {
            rawResponse = data;
        } else if (data.response) {
            rawResponse = data.response;
        } else if (data.message) {
            rawResponse = data.message;
        } else if (data.text) {
            rawResponse = data.text;
        } else if (data.output && data.output.response) {
            rawResponse = data.output.response;
        } else {
            rawResponse = 'I apologize, but I couldn\'t process that request.';
        }

        // Format the response using OpenAI to make it user-friendly
        const botResponse = await formatResponseWithOpenAI(rawResponse, userMessage);

        // Add bot response to history
        state.conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });

        // Display bot response
        sendMessage(botResponse, 'bot');

        // Generate 2 new sample questions based on the conversation
        await generateAndShowSampleQuestions(userMessage, botResponse);

    } catch (error) {
        console.error('Error in handleUserMessage:', error);
        let errorMessage = 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
        
        // More specific error messages
        if (error.message && error.message.includes('n8n webhook error')) {
            errorMessage = 'Unable to connect to our chat service. Please check your internet connection and try again.';
        } else if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        sendMessage(errorMessage, 'bot');
        
        // Don't show default options on error (already shown once at start)
    } finally {
        state.isLoading = false;
        showLoading(false);
        if (sendBtn) sendBtn.disabled = false;
        if (messageInput) messageInput.focus();
    }
}

// Show default options once when chat starts
function showDefaultOptionsOnce() {
    if (state.defaultOptionsShown) {
        return; // Already shown
    }
    
    showDefaultOptions();
    state.defaultOptionsShown = true;
}

// Format n8n response using OpenAI to make it user-friendly
async function formatResponseWithOpenAI(rawResponse, userQuestion) {
    // If no API key, return raw response (formatted with markdown)
    if (!CONFIG.openaiApiKey || CONFIG.openaiApiKey === 'sk-your-openai-api-key-here') {
        console.warn('OpenAI API key not set, using raw response');
        return rawResponse;
    }

    try {
        const prompt = `You are a friendly assistant for ${CONFIG.restaurantName}, a bakery in NYC. A customer asked: "${userQuestion}".

The information system provided this response:
"${rawResponse}"

Reformat this response to be conversational, user-friendly, and engaging. Keep all important information but make it sound natural and friendly, as if you're directly talking to the customer.

CRITICAL RULES:
- Start directly with the answer - NO meta-commentary like "Sure!", "Here's...", "Let me...", etc.
- NO headings, separators, or introductory phrases
- Use **bold** for labels (like "Location:", "Hours:", etc.)
- Use line breaks for readability
- Keep lists clear and easy to read
- Be conversational but informative
- Return ONLY the reformatted response text, nothing else - no explanations, no meta-text`;

        // Use proxy if configured, otherwise try direct (may fail due to CORS)
        const proxyUrl = CONFIG.openaiProxyUrl || null;
        const apiUrl = proxyUrl || 'https://api.openai.com/v1/chat/completions';
        
        const requestBody = {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a friendly assistant for ${CONFIG.restaurantName}. Reformulate responses to be conversational, user-friendly, and engaging while keeping all important information. NEVER add meta-commentary, headings, or introductory phrases. Start directly with the answer.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        };

        const headers = {
            'Content-Type': 'application/json'
        };

        // If using proxy, send messages in body; if direct, use Authorization header
        if (proxyUrl) {
            requestBody.messages = requestBody.messages;
        } else {
            headers['Authorization'] = `Bearer ${CONFIG.openaiApiKey}`;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(proxyUrl ? requestBody : requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            let formattedResponse = data.choices[0].message.content.trim();
            
            // Clean up any unwanted meta-text that OpenAI might add
            // Remove lines like "Sure! Here's...", "Let me...", etc.
            formattedResponse = formattedResponse.replace(/^(Sure!|Here's|Let me|I'll|I can|Here is).*?:\s*/i, '');
            formattedResponse = formattedResponse.replace(/^---\s*/g, ''); // Remove separator lines
            formattedResponse = formattedResponse.replace(/^Hey there!.*?\n/gi, ''); // Remove "Hey there!" lines
            formattedResponse = formattedResponse.replace(/^✨\s*/g, ''); // Remove emoji prefixes
            formattedResponse = formattedResponse.trim();
            
            return formattedResponse;
        } else {
            // If OpenAI fails, return raw response
            console.error('OpenAI formatting failed, using raw response');
            return rawResponse;
        }
    } catch (error) {
        console.error('Error formatting response:', error);
        // If error, return raw response
        return rawResponse;
    }
}

// Generate sample questions using OpenAI based on conversation
async function generateAndShowSampleQuestions(userQuestion, botResponse) {
    // If no API key is set, don't show anything (default options already shown once)
    if (!CONFIG.openaiApiKey) {
        return;
    }

    try {
        const prompt = `You are a helpful assistant for ${CONFIG.restaurantName}, a bakery in NYC. Based on the user's question "${userQuestion}" and your response "${botResponse}", generate exactly 2 relevant follow-up questions that a customer might ask. Return only the 2 questions, one per line, without numbering or bullets.`;

        // Use proxy if configured, otherwise try direct (may fail due to CORS)
        const proxyUrl = CONFIG.openaiProxyUrl || null;
        const apiUrl = proxyUrl || 'https://api.openai.com/v1/chat/completions';
        
        const requestBody = {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant for ${CONFIG.restaurantName}. Generate exactly 2 relevant follow-up questions based on the conversation. Return only the questions, one per line, without numbering.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        };

        const headers = {
            'Content-Type': 'application/json'
        };

        // If using proxy, send messages in body; if direct, use Authorization header
        if (proxyUrl) {
            requestBody.messages = requestBody.messages;
        } else {
            headers['Authorization'] = `Bearer ${CONFIG.openaiApiKey}`;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(proxyUrl ? requestBody : requestBody)
        });

        if (!response.ok) {
            throw new Error('OpenAI API error');
        }

        const data = await response.json();
        const questionsText = data.choices[0].message.content.trim();
        const questions = questionsText.split('\n')
            .map(q => q.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(q => q.length > 0)
            .slice(0, 2);

        if (questions.length > 0) {
            showSampleQuestions(questions);
        }
        // If no questions generated, don't show anything (default options already shown once)

    } catch (error) {
        console.error('Error generating questions:', error);
        // Don't show default options on error (already shown once)
    }
}

// Show sample questions as quick options (only the 2 generated questions, no default options)
function showSampleQuestions(questions) {
    if (!quickOptions) {
        console.error('Quick options container not found');
        return;
    }
    
    // Clear existing options
    quickOptions.innerHTML = '';

    // Add only the generated questions (no default options after initial load)
    questions.forEach(question => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = question;
        btn.setAttribute('data-option', question);
        btn.addEventListener('click', async () => {
            sendMessage(question, 'user');
            await handleOptionClick(question);
        });
        quickOptions.appendChild(btn);
    });
}

// Show default options
function showDefaultOptions() {
    if (!quickOptions) {
        console.error('Quick options container not found');
        return;
    }
    
    quickOptions.innerHTML = '';
    
    const defaultOptions = [
        'Menu & Products',
        'Hours & Location',
        'Catering Services',
        'Contact Information'
    ];

    defaultOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.setAttribute('data-option', option);
        btn.addEventListener('click', async () => {
            sendMessage(option, 'user');
            await handleOptionClick(option);
        });
        quickOptions.appendChild(btn);
    });
}

// Show/hide loading indicator
function showLoading(show) {
    if (!loadingIndicator) return;
    
    if (show) {
        loadingIndicator.classList.add('active');
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        loadingIndicator.classList.remove('active');
    }
}

// Show feedback modal
function showFeedbackModal() {
    feedbackModal.classList.add('active');
    state.selectedRating = null;
    feedbackText.value = '';
    ratingButtons.forEach(btn => btn.classList.remove('selected'));
}

// Close feedback modal
function closeFeedbackModal() {
    feedbackModal.classList.remove('active');
}

// Handle feedback submission
function handleSubmitFeedback() {
    const rating = state.selectedRating;
    const feedback = feedbackText.value.trim();

    if (!rating) {
        alert('Please select a rating before submitting.');
        return;
    }

    // Here you could send feedback to your backend
    console.log('Feedback submitted:', { rating, feedback });

    // Show thank you message
    alert('Thank you for your feedback! We appreciate your input.');

    // Close modal
    closeFeedbackModal();

    // Optionally, you could send this to your n8n webhook or another endpoint
    // fetch('your-feedback-endpoint', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ rating, feedback, timestamp: new Date().toISOString() })
    // });
}

