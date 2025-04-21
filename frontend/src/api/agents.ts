import api from './index';

export interface Agent {
  id: number;
  name: string;
  status?: string;
  created_at: string;
  updated_at: string;
  cpu_usage: number;
  memory_total: number;
  memory_used: number;
  disk_total: number;
  disk_used: number;
  network_rx: number;
  network_tx: number;
  hostname?: string;
  ip_addresses?: string;
  os?: string;
  version?: string;
  token?: string;
  created_by?: number;
}

export const generateToken = async () => {
  try {
    const response = await api.post('/api/agents/token/generate');
    return response.data;
  } catch (error) {
    console.error('生成客户端注册令牌失败:', error);
    return {
      success: false,
      message: '生成客户端注册令牌失败'
    };
  }
};

export const getAllAgents = async () => {
  try {
    const response = await api.get('/api/agents');
    return response.data;
  } catch (error) {
    console.error('获取客户端列表失败:', error);
    return {
      success: false,
      message: '获取客户端列表失败'
    };
  }
};

export const updateAgentStatus = async (id: number, metrics: {
  cpu_usage: number;
  memory_total: number;
  memory_used: number;
  disk_total: number;
  disk_used: number;
  network_rx: number;
  network_tx: number;
}) => {
  try {
    const response = await api.post(`/api/agents/${id}/status`, metrics);
    return response.data;
  } catch (error) {
    console.error('更新客户端状态失败:', error);
    return {
      success: false,
      message: '更新客户端状态失败'
    };
  }
};

export const getAgent = async (id: number) => {
  try {
    const response = await api.get(`/api/agents/${id}`);
    return response.data;
  } catch (error) {
    console.error(`获取客户端 ${id} 失败:`, error);
    return {
      success: false,
      message: '获取客户端失败'
    };
  }
};

export const deleteAgent = async (id: number) => {
  try {
    const response = await api.delete(`/api/agents/${id}`);
    return response.data;
  } catch (error) {
    console.error(`删除客户端 ${id} 失败:`, error);
    return {
      success: false,
      message: '删除客户端失败'
    };
  }
};

export const updateAgent = async (id: number, data: {
  name?: string;
  hostname?: string;
  ip_addresses?: string;
  os?: string;
  version?: string;
  status?: string;
}) => {
  try {
    const response = await api.put(`/api/agents/${id}`, data);
    return response.data;
  } catch (error) {
    console.error(`更新客户端 ${id} 失败:`, error);
    return {
      success: false,
      message: '更新客户端失败'
    };
  }
}; 