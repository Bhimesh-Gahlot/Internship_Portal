import api from './api';

export const login = (credentials) => {
    return api.post('/login', credentials);
};

export const register = (userData) => {
    return api.post('/register', userData);
};

export const logout = () => {
    localStorage.removeItem('token');
}; 