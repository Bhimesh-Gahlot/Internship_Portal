import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Improved authentication utility with session support for multiple tabs
 */

// Store auth data for a specific role
export const storeAuthData = (data) => {
  const { token, user_id, role, sessionId } = data;
  
  // Create auth data object with session ID
  const authData = {
    token,
    user_id,
    role,
    sessionId: sessionId || `default_${new Date().getTime()}`,
    timestamp: new Date().getTime()
  };
  
  // Store auth data in sessionStorage only (for tab-specific)
  sessionStorage.setItem(`auth_${role}`, JSON.stringify(authData));
  
  // Set active role in sessionStorage
  sessionStorage.setItem('active_role', role);
  
  // Notify other tabs
  try {
    const event = new CustomEvent('auth-change', { 
      detail: { type: 'login', role, sessionId: authData.sessionId } 
    });
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Error dispatching events:', e);
  }
};

// Get auth data for a specific role
export const getAuthData = (role) => {
  const targetRole = role || sessionStorage.getItem('active_role');
  if (!targetRole) return null;
  
  const data = sessionStorage.getItem(`auth_${targetRole}`);
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing auth data', e);
    return null;
  }
};

// Get token for a specific role or the active role
export const getToken = (role) => {
  const authData = getAuthData(role);
  return authData ? authData.token : null;
};

// Get user ID for a specific role or the active role
export const getUserId = (role) => {
  const authData = getAuthData(role);
  return authData ? authData.user_id : null;
};

// Get user role
export const getUserRole = () => {
  return sessionStorage.getItem('active_role');
};

// Logout for a specific role
export const logout = (role) => {
  const targetRole = role || sessionStorage.getItem('active_role');
  if (targetRole) {
    sessionStorage.removeItem(`auth_${targetRole}`);
    if (sessionStorage.getItem('active_role') === targetRole) {
      sessionStorage.removeItem('active_role');
    }
    
    // Notify other tabs
    try {
      const event = new CustomEvent('auth-change', { 
        detail: { type: 'logout', role: targetRole } 
      });
      window.dispatchEvent(event);
    } catch (e) {
      console.error('Error dispatching events:', e);
    }
  }
};

// Logout all roles
export const logoutAll = () => {
  const roles = ['admin', 'mentor', 'student'];
  roles.forEach(role => {
    sessionStorage.removeItem(`auth_${role}`);
  });
  sessionStorage.removeItem('active_role');
  
  // Notify other tabs
  try {
    const event = new CustomEvent('auth-change', { 
      detail: { type: 'logout_all' } 
    });
    window.dispatchEvent(event);
  } catch (e) {
    console.error('Error dispatching events:', e);
  }
};

// Check if the user is authenticated with any role
export const isAuthenticated = () => {
  const activeRole = sessionStorage.getItem('active_role');
  return activeRole && getToken(activeRole) ? true : false;
};

// Setup axios interceptor to include auth token for the active role
export const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(
    (config) => {
      const currentRole = sessionStorage.getItem('active_role');
      if (currentRole) {
        const authData = getAuthData(currentRole);
        if (authData && authData.token) {
          config.headers['Authorization'] = `Bearer ${authData.token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor to handle token expiration
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        const currentRole = sessionStorage.getItem('active_role');
        if (currentRole) {
          logout(currentRole);
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
};

// Create development tokens for this tab only
export const createDevTokens = () => {
  console.log('Creating development tokens for this tab only');
  // Create admin token
  storeAuthData({
    token: 'token:1:admin:default_session',
    user_id: 1,
    role: 'admin'
  });
  
  // Create mentor token
  storeAuthData({
    token: 'token:2:mentor:default_session',
    user_id: 2,
    role: 'mentor'
  });
  
  // Create student token
  storeAuthData({
    token: 'token:3:student:default_session',
    user_id: 3,
    role: 'student'
  });
  
  return {
    admin: 'token:1:admin:default_session',
    mentor: 'token:2:mentor:default_session',
    student: 'token:3:student:default_session'
  };
};

export default {
  storeAuthData,
  getAuthData,
  getToken,
  getUserId,
  isAuthenticated,
  getUserRole,
  logout,
  logoutAll,
  setupAxiosInterceptors,
  createDevTokens
}; 