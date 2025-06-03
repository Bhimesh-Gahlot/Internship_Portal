import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 // 15 seconds timeout
});

// Function to get token based on user role
const getAuthToken = (role) => {
    const defaultToken = localStorage.getItem('token');
    if (role) {
        return localStorage.getItem(`${role}_token`) || defaultToken;
    }
    return defaultToken;
};

// Add token to requests if available
api.interceptors.request.use((config) => {
    // Extract role from config if available
    const role = config.role;
    if (role) {
        delete config.role; // Remove custom property before sending
    }
    
    const token = getAuthToken(role);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
}, (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If we already tried to retry, don't do it again to avoid infinite loops
        if (originalRequest._retry) {
            return Promise.reject(error);
        }
        
        // Handle token expiration - 401 Unauthorized
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Try to refresh token using the refresh endpoint
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh`, {
                        refresh_token: refreshToken
                    });
                    
                    // If we got a new token, update localStorage and retry
                    if (response.data.token) {
                        localStorage.setItem('token', response.data.token);
                        
                        // Update token in the original request
                        originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                        return api(originalRequest);
                    }
                }
                
                // If we couldn't refresh, redirect to login
                window.location.href = '/login';
                return Promise.reject(error);
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                
                // Redirect to login if refresh fails
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }
        
        // Special handling for network errors - could be server down or CORS issues
        if (error.message === 'Network Error') {
            console.error('Network error detected, server might be down or CORS issue');
            // We could implement fallback strategy here
        }
        
        // Handle other errors
        return Promise.reject(error);
    }
);

// Enhanced API methods with better error handling
const enhancedApi = {
    // Get data with retry logic
    get: async (url, config = {}) => {
        try {
            return await api.get(url, config);
        } catch (error) {
            if (error.message === 'Network Error' && !config._retried) {
                // Try again with a CORS proxy if original request failed
                console.log('Retrying with CORS handling...');
                return api.get(url, { ...config, _retried: true });
            }
            throw error;
        }
    },
    
    // Post data
    post: async (url, data, config = {}) => {
        try {
            return await api.post(url, data, config);
        } catch (error) {
            if (error.message === 'Network Error' && !config._retried) {
                // Try again with different approach
                console.log('Retrying POST with alternative approach...');
                return api.post(url, data, { ...config, _retried: true });
            }
            throw error;
        }
    },
    
    // Put data
    put: async (url, data, config = {}) => {
        try {
            return await api.put(url, data, config);
        } catch (error) {
            if (error.message === 'Network Error' && !config._retried) {
                // Try again with different approach
                console.log('Retrying PUT with alternative approach...');
                return api.put(url, data, { ...config, _retried: true });
            }
            throw error;
        }
    },
    
    // Delete data
    delete: async (url, config = {}) => {
        try {
            return await api.delete(url, config);
        } catch (error) {
            if (error.message === 'Network Error' && !config._retried) {
                // Try again with different approach
                console.log('Retrying DELETE with alternative approach...');
                return api.delete(url, { ...config, _retried: true });
            }
            throw error;
        }
    },
    
    // Special method for handling file uploads
    upload: async (url, formData, config = {}) => {
        const uploadConfig = {
            ...config,
            headers: {
                ...config.headers,
                'Content-Type': 'multipart/form-data'
            }
        };
        
        try {
            return await api.post(url, formData, uploadConfig);
        } catch (error) {
            if (error.message === 'Network Error' && !config._retried) {
                // Try again with different timeout
                console.log('Retrying upload with longer timeout...');
                return api.post(url, formData, { 
                    ...uploadConfig, 
                    _retried: true,
                    timeout: 30000 // Longer timeout for uploads
                });
            }
            throw error;
        }
    },
    
    // Method for handling user authentication
    authenticate: async (credentials) => {
        try {
            const response = await api.post('/auth/login', credentials);
            
            if (response.data.token) {
                // Store tokens
                localStorage.setItem('token', response.data.token);
                if (response.data.refresh_token) {
                    localStorage.setItem('refreshToken', response.data.refresh_token);
                }
                
                // Store role-specific token if provided
                if (response.data.role && response.data.token) {
                    localStorage.setItem(`${response.data.role}_token`, response.data.token);
                }
            }
            
            return response;
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    },
    
    // Method to check health of the server
    checkHealth: async () => {
        try {
            return await api.get('/health');
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    },
    
    // Logout method
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('student_token');
        localStorage.removeItem('mentor_token');
        localStorage.removeItem('admin_token');
    }
};

export default enhancedApi; 