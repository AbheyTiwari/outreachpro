# OutreachPro Chrome Extension

A Chrome extension for sending personalized email outreach campaigns using Gmail API, Google Sheets, and Gemini AI.

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud Project** with Gmail API and Sheets API enabled
2. **Gemini API Key** (optional, for AI refinement)
3. Chrome browser

### Setup Instructions

#### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Gmail API
   - Google Sheets API
4. Create OAuth 2.0 credentials:
   - Application type: Chrome Extension
   - Copy the Client ID

#### 2. Configure the Extension

Edit `manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

#### 3. Prepare Your Google Sheet

Create a Google Sheet with these columns:

| First Name | Email | Company | Role | Status |
|------------|-------|---------|------|--------|
| Jane | jane@example.com | TechStart | Founder | |
| John | john@example.com | DevCo | CEO | |

**Important:** Leave the Status column empty - it will be updated automatically.

#### 4. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `outreachpro-extension` folder
5. Pin the extension to your toolbar

#### 5. Get Gemini API Key (Optional)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. The extension will prompt you when you first use AI refinement

## 📖 How to Use

### Step 1: Write Your Template

1. Click the extension icon
2. Fill in the subject line
3. Write your email body
4. Use variable buttons to insert personalization:
   - `{First Name}`
   - `{Company}`
   - `{Role}`

Example:
```
Subject: Partnership Opportunity: Student Founders

Body:
Hi {First Name},

I recently came across {Company} and was impressed by your work in the student startup ecosystem.

As a fellow builder, I wanted to reach out and see if you'd be open to a quick chat about how we could support your growth?

Best,
Alex
```

### Step 2: Refine with AI (Optional)

1. Click the ✨ AI button
2. Enter your Gemini API key when prompted
3. Review the refined template
4. Make any manual adjustments

### Step 3: Send Emails

1. Click "Send Outreach"
2. Paste your Google Sheets URL when prompted
3. Review the confirmation dialog
4. Confirm to start sending

The extension will:
- ✅ Read recipients from your sheet
- ✅ Personalize each email
- ✅ Send emails one-by-one (3-second delay)
- ✅ Update the Status column in your sheet
- ✅ Show progress in real-time

## ⚙️ Configuration

### Rate Limits

The extension respects Gmail API limits:
- **500 emails per day** maximum
- **3-second delay** between emails
- Progress tracked in Chrome storage

### Storage

The extension stores:
- Last used email template
- Google Sheets URL
- Gemini API key
- Daily send count

To reset: Go to `chrome://extensions/` → OutreachPro → "Clear storage"

## 🔒 Security & Privacy

- ✅ All API calls go directly from your browser
- ✅ No data is sent to external servers
- ✅ OAuth tokens are managed by Chrome
- ✅ API keys stored locally in Chrome storage
- ✅ No automatic sending without confirmation

## 🐛 Troubleshooting

### "Failed to send email"

**Solution:** Check that:
1. Gmail API is enabled in Google Cloud
2. OAuth consent screen is configured
3. Your account has sending permissions

### "Invalid Google Sheets URL"

**Solution:** URL must be in format:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

### "Daily send limit reached"

**Solution:** Gmail limits apply. Wait 24 hours or use a different account.

### AI Refinement Not Working

**Solution:**
1. Verify Gemini API key is valid
2. Check API quota in Google Cloud Console
3. Try regenerating the API key

## 📁 File Structure

```
outreachpro-extension/
├── manifest.json              # Extension configuration
├── popup/
│   ├── popup.html            # UI (already provided)
│   └── popup.js              # UI logic & event handlers
├── background/
│   └── service_worker.js     # Background processes & API calls
├── lib/
│   ├── gmail.js              # Gmail API functions
│   ├── sheets.js             # Google Sheets API functions
│   ├── gemini.js             # Gemini AI integration
│   ├── auth.js               # OAuth authentication
│   └── rateLimiter.js        # Rate limiting logic
├── utils/
│   ├── constants.js          # Configuration constants
│   └── validators.js         # Validation & personalization
└── icons/                    # Extension icons (create 16x16, 48x48, 128x128)
```

## 🎯 Best Practices

1. **Test First:** Send to yourself before sending to real recipients
2. **Small Batches:** Start with 10-20 recipients to test
3. **Personalize:** Use all available variables for better results
4. **Review AI Output:** Always review AI-refined templates
5. **Monitor Status:** Check the Google Sheet for send status

## 📊 Sheet Status Values

The extension updates the Status column with:
- `Sent [timestamp]` - Email sent successfully
- `Failed: [error]` - Email failed to send

## 🔄 Updates & Maintenance

To update the extension:
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on OutreachPro
4. Test the changes

## ⚠️ Important Notes

- This is NOT a spam tool - use responsibly
- Always get consent before sending emails
- Respect unsubscribe requests
- Follow email best practices
- Stay within Gmail's sending limits

## 🚧 Known Limitations

- Sequential sending only (no parallel)
- Basic error handling
- No email scheduling
- No A/B testing
- No analytics dashboard

## 🎓 For Hackathon Judges

This is a functional MVP built for a hackathon. Focus areas:
- ✅ Core functionality works end-to-end
- ✅ Clean separation of concerns
- ✅ Respects API rate limits
- ✅ Secure OAuth implementation
- ✅ Real-time progress updates

Future improvements:
- Better error handling
- Email scheduling
- Template library
- Analytics dashboard
- A/B testing

## 📄 License

MIT License - Feel free to use and modify for your hackathon project!

---

Built with ❤️ for efficient, personalized outreach