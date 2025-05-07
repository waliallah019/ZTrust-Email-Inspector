import axios from 'axios';
import CryptoJS from 'crypto-js'; // Add this dependency

// Get the API URL from environment variables or use a default
const API_BASE_URL = 'https://ztrust-email-inspector-backend-production.up.railway.app';

// Create a configurable encryption key (should match the server-side key)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'your-encryption-key';

// Create axios instance with more security options
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase security with additional options
  withCredentials: true, // Enable if your server supports cookies
  timeout: 10000, // 10 second timeout
});

// Simple encryption utility for sensitive data
const encryptData = (data) => {
  if (!data) return data;
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

// Simple decryption utility
const decryptData = (encryptedData) => {
  if (!encryptedData) return encryptedData;
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Input validation utilities
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers;
};

const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};


export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Store token in localStorage
    localStorage.setItem('token', token);

    // Set token expiration - 8 hours from now
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 8);
    localStorage.setItem('tokenExpiration', expiration.toString());
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiration');
  }
  // Return a promise to ensure completion
  return Promise.resolve();
};

// Function to get JWT token from localStorage
export const getAuthToken = () => {
  const token = localStorage.getItem('token');
  const expiration = localStorage.getItem('tokenExpiration');

  // Check if token exists and is not expired
  if (token && expiration) {
    const now = new Date();
    const expirationDate = new Date(expiration);

    if (now >= expirationDate) {
      // Token expired, clear it
      setAuthToken(null);
      return null;
    }
    return token;
  }
  return null;
};

// Check token on startup
const checkAndSetToken = () => {
  const token = getAuthToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};
checkAndSetToken();
// Log security events to the console and optionally to a monitoring service
const logSecurityEvent = (eventType, details) => {
  console.error(`Security event: ${eventType}`, details);
  // In a production app, you might send this to your security monitoring service
  // Example: sendToSecurityMonitoring(eventType, details);
};

// Add response interceptor for comprehensive error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle different types of errors
    if (!error.response) {
      // Network error
      logSecurityEvent('network_error', 'Network error occurred');
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    }
    
    const { status, data } = error.response;
    
    // Handle specific error codes
    switch (status) {
      case 401:
        // Unauthorized - token might be invalid or expired
        logSecurityEvent('authentication_failure', data?.message || 'Authentication failed');
        // Clear token and redirect to login
        setAuthToken(null);
        // In a real app, you might dispatch to your state management
        // store.dispatch({ type: 'AUTH_LOGOUT' });
        break;
        
      case 403:
        // Forbidden - user doesn't have permissions
        logSecurityEvent('permission_denied', data?.message || 'Permission denied');
        break;
        
      case 429:
        // Rate limit exceeded
        logSecurityEvent('rate_limit', data?.message || 'Too many requests');
        return Promise.reject({ 
          message: 'Rate limit exceeded. Please try again in a minute.',
          retryAfter: error.response.headers['retry-after'] || 60
        });
        
      case 400:
        // Bad request - client error
        if (data?.message?.includes('adversarial')) {
          logSecurityEvent('adversarial_input_rejected', data?.message);
        }
        break;
        
      case 500:
        // Server error
        logSecurityEvent('server_error', data?.message || 'Server error occurred');
        break;
    }
    
    return Promise.reject(data || { message: 'An error occurred' });
  }
);

