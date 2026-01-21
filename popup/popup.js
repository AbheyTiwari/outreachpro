// Message types
const MESSAGE_TYPES = {
  SEND_EMAILS: 'SEND_EMAILS',
  REFINE_TEMPLATE: 'REFINE_TEMPLATE',
  GET_AUTH_TOKEN: 'GET_AUTH_TOKEN',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  SEND_COMPLETE: 'SEND_COMPLETE',
  ERROR: 'ERROR'
};

// DOM Elements (will be initialized in init)
let subjectInput;
let bodyTextarea;
let sendButton;
let aiButton;
let statusText;
let variableButtons;

// Preview elements
let previewCard;
let previewInitials;
let previewName;
let previewCompany;
let previewSubject;
let previewBody;
let previewRecipient;

// State
let isSending = false;
let dailySendLimitReached = false;

// TEST MODE - Skip authentication
const TEST_MODE = false;

/**
 * Initialize popup
 */
async function init() {
  console.log('Initializing OutreachPro popup...');
  
  // Get DOM elements
  subjectInput = document.getElementById('subjectInput');
  bodyTextarea = document.getElementById('bodyTextarea');
  sendButton = document.getElementById('sendButton');
  aiButton = document.getElementById('aiButton');
  statusText = document.getElementById('statusText');
  variableButtons = document.querySelectorAll('[data-variable]');
  
  previewCard = document.getElementById('previewCard');
  previewInitials = document.getElementById('previewInitials');
  previewName = document.getElementById('previewName');
  previewCompany = document.getElementById('previewCompany');
  previewSubject = document.getElementById('previewSubject');
  previewBody = document.getElementById('previewBody');
  previewRecipient = document.getElementById('previewRecipient');
  
  if (TEST_MODE) {
    console.log('🧪 TEST MODE ENABLED - Authentication skipped');
  }
  
  // Load saved template
  const saved = await chrome.storage.local.get([
    'lastTemplate', 
    'sheetUrl', 
    'geminiApiKey', 
    'sentToday', 
    'lastResetDate'
  ]);
  
  if (saved.lastTemplate) {
    subjectInput.value = saved.lastTemplate.subject || '';
    bodyTextarea.value = saved.lastTemplate.body || '';
  }
  
  // Check daily limit
  const today = new Date().toDateString();
  if (saved.lastResetDate !== today) {
    dailySendLimitReached = false;
  } else if (saved.sentToday >= 500) {
    dailySendLimitReached = true;
    disableSendButton('Daily limit reached');
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Update preview on load
  updateLivePreview();
  
  // Show test mode message
  if (TEST_MODE) {
    updateStatus('🧪 TEST MODE - Auth skipped', 'warning');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Send button
  if (sendButton) {
    console.log('Attaching send button listener');
    sendButton.addEventListener('click', handleSendEmails);
  } else {
    console.error('Send button not found');
  }
  
  // AI refine button
  if (aiButton) {
    console.log('Attaching AI button listener');
    aiButton.addEventListener('click', handleRefineTemplate);
  } else {
    console.error('AI button not found');
  }
  
  // Variable insertion buttons
  if (variableButtons && variableButtons.length > 0) {
    console.log('Attaching variable button listeners');
    variableButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const variable = button.getAttribute('data-variable');
        console.log('Variable clicked:', variable);
        insertVariable(variable);
      });
    });
  }
  
  // Auto-save template
  if (subjectInput) {
    subjectInput.addEventListener('input', () => {
      saveTemplate();
      updateLivePreview();
    });
  }
  
  if (bodyTextarea) {
    bodyTextarea.addEventListener('input', () => {
      saveTemplate();
      updateLivePreview();
    });
  }
  
  // Listen for background messages
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  
  console.log('Event listeners setup complete');
}

/**
 * Handle send emails button click
 */
