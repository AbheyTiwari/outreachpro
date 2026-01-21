// Email validation
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Template validation
export function hasRequiredVariables(template, variables) {
  return variables.every(v => template.includes(v));
}

// Recipient validation
export function validateRecipient(recipient) {
  const errors = [];
  
  if (!recipient.Email || !isValidEmail(recipient.Email)) {
    errors.push('Invalid email address');
  }
  
  if (!recipient['First Name'] || recipient['First Name'].trim() === '') {
    errors.push('Missing first name');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Template personalization
export function personalizeTemplate(template, recipient) {
  let personalized = template;
  
  // Replace all template variables
  personalized = personalized.replace(/{First Name}/g, recipient['First Name'] || '');
  personalized = personalized.replace(/{Email}/g, recipient['Email'] || '');
  personalized = personalized.replace(/{Company}/g, recipient['Company'] || '');
  personalized = personalized.replace(/{Role}/g, recipient['Role'] || '');
  
  return personalized;
}