// Add request interceptor for input sanitization and validation
api.interceptors.request.use(
  (config) => {
    // Don't manipulate FormData or file uploads
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      // Sanitize request data
      const sanitizedData = { ...config.data };
      
      // Implement input sanitization for strings
      Object.keys(sanitizedData).forEach(key => {
        if (typeof sanitizedData[key] === 'string') {
          // Basic XSS prevention - remove script tags and events
          sanitizedData[key] = sanitizedData[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/g, '');
        }
      });
      
      // Check for spam classifier input - ensure it's not too large
      if (config.url?.includes('check_spam') && sanitizedData.mail) {
        const maxSize = 50000; // Match the server's MAX_INPUT_LENGTH
        if (sanitizedData.mail.length > maxSize) {
          sanitizedData.mail = sanitizedData.mail.substring(0, maxSize);
        }
      }
      
      config.data = sanitizedData;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// OTP based registration functions with input validation
export const initiateSignup = async (email, password) => {
  try {
    // Validate input
    if (!validateEmail(email)) {
      throw { message: 'Please enter a valid email address' };
    }
    
    if (!validatePassword(password)) {
      throw { 
        message: 'Password must be at least 8 characters with uppercase, lowercase and numbers' 
      };
    }
    
    const response = await api.post('/register/initiate', { email, password });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw { message: 'Rate limit exceeded. Please try again in a minute.' };
    }
    throw error.message ? error : (error.response?.data || { message: 'Network error occurred' });
  }
};

export const verifySignup = async (email, password, otp) => {
  try {
    // Validate input
    if (!validateEmail(email)) {
      throw { message: 'Please enter a valid email address' };
    }
    
    if (!validateOTP(otp)) {
      throw { message: 'Please enter a valid 6-digit verification code' };
    }
    
    const response = await api.post('/register/verify', {
      email,
      password, // Server will decrypt if needed
      otp,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw { message: 'Rate limit exceeded. Please try again in a minute.' };
    }
    throw error.message ? error : (error.response?.data || { message: 'Network error occurred' });
  }
};

// OTP based login functions with input validation
export const initiateLogin = async (email, password) => {
  try {
    // Validate input
    if (!validateEmail(email)) {
      throw { message: 'Please enter a valid email address' };
    }
    
    if (!password || password.trim() === '') {
      throw { message: 'Please enter your password' };
    }
    
    const response = await api.post('/login/initiate', { email, password });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw { message: 'Rate limit exceeded. Please try again in a minute.' };
    }
    throw error.message ? error : (error.response?.data || { message: 'Network error occurred' });
  }
};

export const verifyLogin = async (email, otp) => {
  try {
    // Validate input
    if (!validateEmail(email)) {
      throw { message: 'Please enter a valid email address' };
    }

    if (!validateOTP(otp)) {
      throw { message: 'Please enter a valid 6-digit verification code' };
    }

    const response = await api.post('/login/verify', { email, otp });
    
    // Handle token setting and verification immediately
    const { token } = response.data;
    
    if (!token) {
      throw { message: 'No authentication token received from server' };
    }
    
    // Set the token synchronously
    const tokenSet = setAuthToken(token);
    
    if (!tokenSet) {
      throw { message: 'Failed to set authentication token' };
    }
    
    // Do a quick validation to ensure token was properly set
    const storedToken = getAuthToken();
    if (!storedToken) {
      throw { message: 'Authentication token verification failed' };
    }
    
    return {
      ...response.data,
      isAuthenticated: true
    };
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw { message: 'Rate limit exceeded. Please try again in a minute.' };
    }
    // Throw a consistent error object
    throw error.response?.data || { message: error.message || 'Network error occurred' };
  }
};
// Add adversarial input detection for the spam check API
export const checkSpam = async (mail) => {
  try {
    // Basic validation
    if (!mail || mail.trim() === '') {
      throw { message: 'Email content is required' };
    }
    
    // Check for potential adversarial patterns on the client side
    // This is a simple check - the server has more comprehensive validation
    const suspiciousPatterns = [
      /alert\s*\(/i,            // Alert function call
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,  // Script tags
      /drop\s+table/i,          // SQL injection pattern
      /\b(and|or)\s+[01]=[01]/i // SQL injection pattern
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(mail)) {
        logSecurityEvent('suspicious_input_detected', { pattern: pattern.toString() });
        throw { message: 'Invalid input format detected' };
      }
    }
    
    // Rate limiter for spam check - use localStorage to track requests
    const lastCheck = localStorage.getItem('lastSpamCheck');
    const now = Date.now();
    
    if (lastCheck && now - parseInt(lastCheck) < 1000) { // At most one request per second
      throw { message: 'Please wait before submitting another request' };
    }
    
    localStorage.setItem('lastSpamCheck', now.toString());
    
    // If content is very large, give user a warning but let server handle it
    if (mail.length > 10000) {
      console.warn('Email content is very large. Processing may take longer.');
    }
    
    const response = await api.post('/check_spam', { mail });
    
    // Enhanced logging for unusual response patterns
    if (response.data.confidence < 0.6) {
      console.warn('Model returned low confidence prediction:', response.data);
    }
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw { message: 'Rate limit exceeded. Please try again in a minute.' };
    }
    throw error.message ? error : (error.response?.data || { message: 'Network error occurred' });
  }
};

// Modified getLogs function to allow fetching all logs
export const getLogs = async (options = {}) => {
  try {
    // Extract pagination parameters with defaults
    const { page = 1, perPage = 1000 } = options;
    
    const response = await api.get(`/logs?page=${page}&per_page=${perPage}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw { message: 'Rate limit exceeded. Please try again in a minute.' };
    }
    throw error.response?.data || { message: 'Network error occurred' };
  }
};
// Modified getSecurityEvents function to handle all severity levels and pagination
export const getSecurityEvents = async (options = {}) => {
  try {
    const { page = 1, perPage = 1000} = options;  
    const response = await api.get(`/security-events?page=${page}&per_page=${perPage}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      throw { message: 'You do not have permission to view security events' };
    }
    throw error.response?.data || { message: 'Network error occurred' };
  }
};


export const logout = () => {
  // Clear client-side security state
  localStorage.removeItem('lastSpamCheck');
  
  // Clear authentication data
  setAuthToken(null);
  
  // In a real app, you might also want to notify your state management
  // store.dispatch({ type: 'AUTH_LOGOUT' });
};
// Periodic token validator to ensure tokens haven't been compromised
const startTokenValidator = () => {
  setInterval(() => {
    const token = getAuthToken();
    if (token) {
      try {
        // Simple validation - in a real app you might have a /validate endpoint
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          console.error('Invalid token format detected');
          setAuthToken(null);
          return;
        }
        
        // Check if token is expired
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp * 1000 < Date.now()) {
          console.log('Token expired, logging out');
          setAuthToken(null);
        }
      } catch (e) {
        console.error('Token validation error:', e);
        setAuthToken(null);
      }
    }
  }, 60000); // Check every minute
};

startTokenValidator();

export default api;