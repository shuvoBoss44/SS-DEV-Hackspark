import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

export const useApi = (url, options = {}) => {
  const { immediate = true, params = {} } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (requestParams = params) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(url, requestParams);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url]);

  const refetch = useCallback(() => {
    return execute(params);
  }, [execute, params]);

  useEffect(() => {
    if (immediate) {
      execute(params);
    }
  }, [immediate, execute]);

  return { data, loading, error, execute, refetch, setData };
};

export const useMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (method, url, data) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api[method](url, data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, setError };
};
