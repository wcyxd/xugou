// API配置

/**
 * API基础URL配置
 * 
 * 根据不同的设备和环境，需要设置不同的URL：
 * - iOS模拟器访问本机服务器可以使用 http://localhost:8787 或 http://127.0.0.1:8787
 * - Android模拟器访问本机服务器需要使用 http://10.0.2.2:8787
 * - 真机调试需要使用开发电脑在局域网中的实际IP地址，例如 http://192.168.1.100:8787
 * 
 * 注意：
 * 1. 确保防火墙允许访问8787端口
 * 2. 确保后端服务器设置了正确的CORS配置
 * 3. 如果使用HTTPS，确保证书有效
 */
import { Platform } from 'react-native';

// 根据平台设置默认API_BASE_URL
export let API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8787'  // Android模拟器访问本机服务
  : 'http://localhost:8787'; // iOS模拟器和其他环境

import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL存储键名
const API_URL_STORAGE_KEY = 'api_base_url';

// 保存API基础URL到存储
export const saveApiBaseUrl = async (url: string): Promise<void> => {
  if (!url || !url.trim()) {
    return Promise.reject(new Error('无效的API URL'));
  }
  
  // 确保URL格式正确
  try {
    // 简单验证URL格式
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    
    // 使用正则表达式进行基本验证而不是new URL()
    const urlPattern = /^(https?:\/\/)([\w.-]+)(:\d+)?(\/.*)?$/;
    if (!urlPattern.test(url)) {
      throw new Error('URL格式不正确');
    }
    
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, url);
    API_BASE_URL = url;
    
    return Promise.resolve();
  } catch (error) {
    console.error('保存API基础URL失败', error);
    return Promise.reject(error);
  }
};

// 从存储中加载API基础URL
export const loadApiBaseUrl = async (): Promise<string> => {
  try {
    const savedUrl = await AsyncStorage.getItem(API_URL_STORAGE_KEY);
    if (savedUrl) {
      API_BASE_URL = savedUrl;
      console.log('从存储加载API URL:', savedUrl);
      return savedUrl;
    }
    console.log('未找到已保存的API URL，使用默认值:', API_BASE_URL);
    return API_BASE_URL;
  } catch (error) {
    console.error('加载API基础URL失败', error);
    return API_BASE_URL;
  }
};

// API端点配置
export const API_ENDPOINTS = {
  // 认证相关
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  GET_CURRENT_USER: '/api/auth/me',
  
  // 用户管理
  USERS: '/api/users',
  USER_DETAIL: (id: number) => `/api/users/${id}`,
  CHANGE_PASSWORD: (id: number) => `/api/users/${id}/change-password`,
  
  // 监控相关
  MONITORS: '/api/monitors',
  MONITOR_DETAIL: (id: number) => `/api/monitors/${id}`,
  MONITOR_HISTORY: (id: number) => `/api/monitors/${id}/history`,
  MONITOR_CHECKS: (id: number) => `/api/monitors/${id}/checks`,
  MONITOR_CHECK: (id: number) => `/api/monitors/${id}/check`,
  
  // 客户端相关
  AGENTS: '/api/agents',
  AGENT_DETAIL: (id: number) => `/api/agents/${id}`,
  AGENT_TOKEN: (id: number) => `/api/agents/${id}/token`,
  AGENT_GENERATE_TOKEN: '/api/agents/token/generate',
  AGENT_REGISTER: '/api/agents/register',
  AGENT_STATUS: '/api/agents/status',
  
  // 状态页相关
  STATUS_CONFIG: '/api/status/config',
  STATUS_DATA: '/api/status/data',
  
  // 通知相关
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATION_CHANNELS: '/api/notifications/channels',
  NOTIFICATION_CHANNEL_DETAIL: (id: number) => `/api/notifications/channels/${id}`,
  NOTIFICATION_TEMPLATES: '/api/notifications/templates',
  NOTIFICATION_TEMPLATE_DETAIL: (id: number) => `/api/notifications/templates/${id}`,
  NOTIFICATION_SETTINGS: '/api/notifications/settings',
  NOTIFICATION_SETTING_DETAIL: (id: number) => `/api/notifications/settings/${id}`,
  NOTIFICATION_HISTORY: '/api/notifications/history',
};

export default { API_BASE_URL, API_ENDPOINTS, saveApiBaseUrl, loadApiBaseUrl }; 