async function handleSendEmails() {
  console.log('Send button clicked');
  
  if (isSending || dailySendLimitReached) {
    console.log('Already sending or limit reached');
    return;
  }
  
  const subject = subjectInput.value.trim();
  const body = bodyTextarea.value.trim();
  
  console.log('Subject:', subject);
  console.log('Body:', body);
  
  // Validate inputs
  if (!subject || !body) {
    showNotification('Please fill in subject and body', 'error');
    return;
  }
  
  // Get sheet URL from user
  const sheetUrl = await promptForSheetUrl();
  if (!sheetUrl) {
    console.log('No sheet URL provided');
    return;
  }
  
  // Confirm send
  const confirmed = confirm(
    `This will send personalized emails to all recipients in your sheet.\n\n` +
    `Subject: ${subject}\n\n` +
    `Are you sure you want to continue?`
  );
  
  if (!confirmed) {
    console.log('User cancelled send');
    return;
  }
  
  // Update UI
  isSending = true;
  sendButton.disabled = true;
  updateButtonState('sending', 'Preparing...');
  
  try {
    console.log('Sending emails...');
    // Send message to background with timeout
    const sendPromise = chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SEND_EMAILS,
      data: {
        subject,
        body,
        sheetUrl,
        sheetRange: 'A1:F'
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - no response from service worker')), 60000)
    );
    
    const response = await Promise.race([sendPromise, timeoutPromise]);
    
    console.log('Send response:', response);
    
    if (response.success) {
      const { successful, failed, total } = response.results;
      showNotification(
        `Sent ${successful} of ${total} emails successfully!`,
        'success'
      );
      updateStatus(`Sent ${successful}/${total}`, 'success');
      
      // Check if we hit the limit
      const saved = await chrome.storage.local.get(['sentToday']);
      if (saved.sentToday >= 500) {
        dailySendLimitReached = true;
        disableSendButton('Daily limit reached');
      }
    } else {
      showNotification(response.error || 'Failed to send emails', 'error');
      updateStatus('Send failed', 'error');
    }
    
  } catch (error) {
    console.error('Send error:', error);
    showNotification(error.message || 'Failed to send emails', 'error');
    updateStatus('Error', 'error');
  } finally {
    isSending = false;
    if (!dailySendLimitReached) {
      sendButton.disabled = false;
      updateButtonState('ready');
    }
  }
}

/**
 * Handle AI refine button click
 */
async function handleRefineTemplate() {
  console.log('AI Refine button clicked');
  
  const subject = subjectInput.value.trim();
  const body = bodyTextarea.value.trim();
  
  console.log('Refining - Subject:', subject);
  console.log('Refining - Body:', body);
  
  if (!subject || !body) {
    showNotification('Please fill in subject and body first', 'error');
    return;
  }
  
  // Get API key
  const saved = await chrome.storage.local.get(['geminiApiKey']);
  let apiKey = saved.geminiApiKey;
  
  if (!apiKey) {
    apiKey = prompt('Please enter your Gemini API key:');
    if (!apiKey) {
      console.log('No API key provided');
      return;
    }
    await chrome.storage.local.set({ geminiApiKey: apiKey });
  }
  
  console.log('Using Gemini API for refinement');
  
  // Show loading
  aiButton.disabled = true;
  aiButton.classList.add('loading');
  updateStatus('Refining with AI...', 'info');
  
  try {
    console.log('Sending refine request to background');
    
    const refinePromise = chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.REFINE_TEMPLATE,
      data: { subject, body, apiKey }
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - Gemini API took too long')), 45000)
    );
    
    const response = await Promise.race([refinePromise, timeoutPromise]);
    
    console.log('Refine response:', response);
    
    if (response.success) {
      // Update fields with refined content (preserving variables)
      const refined = response.refined;
      console.log('Refined subject:', refined.subject);
      console.log('Refined body:', refined.body);
      
      subjectInput.value = refined.subject;
      bodyTextarea.value = refined.body;
      saveTemplate();
      updateLivePreview();
      showNotification('Template refined successfully!', 'success');
      updateStatus('Template refined', 'success');
    } else {
      console.error('Refine error response:', response.error);
      showNotification(response.error || 'Failed to refine template', 'error');
      updateStatus('Refinement failed', 'error');
    }
    
  } catch (error) {
    console.error('Refine error:', error);
    showNotification('Failed to refine template: ' + error.message, 'error');
    updateStatus('Error', 'error');
  } finally {
    aiButton.disabled = false;
    aiButton.classList.remove('loading');
  }
}

/**
 * Insert variable at cursor position
 */
function insertVariable(variable) {
  console.log('Inserting variable:', variable);
  
  // Determine which field has focus
  const activeElement = document.activeElement;
  const targetField = (activeElement === subjectInput || activeElement === bodyTextarea) 
    ? activeElement 
    : bodyTextarea;
  
  const start = targetField.selectionStart;
  const end = targetField.selectionEnd;
  const text = targetField.value;
  
  targetField.value = text.substring(0, start) + variable + text.substring(end);
  targetField.selectionStart = targetField.selectionEnd = start + variable.length;
  targetField.focus();
  
  saveTemplate();
  updateLivePreview();
}

/**
 * Save template to storage
 */
async function saveTemplate() {
  await chrome.storage.local.set({
    lastTemplate: {
      subject: subjectInput.value,
      body: bodyTextarea.value
    }
  });
}

/**
 * Prompt user for sheet URL
 */
