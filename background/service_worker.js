// Import all dependencies - use relative paths
import { getAuthToken } from '../lib/auth.js';
import { sendBatchEmails } from '../lib/gmail.js';
import { readRecipientsFromSheet, batchUpdateSheetStatuses } from '../lib/sheets.js';
import { refineEmailTemplate } from '../lib/gemini.js';
import { RateLimiter } from '../lib/rateLimiter.js';
import { personalizeTemplate, validateRecipient } from '../utils/validators.js';

// Message types
const MESSAGE_TYPES = {
  SEND_EMAILS: 'SEND_EMAILS',
  REFINE_TEMPLATE: 'REFINE_TEMPLATE',
  GET_AUTH_TOKEN: 'GET_AUTH_TOKEN',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  SEND_COMPLETE: 'SEND_COMPLETE',
  ERROR: 'ERROR'
};

// Initialize rate limiter
const rateLimiter = new RateLimiter();

// TEST MODE - Skip real authentication and use mock APIs
const TEST_MODE = false;
const MOCK_TOKEN = 'mock_test_token_12345';

// Mock test data for testing without real APIs
const MOCK_TEST_DATA = {
  recipients: [
    { 'First Name': 'Jane', 'Email': 'jane@example.com', 'Company': 'TechStart', 'Role': 'Founder', rowIndex: 2 },
    { 'First Name': 'John', 'Email': 'john@example.com', 'Company': 'DevCo', 'Role': 'CEO', rowIndex: 3 },
    { 'First Name': 'Sarah', 'Email': 'sarah@startup.com', 'Company': 'InnovateLabs', 'Role': 'CTO', rowIndex: 4 },
    { 'First Name': 'Alex', 'Email': 'alex@techventures.com', 'Company': 'TechVentures', 'Role': 'Founder', rowIndex: 5 }
  ]
};

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async messages
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  // Return true to indicate async response
  return true;
});

/**
 * Main message handler
 */
async function handleMessage(request, sender) {
  switch (request.type) {
    case MESSAGE_TYPES.GET_AUTH_TOKEN:
      return await handleGetAuthToken(request);
    
    case MESSAGE_TYPES.SEND_EMAILS:
      return await handleSendEmails(request, sender);
    
    case MESSAGE_TYPES.REFINE_TEMPLATE:
      return await handleRefineTemplate(request);
    
    default:
      throw new Error('Unknown message type');
  }
}

/**
 * Get authentication token
 */
