// API Configuration
export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets'
];

// Gmail API Limits
export const GMAIL_LIMITS = {
  MAX_PER_DAY: 500,
  MAX_PER_MINUTE: 20,
  DELAY_BETWEEN_SENDS: 3000 // 3 seconds
};

// Google Sheets Configuration
export const SHEET_COLUMNS = {
  FIRST_NAME: 'First Name',
  EMAIL: 'Email',
  COMPANY: 'Company',
  ROLE: 'Role',
  STATUS: 'Status',
  SENT_AT: 'Sent At'
};

// Message Types
export const MESSAGE_TYPES = {
  SEND_EMAILS: 'SEND_EMAILS',
  REFINE_TEMPLATE: 'REFINE_TEMPLATE',
  GET_AUTH_TOKEN: 'GET_AUTH_TOKEN',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  SEND_COMPLETE: 'SEND_COMPLETE',
  ERROR: 'ERROR'
};

// Template Variables
export const TEMPLATE_VARS = [
  '{First Name}',
  '{Email}',
  '{Company}',
  '{Role}'
];

// Gemini API
export const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Store in chrome.storage.local instead
export const GEMINI_MODEL = 'gemini-2.5-flash';