async function promptForSheetUrl() {
  const saved = await chrome.storage.local.get(['sheetUrl']);
  
  const url = prompt(
    'Enter your Google Sheets URL:',
    saved.sheetUrl || 'https://docs.google.com/spreadsheets/d/...'
  );
  
  if (!url) return null;
  
  // Validate URL
  if (!url.includes('spreadsheets/d/')) {
    showNotification('Invalid Google Sheets URL', 'error');
    return null;
  }
  
  // Save for next time
  await chrome.storage.local.set({ sheetUrl: url });
  
  return url;
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(message) {
  console.log('Message from background:', message.type);
  
  switch (message.type) {
    case MESSAGE_TYPES.UPDATE_PROGRESS:
      updateProgress(message.message, message.data);
      break;
    
    case MESSAGE_TYPES.SEND_COMPLETE:
      console.log('Send complete:', message.data);
      break;
    
    case MESSAGE_TYPES.ERROR:
      showNotification(message.error, 'error');
      break;
  }
}

/**
 * Update progress display
 */
function updateProgress(message, data = {}) {
  console.log('Progress:', message, data);
  
  // Always update status text
  updateStatus(message, 'info');
  
  // Update button if we have current/total
  if (data.current && data.total) {
    updateButtonState('sending', `Sending ${data.current}/${data.total}`);
  } else {
    updateButtonState('sending', message);
  }
}

/**
 * Update button state
 */
function updateButtonState(state, text = '') {
  if (!sendButton) return;
  
  switch (state) {
    case 'sending':
      sendButton.innerHTML = `
        <span style="animation: spin 1s linear infinite;">⟳</span>
        <span>${text || 'Sending...'}</span>
      `;
      break;
    case 'ready':
    default:
      sendButton.innerHTML = `
        <span>Send Outreach</span>
        <span class="icon">📨</span>
      `;
      break;
  }
}

/**
 * Update status text
 */
function updateStatus(message, type = 'info') {
  if (!statusText) return;
  
  statusText.textContent = message;
  statusText.className = 'status-text';
  
  if (type === 'success') {
    statusText.classList.add('success');
  } else if (type === 'error') {
    statusText.classList.add('error');
  } else if (type === 'warning') {
    statusText.classList.add('warning');
  }
}

/**
 * Disable send button permanently
 */
function disableSendButton(reason) {
  if (!sendButton) return;
  
  sendButton.disabled = true;
  sendButton.innerHTML = `
    <span class="icon">🚫</span>
    <span>${reason}</span>
  `;
  sendButton.style.background = '#9ca3af';
  sendButton.style.cursor = 'not-allowed';
  updateStatus(reason, 'warning');
}

/**
 * Update live preview with personalized content
 */
function updateLivePreview() {
  if (!previewSubject || !previewBody) return;
  
  // Mock recipient for preview
  const mockRecipient = {
    'First Name': 'Jane',
    'Email': 'jane@example.com',
    'Company': 'TechStart',
    'Role': 'Founder'
  };
  
  // Get templates
  const subject = subjectInput.value;
  const body = bodyTextarea.value;
  
  // Personalize
  let personalizedSubject = subject;
  let personalizedBody = body;
  
  // Replace variables
  personalizedSubject = personalizedSubject.replace(/{First Name}/g, mockRecipient['First Name']);
  personalizedSubject = personalizedSubject.replace(/{Company}/g, mockRecipient['Company']);
  personalizedSubject = personalizedSubject.replace(/{Role}/g, mockRecipient['Role']);
  
  personalizedBody = personalizedBody.replace(/{First Name}/g, mockRecipient['First Name']);
  personalizedBody = personalizedBody.replace(/{Company}/g, mockRecipient['Company']);
  personalizedBody = personalizedBody.replace(/{Role}/g, mockRecipient['Role']);
  personalizedBody = personalizedBody.replace(/{Email}/g, mockRecipient['Email']);
  
  // Update preview
  if (previewInitials) previewInitials.textContent = mockRecipient['First Name'].charAt(0) + 'D';
  if (previewName) previewName.textContent = mockRecipient['First Name'] + ' Doe';
  if (previewCompany) previewCompany.textContent = mockRecipient['Role'] + ' @ ' + mockRecipient['Company'];
  if (previewSubject) previewSubject.textContent = personalizedSubject;
  if (previewBody) previewBody.textContent = personalizedBody;
  if (previewRecipient) previewRecipient.textContent = 'Recipient: ' + mockRecipient['First Name'] + ' Doe';
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.opacity = '0';
  
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => notification.style.opacity = '1', 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('OutreachPro popup script loaded');
