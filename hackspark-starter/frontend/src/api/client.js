import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants.js';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error?.response?.data?.error 
      || error?.response?.data?.message 
      || error?.message 
      || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export const api = {
  get: (path, params) => client.get(path, { params }),
  post: (path, data) => client.post(path, data),
  put: (path, data) => client.put(path, data),
  delete: (path) => client.delete(path)
};

export default client;
