/**
 * Refine email template using Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Promise<object>} Refined template
 */
export async function refineEmailTemplate(apiKey, subject, body) {
  if (!apiKey) {
    throw new Error('API key is required');
  }
  
  const prompt = `You are an expert email copywriter. Improve the following cold outreach email to make it more professional, engaging, and likely to get a response. Keep it concise and maintain any template variables like {First Name}, {Company}, etc.

Current Subject: ${subject}

Current Body:
${body}

Provide EXACTLY TWO sections in your response:

1. Improved Subject: [Write the new subject line here]

2. Improved Body: [Write the new email body here, preserving all template variables]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  console.log('Calling Gemini API:', url.split('?')[0]);
  console.log('Prompt length:', prompt.length);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
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
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Gemini response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText, 'Status:', response.status);
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || errorText || `HTTP ${response.status}`);
      } catch {
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('Gemini raw response:', data);
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini text response:', text);
    
    if (!text) {
      throw new Error('No response received from Gemini API');
    }
    
    // Parse the response to extract subject and body
    return parseGeminiResponse(text, subject, body);
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Gemini API took too long to respond');
    }
    throw error;
  }
}

/**
 * Parse Gemini response to extract subject and body
 * @param {string} text - Gemini response text
 * @param {string} originalSubject - Original subject as fallback
 * @param {string} originalBody - Original body as fallback
 * @returns {object} Parsed template
 */
function parseGeminiResponse(text, originalSubject, originalBody) {
  let subject = originalSubject;
  let body = originalBody;
  
  console.log('===== PARSING GEMINI RESPONSE =====');
  console.log('Raw text:', text);
  
  // Extract subject - look for "Improved Subject:" or "1." patterns
  const subjectPatterns = [
    /Improved\s+Subject:\s*([^\n]+)/i,
    /1\.\s+([^\n]{10,150}?)(?:\n|$)/,
    /^([^\n]{10,150}?)(?:\n\n|\n[2])/
  ];
  
  for (const pattern of subjectPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let candidate = match[1].trim().replace(/^["'[\-*\d.]+\s*/, '').replace(/["']\s*$/, '');
      if (candidate.length > 5 && candidate.length < 200) {
        subject = candidate;
        console.log('Found subject:', subject);
        break;
      }
    }
  }
  
  // Extract body - look for "Improved Body:" or "2." patterns
  const bodyPatterns = [
    /Improved\s+Body:\s*([\s\S]+?)(?:\n\n|$)/i,
    /2\.\s+([^\n][\s\S]+?)(?:\n\n|$)/,
    /Body:\s*([\s\S]+?)$/i
  ];
  
  for (const pattern of bodyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let candidate = match[1]
        .trim()
        .replace(/^["'[*\d.]+\s*/, '')
        .replace(/["']\s*$/, '')
        .trim();
      
      if (candidate.length > 20) {
        body = candidate;
        console.log('Found body:', body.substring(0, 100) + '...');
        break;
      }
    }
  }
  
  // If we still haven't found good content, try a different approach
  if (body === originalBody) {
    const sections = text.split(/\n\n+/);
    if (sections.length >= 2) {
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i].trim();
        if (section.length > 30 && !section.toLowerCase().includes('subject')) {
          body = section.replace(/^["'[*\d.]+\s*/, '').replace(/["']\s*$/, '').trim();
          if (body.length > 20) {
            console.log('Found body from sections:', body.substring(0, 100) + '...');
            break;
          }
        }
      }
    }
  }
  
  // Clean up the body
  body = body
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/\*(?!\w)/g, '')
    .trim();
  
  console.log('Final subject:', subject);
  console.log('Final body:', body.substring(0, 100) + '...');
  console.log('===== END PARSING =====');
  
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
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