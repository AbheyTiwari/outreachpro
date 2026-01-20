// Message types
const MESSAGE_TYPES = {
  SEND_EMAILS: 'SEND_EMAILS',
  REFINE_TEMPLATE: 'REFINE_TEMPLATE',
  GET_AUTH_TOKEN: 'GET_AUTH_TOKEN',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  SEND_COMPLETE: 'SEND_COMPLETE',
  ERROR: 'ERROR'
};

// DOM Elements
const subjectInput = document.getElementById('subjectInput');
const bodyTextarea = document.getElementById('bodyTextarea');
const sendButton = document.getElementById('sendButton');
const aiButton = document.getElementById('aiButton');
const statusText = document.getElementById('statusText');
const variableButtons = document.querySelectorAll('[data-variable]');

// State
let isSending = false;
let dailySendLimitReached = false;

/**
 * Initialize popup
 */
async function init() {
  console.log('Initializing OutreachPro popup...');
  
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
  
  // ⚡ TEMPORARY AUTH TEST - REMOVE AFTER TESTING
  console.log('🔑 Forcing auth test...');
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_AUTH_TOKEN,
    interactive: true
  }).then(res => {
    console.log('✅ Auth response:', res);
    if (res.success) {
      updateStatus('✅ Authenticated!', 'success');
    } else {
      updateStatus('❌ Auth failed', 'error');
      console.error('Auth error:', res.error);
    }
  }).catch(err => {
    console.error('❌ Auth request failed:', err);
    updateStatus('Auth request failed', 'error');
  });
  // ⚡ END TEMPORARY AUTH TEST
  
  // Normal silent check (keep this for later)
  // checkAuth();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Send button
  if (sendButton) {
    sendButton.addEventListener('click', handleSendEmails);
  }
  
  // AI refine button
  if (aiButton) {
    aiButton.addEventListener('click', handleRefineTemplate);
  }
  
  // Variable insertion buttons
  variableButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const variable = button.getAttribute('data-variable');
      insertVariable(variable);
    });
  });
  
  // Auto-save template
  if (subjectInput) {
    subjectInput.addEventListener('input', saveTemplate);
  }
  if (bodyTextarea) {
    bodyTextarea.addEventListener('input', saveTemplate);
  }
  
  // Listen for background messages
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);
}

/**
 * Check authentication status (silent)
 */
async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_AUTH_TOKEN,
      interactive: false
    });
    
    if (!response.success) {
      updateStatus('Click to sign in to Google', 'warning');
    } else {
      updateStatus('Ready to send', 'success');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    updateStatus('Auth check failed', 'error');
  }
}

/**
 * Handle send emails button click
 */
async function handleSendEmails() {
  if (isSending || dailySendLimitReached) return;
  
  const subject = subjectInput.value.trim();
  const body = bodyTextarea.value.trim();
  
  // Validate inputs
  if (!subject || !body) {
    showNotification('Please fill in subject and body', 'error');
    return;
  }
  
  // Get sheet URL from user
  const sheetUrl = await promptForSheetUrl();
  if (!sheetUrl) return;
  
  // Confirm send
  const confirmed = confirm(
    `This will send personalized emails to all recipients in your sheet.\n\n` +
    `Subject: ${subject}\n\n` +
    `Are you sure you want to continue?`
  );
  
  if (!confirmed) return;
  
  // Update UI
  isSending = true;
  sendButton.disabled = true;
  updateButtonState('sending', 'Preparing...');
  
  try {
    // Send message to background
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SEND_EMAILS,
      data: {
        subject,
        body,
        sheetUrl,
        sheetRange: 'A1:F'
      }
    });
    
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
  const subject = subjectInput.value.trim();
  const body = bodyTextarea.value.trim();
  
  if (!subject || !body) {
    showNotification('Please fill in subject and body first', 'error');
    return;
  }
  
  // Get API key
  const saved = await chrome.storage.local.get(['geminiApiKey']);
  let apiKey = saved.geminiApiKey;
  
  if (!apiKey) {
    apiKey = prompt('Please enter your Gemini API key:');
    if (!apiKey) return;
    await chrome.storage.local.set({ geminiApiKey: apiKey });
  }
  
  // Show loading
  aiButton.disabled = true;
  aiButton.classList.add('loading');
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.REFINE_TEMPLATE,
      data: { subject, body, apiKey }
    });
    
    if (response.success) {
      // Update fields with refined content
      subjectInput.value = response.refined.subject;
      bodyTextarea.value = response.refined.body;
      saveTemplate();
      showNotification('Template refined successfully!', 'success');
    } else {
      showNotification(response.error || 'Failed to refine template', 'error');
    }
    
  } catch (error) {
    console.error('Refine error:', error);
    showNotification('Failed to refine template', 'error');
  } finally {
    aiButton.disabled = false;
    aiButton.classList.remove('loading');
  }
}

/**
 * Insert variable at cursor position
 */
function insertVariable(variable) {
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