/**
 * Get OAuth2 token using Chrome Identity API
 * @param {boolean} interactive - Whether to show auth UI
 * @returns {Promise<string>} Access token
 */
export async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (!token) {
        reject(new Error('No token received'));
        return;
      }
      
      resolve(token);
    });
  });
}

/**
 * Remove cached OAuth2 token
 * @param {string} token - Token to remove
 * @returns {Promise<void>}
 */
export async function removeAuthToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  try {
    const token = await getAuthToken(false);
    return !!token;
  } catch (error) {
    return false;
  }
}

/**
 * Get user profile information
 * @param {string} token - OAuth2 token
 * @returns {Promise<object>} User profile
 */
export async function getUserProfile(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  return await response.json();
}