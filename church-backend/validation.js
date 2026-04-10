/**
 * Input Validation & Sanitization - Phase 1 Security
 * Validates and sanitizes user inputs to prevent OWASP vulnerabilities
 */

const VALIDATION_RULES = {
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format',
    maxLength: 255
  },
  password: {
    minLength: 8,
    message: 'Password must be at least 8 characters',
    requireNumbers: true,
    requireSpecial: false // Set to true after user communication
  },
  phone: {
    regex: /^[\d\s\-\+\(\)]+$/,
    message: 'Invalid phone format',
    minLength: 10,
    maxLength: 20
  },
  name: {
    regex: /^[a-zA-Z\s\-\'\.]+$/,
    message: 'Names can only contain letters, spaces, hyphens, and apostrophes',
    maxLength: 100
  },
  dateISO: {
    regex: /^\d{4}-\d{2}-\d{2}$/,
    message: 'Date must be in YYYY-MM-DD format'
  },
  timeHM: {
    regex: /^\d{2}:\d{2}$/,
    message: 'Time must be in HH:MM format'
  },
  url: {
    regex: /^https?:\/\/.+/,
    message: 'Invalid URL format'
  }
};

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim();
  const rule = VALIDATION_RULES.email;
  
  if (trimmed.length > rule.maxLength) {
    return { valid: false, error: `Email exceeds ${rule.maxLength} characters` };
  }
  
  if (!rule.regex.test(trimmed)) {
    return { valid: false, error: rule.message };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  const rule = VALIDATION_RULES.password;
  
  if (password.length < rule.minLength) {
    return { valid: false, error: rule.message };
  }
  
  if (rule.requireNumbers && !/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  if (rule.requireSpecial && !/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Password must contain a special character' };
  }
  
  return { valid: true };
}

/**
 * Validate phone number
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  const trimmed = String(phone).trim();
  const rule = VALIDATION_RULES.phone;
  
  if (trimmed.length < rule.minLength || trimmed.length > rule.maxLength) {
    return { valid: false, error: `Phone must be ${rule.minLength}-${rule.maxLength} characters` };
  }
  
  if (!rule.regex.test(trimmed)) {
    return { valid: false, error: rule.message };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate name field
 */
function validateName(name, fieldName = 'Name') {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = name.trim();
  const rule = VALIDATION_RULES.name;
  
  if (trimmed.length === 0 || trimmed.length > rule.maxLength) {
    return { valid: false, error: `${fieldName} must be 1-${rule.maxLength} characters` };
  }
  
  if (!rule.regex.test(trimmed)) {
    return { valid: false, error: rule.message };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate date in YYYY-MM-DD format
 */
function validateDateISO(date, options = {}) {
  if (!date || typeof date !== 'string') {
    return { valid: false, error: 'Date is required' };
  }
  
  const rule = VALIDATION_RULES.dateISO;
  
  if (!rule.regex.test(date)) {
    return { valid: false, error: rule.message };
  }
  
  const dateObj = new Date(date + 'T00:00:00Z');
  
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date' };
  }
  
  if (options.notInPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) {
      return { valid: false, error: 'Date cannot be in the past' };
    }
  }
  
  if (options.maxDaysAhead) {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + options.maxDaysAhead);
    if (dateObj > maxDate) {
      return { valid: false, error: `Date cannot be more than ${options.maxDaysAhead} days in the future` };
    }
  }
  
  return { valid: true, value: date };
}

/**
 * Validate time in HH:MM format
 */
function validateTimeHM(time) {
  if (!time || typeof time !== 'string') {
    return { valid: false, error: 'Time is required' };
  }
  
  const rule = VALIDATION_RULES.timeHM;
  
  if (!rule.regex.test(time)) {
    return { valid: false, error: rule.message };
  }
  
  const [hours, minutes] = time.split(':').map(Number);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { valid: false, error: 'Invalid time values' };
  }
  
  return { valid: true, value: time };
}

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick=, etc)
    .slice(0, 5000); // Limit length
}

/**
 * Validate array of IDs
 */
function validateIdArray(ids) {
  if (!Array.isArray(ids)) {
    return { valid: false, error: 'Must be an array' };
  }
  
  if (ids.length === 0) {
    return { valid: false, error: 'Array cannot be empty' };
  }
  
  if (ids.length > 1000) {
    return { valid: false, error: 'Array cannot exceed 1000 items' };
  }
  
  // Validate each ID is a number or UUID
  const validIds = ids.every(id => 
    typeof id === 'number' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
  
  if (!validIds) {
    return { valid: false, error: 'Invalid ID format in array' };
  }
  
  return { valid: true, value: ids };
}

/**
 * Validate pagination parameters
 */
function validatePagination(limit, offset) {
  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = parseInt(offset, 10);
  
  if (parsedLimit < 1 || parsedLimit > 1000) {
    return { valid: false, error: 'Limit must be between 1 and 1000' };
  }
  
  if (parsedOffset < 0) {
    return { valid: false, error: 'Offset cannot be negative' };
  }
  
  return { valid: true, value: { limit: parsedLimit, offset: parsedOffset } };
}

/**
 * Comprehensive request validation middleware
 */
function validateRequest(rules) {
  return (req, res, next) => {
    const errors = {};
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      
      if (rule.required && !value) {
        errors[field] = `${field} is required`;
        continue;
      }
      
      if (value && rule.type === 'email') {
        const result = validateEmail(value);
        if (!result.valid) errors[field] = result.error;
        else req.body[field] = result.value;
      } else if (value && rule.type === 'password') {
        const result = validatePassword(value);
        if (!result.valid) errors[field] = result.error;
      } else if (value && rule.type === 'phone') {
        const result = validatePhone(value);
        if (!result.valid) errors[field] = result.error;
        else req.body[field] = result.value;
      } else if (value && rule.type === 'name') {
        const result = validateName(value, field);
        if (!result.valid) errors[field] = result.error;
        else req.body[field] = result.value;
      } else if (value && rule.type === 'string') {
        req.body[field] = sanitizeString(value);
      }
    }
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    next();
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateName,
  validateDateISO,
  validateTimeHM,
  sanitizeString,
  validateIdArray,
  validatePagination,
  validateRequest,
  VALIDATION_RULES
};
