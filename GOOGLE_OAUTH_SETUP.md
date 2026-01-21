# Google OAuth Setup - Fix Access Denied Error

## ❌ Problem
You're getting: **"Error 403: access_denied - OutreachPro has not completed the Google verification process"**

This happens because Google requires you to either:
1. Complete their verification process (takes weeks)
2. Add your email as a test user during development

## ✅ Solution: Add Your Email as Test User

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your **OutreachPro** project (top left dropdown)

### Step 2: Configure OAuth Consent Screen
1. In left sidebar: **APIs & Services** → **OAuth consent screen**
2. Choose **External** (if not already selected)
3. Click **Edit App**

### Step 3: Add Test Users
1. Scroll down to **Test users** section
2. Click **Add users**
3. Enter your email: `abheytiwarikvs@gmail.com`
4. Click **Add**
5. Scroll down and click **Save & Continue**

### Step 4: Verify Your Credentials
1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID (should show in list)
3. Click it to view details
4. Copy the **Client ID** (format: `XXXXXXXX.apps.googleusercontent.com`)

### Step 5: Update Manifest.json
```json
{
  "manifest_version": 3,
  "name": "OutreachPro",
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  }
}
```

Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID.

### Step 6: Reload Extension
1. Open Chrome: `chrome://extensions/`
2. Find **OutreachPro**
3. Click the **Reload** button (circular arrow icon)

### Step 7: Test Authentication
1. Click OutreachPro icon in Chrome
2. Click "Send Outreach" button
3. You should now see Google login popup
4. Sign in with `abheytiwarikvs@gmail.com`
5. Accept permissions

---

## 🔑 API Keys Checklist

Before testing, verify you have:

- [ ] **Client ID** from Google Cloud (OAuth 2.0)
- [ ] **Gmail API** enabled
- [ ] **Google Sheets API** enabled
- [ ] Your email added as **test user**
- [ ] **Manifest.json** updated with Client ID
- [ ] Extension reloaded in Chrome

---

## 🧪 Testing Checklist

After setup, test these steps:

1. ✅ Click OutreachPro icon → See popup
2. ✅ Click "Send Outreach" → Google login appears
3. ✅ Sign in with your email → Permission screen appears
4. ✅ Accept permissions → App authenticates
5. ✅ Paste Google Sheets URL → Loads recipients
6. ✅ Click Send → Emails send with progress updates

---

## 🚨 Still Getting Error?

Try these troubleshooting steps:

### Clear Extension Cache
```
1. chrome://extensions/
2. Find OutreachPro
3. Click "Remove"
4. Reload page
5. Click "Load unpacked" again and select the folder
```

### Check Manifest.json
- Open `Manifest.json`
- Verify `client_id` matches exactly what's in Google Cloud
- No extra spaces or quotes

### Verify Google Cloud Setup
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select OutreachPro project
- **APIs & Services** → **Credentials**
- Confirm you see your OAuth 2.0 Client ID
- Click it → Verify it's type "Web application"

### Check Email
- Ensure test user email is: `abheytiwarikvs@gmail.com`
- Not a typo or different email
- Email must be added BEFORE trying to sign in

### Wait a Few Minutes
- Changes to OAuth consent screen can take a few minutes to propagate
- After adding test user, wait 2-3 minutes before trying again

---

## 📋 What Each Permission Does

When you sign in, the app asks for:

1. **Gmail API (`gmail.send`)**
   - Allows: Sending emails on your behalf
   - Does NOT allow: Reading or deleting emails

2. **Google Sheets API (`spreadsheets`)**
   - Allows: Reading sheet data and updating status column
   - Scope is limited to what the app accesses

---

## 💡 Pro Tips

- **Test with small batches first**: Send to 2-3 contacts before doing 100+
- **Keep backup of sheet**: Before running, make a copy for safety
- **Monitor daily limit**: Max 500 emails/day (auto-reset at midnight)
- **Check spam folder**: First few emails might land in spam

---

## ❓ Need Help?

If you still have issues:

1. **Check Chrome Extension Errors**
   - `chrome://extensions/` → OutreachPro → "Errors" button
   - Look for detailed error messages

2. **Check Browser Console**
   - Right-click OutreachPro popup → Inspect
   - Check Console tab for errors

3. **Verify APIs are Enabled**
   - Google Cloud Console
   - APIs & Services → Enabled APIs
   - Look for: Gmail API ✅ and Sheets API ✅

---

**Once test user is added, authentication should work! 🎉**