async function handleGetAuthToken(request) {
  try {
    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Returning mock token');
      return { success: true, token: MOCK_TOKEN };
    }
    const token = await getAuthToken(request.interactive !== false);
    return { success: true, token };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle sending emails - IMPROVED progress messaging
 */
async function handleSendEmails(request, sender) {
  const { subject, body, sheetUrl, sheetRange } = request.data;
  
  try {
    // Ensure rate limiter is initialized
    await rateLimiter.ensureInitialized();
    
    // Get auth token
    notifyProgress(sender, 'Authenticating...', { current: 0, total: 0 });
    const token = TEST_MODE ? MOCK_TOKEN : await getAuthToken(true);
    
    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Read recipients from sheet
    notifyProgress(sender, 'Reading recipients...', { current: 0, total: 0 });
    const recipients = TEST_MODE 
      ? getMockRecipients() 
      : await readRecipientsFromSheet(token, spreadsheetId, sheetRange);
    
    if (recipients.length === 0) {
      throw new Error('No recipients found in sheet');
    }
    
    notifyProgress(sender, `Found ${recipients.length} recipients`, { current: 0, total: recipients.length });
    
    // Validate and personalize recipients
    const validRecipients = [];
    for (const recipient of recipients) {
      const validation = validateRecipient(recipient);
      if (validation.isValid) {
        validRecipients.push({
          ...recipient,
          personalizedSubject: personalizeTemplate(subject, recipient),
          personalizedBody: personalizeTemplate(body, recipient),
          email: recipient.Email
        });
      }
    }
    
    if (validRecipients.length === 0) {
      throw new Error('No valid recipients found');
    }
    
    notifyProgress(sender, `Validated ${validRecipients.length} recipients`, { current: 0, total: validRecipients.length });
    
    // Check rate limit
    if (!rateLimiter.canSend()) {
      throw new Error(`Daily send limit reached. Remaining: ${rateLimiter.getRemaining()}`);
    }
    
    // Send emails
    notifyProgress(sender, 'Starting to send emails...', { current: 0, total: validRecipients.length });
    
    const results = TEST_MODE
      ? await sendMockBatchEmails(validRecipients, { subject, body }, (progress) => {
          notifyProgress(sender, `Sending to ${progress.recipient}`, {
            current: progress.current,
            total: progress.total,
            success: progress.success
          });
        }, rateLimiter)
      : await sendBatchEmails(
          token,
          validRecipients,
          { subject, body },
          (progress) => {
            notifyProgress(sender, `Sending to ${progress.recipient}`, {
              current: progress.current,
              total: progress.total,
              success: progress.success
            });
          },
          rateLimiter
        );
    
    // Update sheet with results
    notifyProgress(sender, 'Updating spreadsheet...', { 
      current: validRecipients.length, 
      total: validRecipients.length 
    });
    
    if (!TEST_MODE) {
      const updates = results.map((result, index) => ({
        rowIndex: validRecipients[index].rowIndex,
        status: result.success ? `Sent ${new Date().toLocaleString()}` : `Failed: ${result.error}`
      }));
      await batchUpdateSheetStatuses(token, spreadsheetId, updates);
    } else {
      console.log('🧪 TEST MODE: Skipping sheet update');
    }
    
    // DON'T rely on SEND_COMPLETE arriving - just use sendResponse
    const finalResults = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
    
    // Try to notify, but don't fail if popup is closed
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SEND_COMPLETE,
        data: finalResults
      });
    } catch (e) {
      // Popup might be closed, ignore
      console.log('Could not send SEND_COMPLETE (popup likely closed)');
    }
    
    return {
      success: true,
      results: finalResults
    };
    
  } catch (error) {
    notifyError(sender, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handle template refinement
 */
async function handleRefineTemplate(request) {
  const { subject, body, apiKey } = request.data;
  
  console.log('Service Worker: Handling refine template request');
  console.log('Subject:', subject);
  console.log('Body length:', body.length);
  
  try {
    console.log('Calling refineEmailTemplate from lib/gemini.js');
    const refined = await refineEmailTemplate(apiKey, subject, body);
    console.log('Refinement success:', refined);
    return { success: true, refined };
  } catch (error) {
    console.error('Refinement error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send progress update to popup - IMPROVED with proper data structure
 */
function notifyProgress(sender, message, data = {}) {
  if (sender.tab) return; // Don't send to content scripts
  
  try {
    // Use a timeout to prevent hanging if popup is closed
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Notification timeout')), 1000)
    );
    
    Promise.race([
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_PROGRESS,
        message,
        data: {
          current: data.current || 0,
          total: data.total || 0,
          ...data
        }
      }),
      timeoutPromise
    ]).catch(e => {
      // Popup might be closed or timeout, this is OK
      console.log('Progress update not delivered:', e.message);
    });
  } catch (e) {
    // Ignore errors silently
    console.log('Progress notification error:', e.message);
  }
}

/**
 * Send error notification to popup
 */
function notifyError(sender, error) {
  if (sender.tab) return;
  
  try {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.ERROR,
      error
    });
  } catch (e) {
    // Popup might be closed, ignore
    console.log('Error notification not delivered (popup likely closed)');
  }
}

/**
 * Extract spreadsheet ID from URL
 */
function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL');
  }
  return match[1];
}

/**
 * MOCK API: Get test recipients
 */
function getMockRecipients() {
  console.log('🧪 Using mock recipients for testing');
  return MOCK_TEST_DATA.recipients;
}

/**
 * MOCK API: Simulate batch email sending
 */
async function sendMockBatchEmails(recipients, template, progressCallback, rateLimiter) {
  console.log('🧪 Starting mock batch email send...');
  const results = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    // Check rate limit
    if (!rateLimiter.canSend()) {
      results.push({
        recipient,
        success: false,
        error: 'Daily send limit reached'
      });
      continue;
    }
    
    try {
      // Wait for rate limit
      await rateLimiter.wait();
      
      // Simulate email sending with random delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      // Simulate success (90% success rate for testing)
      const isSuccess = Math.random() < 0.9;
      
      if (isSuccess) {
        console.log(`✅ Mock sent to ${recipient.Email}`);
        results.push({
          recipient,
          success: true,
          messageId: `mock_msg_${Date.now()}_${i}`
        });
      } else {
        console.log(`❌ Mock failed for ${recipient.Email}`);
        results.push({
          recipient,
          success: false,
          error: 'Simulated delivery failure'
        });
      }
      
      // Update progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: recipients.length,
          recipient: recipient.Email,
          success: isSuccess
        });
      }
      
      // Record send
      await rateLimiter.recordSend();
      
    } catch (error) {
      console.error(`Error in mock send:`, error);
      results.push({
        recipient,
        success: false,
        error: error.message
      });
      
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: recipients.length,
          recipient: recipient.Email,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return results;
}

console.log('OutreachPro service worker loaded');