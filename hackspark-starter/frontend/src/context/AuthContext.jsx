import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEYS, ROUTES } from '../utils/constants.js';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken, removeToken] = useLocalStorage(STORAGE_KEYS.TOKEN, '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = useMemo(() => !!token, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/users/login', { email, password });
      setToken(data.token);
      setUser(data.user || null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/users/register', { name, email, password });
      setToken(data.token);
      setUser(data.user || null);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setError(null);
  }, [removeToken]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    clearError
  }), [token, user, isAuthenticated, loading, error, login, register, logout, clearError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
