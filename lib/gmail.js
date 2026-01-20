/**
 * Send a single email using Gmail API
 * @param {string} token - OAuth2 token
 * @param {object} emailData - Email data
 * @returns {Promise<object>} Response from Gmail API
 */
export async function sendEmail(token, emailData) {
  const { to, subject, body, fromName = 'Me' } = emailData;
  
  // Create email in RFC 2822 format
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\r\n');
  
  // Encode email in base64url format
  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Send via Gmail API
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedEmail
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send email');
  }
  
  return await response.json();
}

/**
 * Get user's email address from Gmail API
 * @param {string} token - OAuth2 token
 * @returns {Promise<string>} Email address
 */
export async function getUserEmail(token) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user email');
  }
  
  const data = await response.json();
  return data.emailAddress;
}

/**
 * Send multiple emails sequentially
 * @param {string} token - OAuth2 token
 * @param {Array} recipients - Array of recipient data
 * @param {object} template - Email template
 * @param {Function} progressCallback - Called after each send
 * @param {object} rateLimiter - Rate limiter instance
 * @returns {Promise<Array>} Results for each send
 */
export async function sendBatchEmails(token, recipients, template, progressCallback, rateLimiter) {
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
      
      // Send email
      const response = await sendEmail(token, {
        to: recipient.email,
        subject: template.subject,
        body: template.body
      });
      
      // Record send
      await rateLimiter.recordSend();
      
      results.push({
        recipient,
        success: true,
        messageId: response.id
      });
      
      // Update progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: recipients.length,
          recipient: recipient.email,
          success: true
        });
      }
      
    } catch (error) {
      results.push({
        recipient,
        success: false,
        error: error.message
      });
      
      // Update progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: recipients.length,
          recipient: recipient.email,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  return results;
}