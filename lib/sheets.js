/**
 * Extract spreadsheet ID from URL
 * @param {string} url - Google Sheets URL
 * @returns {string} Spreadsheet ID
 */
export function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Sheets URL');
  }
  return match[1];
}

/**
 * Read recipients from Google Sheet
 * @param {string} token - OAuth2 token
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {string} range - Sheet range (e.g., 'Sheet1!A1:F100')
 * @returns {Promise<Array>} Array of recipient objects
 */
export async function readRecipientsFromSheet(token, spreadsheetId, range = 'Sheet1!A1:F100') {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to read sheet');
  }
  
  const data = await response.json();
  const rows = data.values || [];
  
  if (rows.length === 0) {
    return [];
  }
  
  // First row is headers
  const headers = rows[0];
  const recipients = [];
  
  // Convert rows to objects
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const recipient = {
      rowIndex: i + 1 // Track row number (1-indexed, +1 for header)
    };
    
    headers.forEach((header, index) => {
      recipient[header] = row[index] || '';
    });
    
    // Only add if email exists
    if (recipient.Email && recipient.Email.trim()) {
      recipients.push(recipient);
    }
  }
  
  return recipients;
}

/**
 * Update status in Google Sheet
 * @param {string} token - OAuth2 token
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {number} rowIndex - Row number (1-indexed)
 * @param {string} status - Status to write
 * @param {string} sheetName - Sheet name
 * @returns {Promise<void>}
 */
export async function updateSheetStatus(token, spreadsheetId, rowIndex, status, sheetName = 'Sheet1') {
  // Find Status column (assume it's column E or F)
  const statusColumn = 'E'; // Adjust based on your sheet structure
  const range = `${sheetName}!${statusColumn}${rowIndex}`;
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[status]]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update sheet');
  }
}

/**
 * Batch update sheet statuses
 * @param {string} token - OAuth2 token
 * @param {string} spreadsheetId - Spreadsheet ID
 * @param {Array} updates - Array of {rowIndex, status}
 * @param {string} sheetName - Sheet name
 * @returns {Promise<void>}
 */
export async function batchUpdateSheetStatuses(token, spreadsheetId, updates, sheetName = 'Sheet1') {
  const statusColumn = 'E';
  
  const data = updates.map(update => ({
    range: `${sheetName}!${statusColumn}${update.rowIndex}`,
    values: [[update.status]]
  }));
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: data
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to batch update sheet');
  }
}

/**
 * Get sheet metadata
 * @param {string} token - OAuth2 token
 * @param {string} spreadsheetId - Spreadsheet ID
 * @returns {Promise<object>} Sheet metadata
 */
export async function getSheetMetadata(token, spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get sheet metadata');
  }
  
  return await response.json();
}