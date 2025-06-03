import axios from 'axios';

/**
 * Configure axios to debug circular reference issues
 */
export const configureAxiosDebugging = () => {
    // Add request interceptor
    axios.interceptors.request.use(
        config => {
            try {
                // Check if the request has data
                if (config.data) {
                    // Try to stringify the data to catch circular references early
                    JSON.stringify(config.data);
                }
                return config;
            } catch (error) {
                console.error('Circular reference detected in axios request!', error);
                console.error('Request URL:', config.url);
                console.error('Original data that caused the issue:', config.data);
                
                // Try to create a safe version of the data
                const safeData = {};
                try {
                    // Extract only primitive values and arrays
                    for (const key in config.data) {
                        const value = config.data[key];
                        const type = typeof value;
                        
                        if (type === 'string' || type === 'number' || type === 'boolean' || value === null) {
                            safeData[key] = value;
                        } else if (Array.isArray(value)) {
                            try {
                                // Ensure array can be serialized
                                JSON.stringify(value);
                                safeData[key] = value;
                            } catch (e) {
                                safeData[key] = [];
                                console.warn(`Array at ${key} contained circular references, replacing with empty array`);
                            }
                        } else if (type === 'object') {
                            try {
                                // Ensure object can be serialized
                                const serialized = JSON.stringify(value);
                                safeData[key] = JSON.parse(serialized);
                            } catch (e) {
                                safeData[key] = {};
                                console.warn(`Object at ${key} contained circular references, replacing with empty object`);
                            }
                        }
                    }
                    
                    console.log('Using safe data instead:', safeData);
                    config.data = safeData;
                } catch (e) {
                    console.error('Failed to create safe data:', e);
                    config.data = {};
                }
                
                return config;
            }
        },
        error => {
            return Promise.reject(error);
        }
    );
};

export default configureAxiosDebugging; 