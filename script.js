// Configuration is loaded from config.js file (gitignored for security)
// Make sure config.js exists - copy config.example.js to config.js if needed
if (typeof CONFIG === 'undefined') {
    console.error('CONFIG is not defined. Please create config.js from config.example.js');
    // Fallback configuration (without API key) - assign to window to avoid redeclaration
      window.CONFIG = {
        n8nWebhookUrl: 'https://n8n.srv1155798.hstgr.cloud/webhook/8f0737aa-cde7-4089-bd96-7690120f89f7/chat',
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
    
    // If loading indicator is visible, insert message before it, otherwise append
    if (loadingIndicator && loadingIndicator.classList.contains('active')) {
        chatMessages.insertBefore(messageDiv, loadingIndicator);
    } else {
        chatMessages.appendChild(messageDiv);
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle option button click - send to n8n webhook
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
        // Send the clicked option to n8n webhook
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
            let errorText = '';
            try {
                errorText = await n8nResponse.text();
                // Try to parse as JSON for better error message
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorText = errorJson.message;
                    }
                } catch (e) {
                    // Keep as text if not JSON
                }
            } catch (e) {
                errorText = 'Unknown error';
            }
            
            console.error('n8n webhook error:', n8nResponse.status, errorText);
            
            // Provide user-friendly error messages based on status code
            if (n8nResponse.status === 500) {
                throw new Error(`Our chat service is experiencing technical difficulties. Please try again in a moment. (Error: ${errorText})`);
            } else if (n8nResponse.status === 404) {
                throw new Error(`Chat service endpoint not found. Please contact support.`);
            } else if (n8nResponse.status === 503) {
                throw new Error(`Chat service is temporarily unavailable. Please try again later.`);
            } else {
                throw new Error(`Unable to connect to chat service (${n8nResponse.status}). Please try again.`);
            }
        }

        let n8nData;
        try {
            n8nData = await n8nResponse.json();
        } catch (e) {
            // If response is not JSON, treat it as text
            const textResponse = await n8nResponse.text();
            n8nData = { response: textResponse };
        }
        
        // Log the full response for debugging
        console.log('n8n response data:', JSON.stringify(n8nData, null, 2));
        
        // Handle n8n response format: { answer, followup_question01, followup_question02 }
        // n8n may return data as an array, so handle that case
        let responseData = n8nData;
        if (Array.isArray(n8nData) && n8nData.length > 0) {
            responseData = n8nData[0]; // Take first item from array
            console.log('n8n returned array, using first item:', responseData);
        }
        
        // Log all available keys in responseData for debugging
        console.log('=== PARSING RESPONSE DATA ===');
        console.log('responseData type:', typeof responseData);
        console.log('responseData keys:', responseData ? Object.keys(responseData) : 'null/undefined');
        console.log('Full responseData object:', responseData);
        
        // Try to access fields directly and print them
        console.log('--- DIRECT FIELD ACCESS ---');
        console.log('responseData.answer:', responseData?.answer);
        console.log('responseData.Answer:', responseData?.Answer);
        console.log('responseData.followup_question01:', responseData?.followup_question01);
        console.log('responseData.followupQuestion01:', responseData?.followupQuestion01);
        console.log('responseData.followup_question_01:', responseData?.followup_question_01);
        console.log('responseData.followup_question02:', responseData?.followup_question02);
        console.log('responseData.followupQuestion02:', responseData?.followupQuestion02);
        console.log('responseData.followup_question_02:', responseData?.followup_question_02);
        console.log('responseData.response:', responseData?.response);
        console.log('responseData.message:', responseData?.message);
        console.log('responseData.data:', responseData?.data);
        console.log('---------------------------');
        
        let rawResponse = '';
        let followupQuestion01 = '';
        let followupQuestion02 = '';
        
        if (typeof responseData === 'string') {
            rawResponse = responseData;
        } else if (responseData && responseData.answer) {
            // New format with answer and followup questions
            rawResponse = responseData.answer || responseData.Answer || '';
            followupQuestion01 = responseData.followup_question01 || responseData.followupQuestion01 || responseData.followup_question_01 || '';
            followupQuestion02 = responseData.followup_question02 || responseData.followupQuestion02 || responseData.followup_question_02 || '';
            console.log('Found answer and followup questions:', { rawResponse, followupQuestion01, followupQuestion02 });
        } else if (responseData && (responseData.response || responseData.Response)) {
            rawResponse = responseData.response || responseData.Response;
            // Check if followup questions are also in response object
            followupQuestion01 = responseData.followup_question01 || responseData.followupQuestion01 || responseData.followup_question_01 || '';
            followupQuestion02 = responseData.followup_question02 || responseData.followupQuestion02 || responseData.followup_question_02 || '';
        } else if (responseData && (responseData.message || responseData.Message)) {
            rawResponse = responseData.message || responseData.Message;
        } else if (responseData && (responseData.text || responseData.Text)) {
            rawResponse = responseData.text || responseData.Text;
        } else if (responseData && responseData.data) {
            // Handle nested data object
            const data = responseData.data;
            rawResponse = data.answer || data.Answer || data.response || data.Response || data.message || data.Message || '';
            followupQuestion01 = data.followup_question01 || data.followupQuestion01 || data.followup_question_01 || '';
            followupQuestion02 = data.followup_question02 || data.followupQuestion02 || data.followup_question_02 || '';
        } else if (responseData && responseData.output) {
            // Handle output field - it may be a string with JSON wrapped in markdown code blocks
            let outputValue = responseData.output;
            
            // If output is a string, try to extract JSON from markdown code blocks
            if (typeof outputValue === 'string') {
                console.log('Found output as string, attempting to parse JSON from markdown code block...');
                
                // Remove markdown code block markers (```json and ```)
                outputValue = outputValue.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                
                // Try to parse as JSON
                try {
                    const parsedOutput = JSON.parse(outputValue);
                    console.log('Successfully parsed JSON from output:', parsedOutput);
                    
                    // Extract values from parsed JSON
                    rawResponse = parsedOutput.answer || parsedOutput.Answer || '';
                    followupQuestion01 = parsedOutput.followup_question01 || parsedOutput.followupQuestion01 || parsedOutput.followup_question_01 || '';
                    followupQuestion02 = parsedOutput.followup_question02 || parsedOutput.followupQuestion02 || parsedOutput.followup_question_02 || '';
                    
                    console.log('Extracted from parsed output:', { rawResponse, followupQuestion01, followupQuestion02 });
                } catch (parseError) {
                    console.error('Failed to parse JSON from output string:', parseError);
                    console.log('Raw output value:', outputValue);
                    // If parsing fails, use the raw string as response
                    rawResponse = outputValue;
                }
            } else if (typeof outputValue === 'object' && outputValue.response) {
                // If output is an object with response field
                rawResponse = outputValue.response;
            } else {
                // If output is already an object, check for answer/response fields directly
                rawResponse = outputValue.answer || outputValue.Answer || outputValue.response || outputValue.Response || '';
                followupQuestion01 = outputValue.followup_question01 || outputValue.followupQuestion01 || outputValue.followup_question_01 || '';
                followupQuestion02 = outputValue.followup_question02 || outputValue.followupQuestion02 || outputValue.followup_question_02 || '';
            }
        } else if (responseData && responseData.output && responseData.output.response) {
            rawResponse = responseData.output.response;
        } else {
            // Log the full structure for debugging
            console.error('Could not parse n8n response.');
            console.error('Response type:', typeof responseData);
            console.error('Is array:', Array.isArray(responseData));
            console.error('Available keys:', responseData ? Object.keys(responseData) : 'no data');
            console.error('Full response:', responseData);
            rawResponse = 'I apologize, but I couldn\'t process that request.';
        }

        // Print extracted values for debugging - MAKE THIS VERY VISIBLE
        console.log('');
        console.log('╔════════════════════════════════════════════╗');
        console.log('║   EXTRACTED VALUES FROM N8N RESPONSE      ║');
        console.log('╠════════════════════════════════════════════╣');
        console.log('║ answer:', rawResponse || '(EMPTY)'.padEnd(35), '║');
        console.log('║ followup_question01:', (followupQuestion01 || '(EMPTY)').padEnd(27), '║');
        console.log('║ followup_question02:', (followupQuestion02 || '(EMPTY)').padEnd(27), '║');
        console.log('╚════════════════════════════════════════════╝');
        console.log('');

        // Use the raw response directly from n8n (no OpenAI formatting needed)
        const botResponse = rawResponse;

        // Add bot response to history
        state.conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });

        // Step 3: Display bot response
        sendMessage(botResponse, 'bot');

        // Step 5: Show followup questions from n8n response
        if (followupQuestion01 || followupQuestion02) {
            const followupQuestions = [followupQuestion01, followupQuestion02].filter(q => q && q.trim() !== '');
            if (followupQuestions.length > 0) {
                showSampleQuestions(followupQuestions);
            } else {
                // If no followup questions, show default options
                showDefaultOptions();
            }
        } else {
            // If no followup questions in response, show default options
            showDefaultOptions();
        }

    } catch (error) {
        console.error('Error in handleOptionClick:', error);
        let errorMessage = 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
        
        // Use the error message if it's user-friendly, otherwise provide generic message
        if (error.message && !error.message.includes('n8n webhook error') && !error.message.includes('Failed to fetch')) {
            // Use the specific error message (already user-friendly)
            errorMessage = error.message;
        } else if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message && error.message.includes('technical difficulties')) {
            errorMessage = error.message; // Use the user-friendly message we created
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
        
        // Log the full response for debugging
        console.log('n8n response data:', JSON.stringify(data, null, 2));
        
        // Handle n8n response format: { answer, followup_question01, followup_question02 }
        // n8n may return data as an array, so handle that case
        let responseData = data;
        if (Array.isArray(data) && data.length > 0) {
            responseData = data[0]; // Take first item from array
            console.log('n8n returned array, using first item:', responseData);
        }
        
        // Log all available keys in responseData for debugging
        console.log('=== PARSING RESPONSE DATA ===');
        console.log('responseData type:', typeof responseData);
        console.log('responseData keys:', responseData ? Object.keys(responseData) : 'null/undefined');
        console.log('Full responseData object:', responseData);
        
        // Try to access fields directly and print them
        console.log('--- DIRECT FIELD ACCESS ---');
        console.log('responseData.answer:', responseData?.answer);
        console.log('responseData.Answer:', responseData?.Answer);
        console.log('responseData.followup_question01:', responseData?.followup_question01);
        console.log('responseData.followupQuestion01:', responseData?.followupQuestion01);
        console.log('responseData.followup_question_01:', responseData?.followup_question_01);
        console.log('responseData.followup_question02:', responseData?.followup_question02);
        console.log('responseData.followupQuestion02:', responseData?.followupQuestion02);
        console.log('responseData.followup_question_02:', responseData?.followup_question_02);
        console.log('responseData.response:', responseData?.response);
        console.log('responseData.message:', responseData?.message);
        console.log('responseData.data:', responseData?.data);
        console.log('---------------------------');
        
        let rawResponse = '';
        let followupQuestion01 = '';
        let followupQuestion02 = '';
        
        if (typeof responseData === 'string') {
            rawResponse = responseData;
        } else if (responseData && responseData.answer) {
            // New format with answer and followup questions
            rawResponse = responseData.answer || responseData.Answer || '';
            followupQuestion01 = responseData.followup_question01 || responseData.followupQuestion01 || responseData.followup_question_01 || '';
            followupQuestion02 = responseData.followup_question02 || responseData.followupQuestion02 || responseData.followup_question_02 || '';
            console.log('Found answer and followup questions:', { rawResponse, followupQuestion01, followupQuestion02 });
        } else if (responseData && (responseData.response || responseData.Response)) {
            rawResponse = responseData.response || responseData.Response;
            // Check if followup questions are also in response object
            followupQuestion01 = responseData.followup_question01 || responseData.followupQuestion01 || responseData.followup_question_01 || '';
            followupQuestion02 = responseData.followup_question02 || responseData.followupQuestion02 || responseData.followup_question_02 || '';
        } else if (responseData && (responseData.message || responseData.Message)) {
            rawResponse = responseData.message || responseData.Message;
        } else if (responseData && (responseData.text || responseData.Text)) {
            rawResponse = responseData.text || responseData.Text;
        } else if (responseData && responseData.data) {
            // Handle nested data object
            const nestedData = responseData.data;
            rawResponse = nestedData.answer || nestedData.Answer || nestedData.response || nestedData.Response || nestedData.message || nestedData.Message || '';
            followupQuestion01 = nestedData.followup_question01 || nestedData.followupQuestion01 || nestedData.followup_question_01 || '';
            followupQuestion02 = nestedData.followup_question02 || nestedData.followupQuestion02 || nestedData.followup_question_02 || '';
        } else if (responseData && responseData.output) {
            // Handle output field - it may be a string with JSON wrapped in markdown code blocks
            let outputValue = responseData.output;
            
            // If output is a string, try to extract JSON from markdown code blocks
            if (typeof outputValue === 'string') {
                console.log('Found output as string, attempting to parse JSON from markdown code block...');
                
                // Remove markdown code block markers (```json and ```)
                outputValue = outputValue.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                
                // Try to parse as JSON
                try {
                    const parsedOutput = JSON.parse(outputValue);
                    console.log('Successfully parsed JSON from output:', parsedOutput);
                    
                    // Extract values from parsed JSON
                    rawResponse = parsedOutput.answer || parsedOutput.Answer || '';
                    followupQuestion01 = parsedOutput.followup_question01 || parsedOutput.followupQuestion01 || parsedOutput.followup_question_01 || '';
                    followupQuestion02 = parsedOutput.followup_question02 || parsedOutput.followupQuestion02 || parsedOutput.followup_question_02 || '';
                    
                    console.log('Extracted from parsed output:', { rawResponse, followupQuestion01, followupQuestion02 });
                } catch (parseError) {
                    console.error('Failed to parse JSON from output string:', parseError);
                    console.log('Raw output value:', outputValue);
                    // If parsing fails, use the raw string as response
                    rawResponse = outputValue;
                }
            } else if (typeof outputValue === 'object' && outputValue.response) {
                // If output is an object with response field
                rawResponse = outputValue.response;
            } else {
                // If output is already an object, check for answer/response fields directly
                rawResponse = outputValue.answer || outputValue.Answer || outputValue.response || outputValue.Response || '';
                followupQuestion01 = outputValue.followup_question01 || outputValue.followupQuestion01 || outputValue.followup_question_01 || '';
                followupQuestion02 = outputValue.followup_question02 || outputValue.followupQuestion02 || outputValue.followup_question_02 || '';
            }
        } else if (responseData && responseData.output && responseData.output.response) {
            rawResponse = responseData.output.response;
        } else {
            // Log the full structure for debugging
            console.error('Could not parse n8n response.');
            console.error('Response type:', typeof responseData);
            console.error('Is array:', Array.isArray(responseData));
            console.error('Available keys:', responseData ? Object.keys(responseData) : 'no data');
            console.error('Full response:', responseData);
            rawResponse = 'I apologize, but I couldn\'t process that request.';
        }

        // Print extracted values for debugging - MAKE THIS VERY VISIBLE
        console.log('');
        console.log('╔════════════════════════════════════════════╗');
        console.log('║   EXTRACTED VALUES FROM N8N RESPONSE      ║');
        console.log('╠════════════════════════════════════════════╣');
        console.log('║ answer:', rawResponse || '(EMPTY)'.padEnd(35), '║');
        console.log('║ followup_question01:', (followupQuestion01 || '(EMPTY)').padEnd(27), '║');
        console.log('║ followup_question02:', (followupQuestion02 || '(EMPTY)').padEnd(27), '║');
        console.log('╚════════════════════════════════════════════╝');
        console.log('');

        // Use the raw response directly from n8n (no OpenAI formatting needed)
        const botResponse = rawResponse;

        // Add bot response to history
        state.conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });

        // Display bot response
        sendMessage(botResponse, 'bot');

        // Show followup questions from n8n response
        if (followupQuestion01 || followupQuestion02) {
            const followupQuestions = [followupQuestion01, followupQuestion02].filter(q => q && q.trim() !== '');
            if (followupQuestions.length > 0) {
                showSampleQuestions(followupQuestions);
            } else {
                // If no followup questions, show default options
                showDefaultOptions();
            }
        } else {
            // If no followup questions in response, show default options
            showDefaultOptions();
        }

    } catch (error) {
        console.error('Error in handleUserMessage:', error);
        let errorMessage = 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
        
        // Use the error message if it's user-friendly, otherwise provide generic message
        if (error.message && !error.message.includes('n8n webhook error') && !error.message.includes('Failed to fetch')) {
            // Use the specific error message (already user-friendly)
            errorMessage = error.message;
        } else if (error.message && error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message && error.message.includes('technical difficulties')) {
            errorMessage = error.message; // Use the user-friendly message we created
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

// OpenAI formatting function removed - using n8n responses directly

// Show followup questions from n8n response as quick options
function showSampleQuestions(questions) {
    if (!quickOptions) {
        console.error('Quick options container not found');
        return;
    }
    
    // Clear existing options
    quickOptions.innerHTML = '';

    // Add only the followup questions from n8n (no default options after initial load)
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
    console.log('showLoading called:', show);
    if (!loadingIndicator) {
        console.error('loadingIndicator not found');
        return;
    }
    if (!chatMessages) {
        console.error('chatMessages not found');
        return;
    }
    
    if (show) {
        console.log('Showing loading indicator');
        // Ensure loading indicator is at the end of chat messages
        // Remove it from current position and append to end
        if (loadingIndicator.parentNode === chatMessages) {
            chatMessages.removeChild(loadingIndicator);
        }
        chatMessages.appendChild(loadingIndicator);
        
        loadingIndicator.classList.add('active');
        // Scroll to show loading indicator
        setTimeout(() => {
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }, 50);
    } else {
        console.log('Hiding loading indicator');
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

