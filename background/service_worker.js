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
    // Get auth token
    notifyProgress(sender, 'Authenticating...', { current: 0, total: 0 });
    const token = await getAuthToken(true);
    
    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    
    // Read recipients from sheet
    notifyProgress(sender, 'Reading recipients...', { current: 0, total: 0 });
    const recipients = await readRecipientsFromSheet(token, spreadsheetId, sheetRange);
    
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
    
    const results = await sendBatchEmails(
      token,
      validRecipients,
      { subject, body },
      (progress) => {
        // Update progress in real-time with both current/total AND message
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
    
    const updates = results.map((result, index) => ({
      rowIndex: validRecipients[index].rowIndex,
      status: result.success ? `Sent ${new Date().toLocaleString()}` : `Failed: ${result.error}`
    }));
    
    await batchUpdateSheetStatuses(token, spreadsheetId, updates);
    
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
  
  try {
    const refined = await refineEmailTemplate(apiKey, subject, body);
    return { success: true, refined };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Send progress update to popup - IMPROVED with proper data structure
 */
function notifyProgress(sender, message, data = {}) {
  if (sender.tab) return; // Don't send to content scripts
  
  try {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_PROGRESS,
      message,
      data: {
        current: data.current || 0,
        total: data.total || 0,
        ...data
      }
    });
  } catch (e) {
    // Popup might be closed, this is OK
    console.log('Progress update not delivered (popup likely closed)');
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

console.log('OutreachPro service worker loaded');