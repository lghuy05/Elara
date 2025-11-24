// api/client.ts - ENHANCED VERSION
import axios from 'axios';
import { getToken, removeToken } from '../utils/storage';
import { router } from 'expo-router';

const API_BASE_URL = 'https://ai-doctor-chatbot-zw8n.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`🟡 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    const isAuthEndpoint = config.url?.includes('/auth/');
    if (!isAuthEndpoint) {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Token added to request');
        }
      } catch (error) {
        console.error('❌ Error adding token to request:', error);
      }
    }
    if (config.data) {
      console.log('📤 Request payload:', JSON.stringify(config.data, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response ${response.status} from: ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      console.log('🔄 Token expired, redirecting to login...');
      removeToken();

      setTimeout(() => {
        router.replace('/auth/login');
      }, 100);
    } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      console.log('🔴 Network Error - Check internet connection');
    }

    return Promise.reject(error);
  }
);

export default api;
