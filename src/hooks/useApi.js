import { useState, useCallback } from 'react';
import api from '../api/axios';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (method, url, data = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api[method](url, data);
      return response.data;
    } catch (err) {
      setError(err.response?.data || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute };
}; 