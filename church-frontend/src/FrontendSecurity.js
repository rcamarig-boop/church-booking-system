/**
 * Frontend Security Utilities - Phase 1B
 * OWASP hardening, session security, and error logging
 */

/**
 * OWASP Security Configuration
 */
export const OWASPConfig = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"], // ReactDOM requires unsafe-inline
    'style-src': ["'self'", "'unsafe-inline'"], // CSS-in-JS requires unsafe-inline
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
    'font-src': ["'self'", 'data:', 'https:'],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"]
  },

  // Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
};

/**
 * Session Security Manager
 */
export class SessionSecurityManager {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.warningTime = 5 * 60 * 1000; // Warn 5 minutes before timeout
    this.lastActivityTime = Date.now();
    this.sessionWarningShown = false;
    this.setupSessionTracking();
  }

  setupSessionTracking() {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivityTime = Date.now();
        this.sessionWarningShown = false;
      }, { passive: true });
    });

    // Check session timeout periodically
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionTimeout();
    }, 1000); // Check every second
  }

  checkSessionTimeout() {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    const timeUntilTimeout = this.sessionTimeout - timeSinceLastActivity;

    // Warn user 5 minutes before timeout
    if (timeUntilTimeout <= this.warningTime && timeUntilTimeout > 0) {
      if (!this.sessionWarningShown) {
        this.sessionWarningShown = true;
        this.onSessionWarning?.(Math.round(timeUntilTimeout / 1000));
      }
    }

    // Session expired
    if (timeSinceLastActivity >= this.sessionTimeout) {
      this.onSessionExpired?.();
      this.logout();
    }
  }

  resetSession() {
    this.lastActivityTime = Date.now();
    this.sessionWarningShown = false;
  }

  logout(reason = 'user_logout') {
    clearInterval(this.sessionCheckInterval);
    
    // Log logout event
    this.logEvent('session_ended', { reason });
    
    // Note: The actual logout (clearing localStorage and redirecting)
    // is handled by the onSessionExpired callback in App.js via handleLogout().
    // We only clear the interval here to stop the session check timer.
  }

  logEvent(eventType, data = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      fetch('/api/log-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventType,
          ...data,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Failed to log event:', err));
    } catch (err) {
      console.error('Error logging event:', err);
    }
  }

  destroy() {
    clearInterval(this.sessionCheckInterval);
  }
}

/**
 * OWASP A01 - Broken Access Control Prevention
 */
export const AccessControlValidator = {
  /**
   * Check if user has required role
   */
  hasRole(user, requiredRole) {
    if (!user || !user.role) return false;
    
    const roleHierarchy = {
      admin: 3,
      secretary: 2,
      member: 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  },

  /**
   * Check if user can perform action
   */
  canPerformAction(user, action) {
    const permissions = {
      admin: ['view_all', 'approve', 'reject', 'delete', 'create_services', 'export'],
      secretary: ['view_all', 'approve', 'reject', 'export'],
      member: ['view_own', 'create_application', 'cancel_pending']
    };

    const userPermissions = permissions[user?.role] || [];
    return userPermissions.includes(action);
  },

  /**
   * Validate resource access
   */
  canAccessResource(user, resource, ownerUserId) {
    // Admin can access everything
    if (user?.role === 'admin') return true;
    
    // User can only access their own data
    if (user?.id === ownerUserId) return true;
    
    return false;
  }
};

/**
 * OWASP A02 - Cryptographic Failures Prevention
 * Ensures secure data handling
 */
export const SecureDataVault = {
  /**
   * Store sensitive data securely
   */
  setSecure(key, value) {
    try {
      // Use sessionStorage for sensitive data (not persistent)
      sessionStorage.setItem(`secure_${key}`, JSON.stringify(value));
    } catch (err) {
      console.error('Failed to store secure data:', err);
    }
  },

  /**
   * Retrieve sensitive data
   */
  getSecure(key) {
    try {
      const value = sessionStorage.getItem(`secure_${key}`);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Failed to retrieve secure data:', err);
      return null;
    }
  },

  /**
   * Clear sensitive data
   */
  clearSecure(key) {
    sessionStorage.removeItem(`secure_${key}`);
  },

  /**
   * Clear all secure data
   */
  clearAll() {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
};

/**
 * OWASP A03 - Injection Prevention
 * Input validation and sanitization
 */
export const InjectionPrevention = {
  /**
   * Sanitize string to prevent XSS
   */
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Validate email format
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validate URL (prevent javascript: protocol)
   */
  validateURL(url) {
    try {
      const parsed = new URL(url);
      // Only allow http(s) and relative URLs
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      // Relative URL
      return /^\/[^\/]/.test(url) || /^\.\//.test(url);
    }
  },

  /**
   * Escape HTML special characters
   */
  escapeHTML(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'\/]/g, char => map[char]);
  },

  /**
   * Remove dangerous attributes from strings
   */
  removeDangerousAttrs(str) {
    return str
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove scripts
  }
};

/**
 * OWASP A07 - Cross-Site Scripting (XSS) Prevention
 */
export const XSSPrevention = {
  /**
   * Render user content safely
   */
  renderSafeHTML(html) {
    // Create DOM element and set textContent (prevents XSS)
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  /**
   * Validate and sanitize URLs
   */
  sanitizeURLAttribute(url) {
    if (!url) return '';
    
    // Reject javascript: and data: URLs
    if (url.toLowerCase().startsWith('javascript:') || 
        url.toLowerCase().startsWith('data:')) {
      return '';
    }
    
    return InjectionPrevention.sanitizeString(url);
  },

  /**
   * Create safe DOM content
   */
  createSafeElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // Set attributes safely (reject dangerous ones)
    Object.entries(attributes).forEach(([key, value]) => {
      if (key.toLowerCase().startsWith('on')) {
        // Skip event handlers added via attributes
        return;
      }
      if (key === 'href' || key === 'src') {
        // Validate URLs
        const safeValue = this.sanitizeURLAttribute(value);
        if (safeValue) element.setAttribute(key, safeValue);
      } else {
        element.setAttribute(key, String(value));
      }
    });
    
    // Set content as text (prevents XSS)
    if (content) {
      element.textContent = content;
    }
    
    return element;
  }
};

/**
 * API Error Logging & Tracking
 */
export class APIErrorLogger {
  static async logError(error, context = {}) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const errorData = {
        message: error.message || String(error),
        stack: error.stack || '',
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        severity: context.severity || 'error'
      };

      await fetch('/api/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(errorData)
      });
    } catch (err) {
      console.error('Failed to log API error:', err);
    }
  }

  static async logAPICall(method, endpoint, statusCode, duration, userId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Only log errors and slow requests
      if (statusCode >= 400 || duration > 1000) {
        await fetch('/api/log-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            eventType: 'api_call',
            method,
            endpoint,
            statusCode,
            duration,
            timestamp: new Date().toISOString()
          })
        });
      }
    } catch (err) {
      console.error('Failed to log API call:', err);
    }
  }
}

export default {
  OWASPConfig,
  SessionSecurityManager,
  AccessControlValidator,
  SecureDataVault,
  InjectionPrevention,
  XSSPrevention,
  APIErrorLogger
};
