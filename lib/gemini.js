/**
 * Refine email template using Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Promise<object>} Refined template
 */
export async function refineEmailTemplate(apiKey, subject, body) {
  const prompt = `You are an expert email copywriter. Improve the following cold outreach email to make it more professional, engaging, and likely to get a response. Keep it concise and maintain any template variables like {First Name}, {Company}, etc.

Subject: ${subject}

Body:
${body}

Please provide:
1. An improved subject line
2. An improved email body

Keep the tone professional but friendly. Maintain all template variables exactly as they appear.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to refine template');
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Parse the response to extract subject and body
  return parseGeminiResponse(text, subject, body);
}

/**
 * Parse Gemini response to extract subject and body
 * @param {string} text - Gemini response text
 * @param {string} originalSubject - Original subject as fallback
 * @param {string} originalBody - Original body as fallback
 * @returns {object} Parsed template
 */
function parseGeminiResponse(text, originalSubject, originalBody) {
  // Try to extract subject line
  let subject = originalSubject;
  let body = originalBody;
  
  // Look for subject pattern
  const subjectMatch = text.match(/(?:Subject|subject line):\s*(.+?)(?:\n|$)/i);
  if (subjectMatch) {
    subject = subjectMatch[1].trim().replace(/^["']|["']$/g, '');
  }
  
  // Look for body pattern
  const bodyMatch = text.match(/(?:Body|Email body|Message):\s*([\s\S]+?)(?:\n\n|$)/i);
  if (bodyMatch) {
    body = bodyMatch[1].trim();
  } else {
    // If no clear body section, use everything after subject
    const parts = text.split(/(?:Subject|subject line):.+?\n/i);
    if (parts.length > 1) {
      body = parts[1].trim();
    }
  }
  
  // Clean up the body
  body = body
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
  
  return { subject, body };
}

/**
 * Get suggestions for email improvement
 * @param {string} apiKey - Gemini API key
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Promise<Array>} Array of suggestions
 */
export async function getEmailSuggestions(apiKey, subject, body) {
  const prompt = `Analyze this cold outreach email and provide 3-5 specific suggestions for improvement:

Subject: ${subject}
Body: ${body}

Focus on: clarity, engagement, professionalism, and response rate optimization.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512
      }
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to get suggestions');
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Split into lines and filter suggestions
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 10);
}