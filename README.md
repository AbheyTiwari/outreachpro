# OutreachPro

A Chrome extension for personalized email outreach at scale. Send customized emails to multiple recipients using Google Sheets as your contact database, with AI-powered template refinement.

## Overview

OutreachPro streamlines cold email campaigns by combining Google Sheets contact management with Gmail's sending capabilities. The extension personalizes each email using template variables and includes AI assistance to improve your messaging.

## Features

### Core Functionality
- **Batch Email Sending**: Send personalized emails to multiple recipients from a Google Sheet
- **Template Variables**: Dynamic content insertion using `{First Name}`, `{Company}`, `{Role}`, and `{Email}`
- **Live Preview**: See how your email will look with actual recipient data before sending
- **AI Refinement**: Improve your email copy using Google's Gemini AI
- **Progress Tracking**: Real-time updates as emails are sent
- **Status Updates**: Automatically updates your Google Sheet with send status

### Safety Features
- **Rate Limiting**: Respects Gmail's 500 emails/day limit
- **Send Delays**: 3-second intervals between emails to avoid triggering spam filters
- **Input Validation**: Verifies email addresses and required fields before sending
- **Daily Reset**: Send counter resets at midnight

## Installation

### Prerequisites
- Google Chrome browser
- Google account with Gmail enabled
- Google Cloud Console project

### Setup Steps

1. **Clone the Repository**
```bash
   git clone https://github.com/yourusername/outreachpro.git
   cd outreachpro
```

2. **Configure Google Cloud**
   
   Create a new project in [Google Cloud Console](https://console.cloud.google.com/):
   
   - Navigate to "APIs & Services" → "Enabled APIs"
   - Enable the following APIs:
     - Gmail API
     - Google Sheets API
   
   - Go to "OAuth consent screen"
     - Choose "External" user type
     - Fill in application name: "OutreachPro"
     - Add your email as a test user
   
   - Go to "Credentials"
     - Create "OAuth 2.0 Client ID"
     - Application type: "Chrome Extension"
     - Copy the Client ID

3. **Update Manifest**
   
   Open `Manifest.json` and replace the client_id:
```json
   {
     "oauth2": {
       "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
       "scopes": [
         "https://www.googleapis.com/auth/gmail.send",
         "https://www.googleapis.com/auth/spreadsheets"
       ]
     }
   }
```

4. **Load Extension in Chrome**
   
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the OutreachPro directory

5. **Get Gemini API Key** (Optional, for AI features)
   
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - The extension will prompt for this when you use AI refinement

## Usage

### Preparing Your Google Sheet

Create a Google Sheet with the following columns:

| First Name | Email | Company | Role | Status | Sent At |
|------------|-------|---------|------|--------|---------|
| Jane | jane@example.com | TechStart | Founder | | |
| John | john@devco.com | DevCo | CEO | | |

**Required columns**: First Name, Email  
**Optional columns**: Company, Role  
**Auto-filled**: Status, Sent At

### Sending Emails

1. Click the OutreachPro icon in your Chrome toolbar
2. Write your email template using variables:
```
   Subject: Quick question for {First Name}
   
   Hi {First Name},
   
   I noticed your work at {Company} and wanted to reach out...
```

3. Use the variable buttons to insert `{First Name}`, `{Company}`, or `{Role}`
4. Click the AI button to refine your template (optional)
5. Preview how the email looks with the sample recipient
6. Click "Send Outreach"
7. Paste your Google Sheets URL when prompted
8. Confirm to start sending

### Template Variables

Available variables that get replaced with recipient data:

- `{First Name}` - Recipient's first name
- `{Email}` - Recipient's email address
- `{Company}` - Company name
- `{Role}` - Job title or role

### AI Template Refinement

The AI assistant helps improve your email copy:

1. Write your initial template
2. Click the brain icon in the body section
3. Enter your Gemini API key (first time only)
4. Wait for the AI to refine your message
5. Review and edit the suggested improvements

The AI preserves your template variables while enhancing:
- Subject line clarity and engagement
- Email body professionalism
- Call-to-action effectiveness
- Overall response probability

## Project Structure
```
outreachpro/
├── manifest.json           # Extension configuration
├── popup/
│   ├── popup.html         # Main interface
│   ├── popup.css          # Styling
│   └── popup.js           # UI logic
├── background/
│   └── service_worker.js  # Background processes
├── lib/
│   ├── auth.js           # OAuth authentication
│   ├── gmail.js          # Gmail API integration
│   ├── sheets.js         # Google Sheets API
│   ├── gemini.js         # AI template refinement
│   └── rateLimiter.js    # Send rate management
├── utils/
│   ├── constants.js      # Configuration constants
│   └── validators.js     # Input validation
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## API Integration

### Gmail API
- **Endpoint**: `gmail.googleapis.com/gmail/v1/users/me/messages/send`
- **Scope**: `https://www.googleapis.com/auth/gmail.send`
- **Rate Limit**: 500 emails/day

### Google Sheets API
- **Endpoint**: `sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}`
- **Scope**: `https://www.googleapis.com/auth/spreadsheets`
- **Operations**: Read recipient data, write status updates

### Gemini API
- **Endpoint**: `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- **Model**: gemini-2.5-flash
- **Purpose**: Email template optimization

## Troubleshooting

### Authentication Issues

**Error: "access_denied - OutreachPro has not completed the Google verification process"**

Solution: Add your email as a test user in Google Cloud Console
1. Go to OAuth consent screen
2. Scroll to "Test users"
3. Add your email address
4. Reload the extension

### Email Sending Failures

**Error: "Daily send limit reached"**

The extension respects Gmail's 500 email/day limit. Wait until midnight for the counter to reset.

**Error: "Failed to read sheet"**

Verify your sheet permissions and URL format:
- Sheet must be accessible by your Google account
- URL format: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### Extension Errors

Check the Chrome extension console:
1. Visit `chrome://extensions/`
2. Find OutreachPro
3. Click "Errors" to view logs
4. Click "Inspect views: service worker" for background logs

## Best Practices

### Email Deliverability
- Start with small batches (10-20 emails) to establish sender reputation
- Warm up your account by gradually increasing daily volume
- Personalize each email beyond just the name
- Include a clear unsubscribe option

### Template Writing
- Keep subject lines under 50 characters
- Focus on the recipient's needs, not your product
- Include a specific, low-friction call-to-action
- Maintain a professional but conversational tone

### Sheet Management
- Keep a backup copy before running campaigns
- Use the Status column to track sends
- Filter out previously contacted recipients
- Regularly clean and update your contact list

## Privacy & Security

- Your OAuth token is stored locally in Chrome's secure storage
- Emails are sent directly through your Gmail account
- No email content is stored by the extension
- Gemini API key is stored locally (not transmitted elsewhere)
- The extension only requests minimum necessary permissions

## Limitations

- Maximum 500 emails per day (Gmail API restriction)
- 3-second delay between sends (anti-spam protection)
- Requires active Chrome session while sending
- Cannot send attachments
- Plain text emails only (no HTML formatting)

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Make your changes with clear commit messages
4. Test thoroughly with real APIs
5. Submit a pull request with a description of changes

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Include Chrome version, error messages, and steps to reproduce
- Check existing issues before creating new ones

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with Chrome Extension Manifest V3
- Uses Google's Gmail, Sheets, and Gemini APIs
- Inspired by modern cold email outreach tools

---

**Note**: This extension is for legitimate outreach only. Respect anti-spam laws and always provide recipients with a way to unsubscribe.