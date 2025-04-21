import axios from './client';
import { API_ENDPOINTS } from '../config/api';

// 客户端类型
export interface Agent {
  id: string | number;
  name: string;
  hostname?: string;
  ip_addresses?: string; // JSON 字符串，存储 IP 地址列表
  status: 'online' | 'offline' | 'unknown' | 'active';  // 添加'active'以兼容Dashboard
  lastSeen?: string;
  last_seen?: string;
  os?: string;
  operating_system?: string;
  version?: string;
  created_at: string;
  updated_at?: string;
  // 添加资源监控相关属性
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  memory_total?: number;
  memory_used?: number;
  disk_total?: number;
  disk_used?: number;
  network_rx?: number;
  network_tx?: number;
}

// 创建客户端参数
export interface CreateAgentParams {
  name: string;
}

// 更新客户端参数
export interface UpdateAgentParams {
  name?: string;
}

// 客户端API服务
const agentService = {
  // 获取所有客户端
  getAllAgents: async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.AGENTS);
      return {
        success: true,
        agents: response.data.agents || []
      };
    } catch (error) {
      console.error('获取客户端列表失败', error);
      return {
        success: false,
        message: '获取客户端列表失败',
        agents: []
      };
    }
  },
  
  // 获取单个客户端详情
  getAgentById: async (id: string) => {
    try {
      const response = await axios.get(API_ENDPOINTS.AGENT_DETAIL(Number(id)));
      return {
        success: true,
        agent: response.data.agent
      };
    } catch (error) {
      console.error(`获取客户端 ${id} 详情失败`, error);
      return {
        success: false,
        message: '获取客户端详情失败',
        agent: null
      };
    }
  },
  
  // 创建客户端
  createAgent: async (agentData: Partial<Agent>) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AGENTS, agentData);
      return {
        success: true,
        agent: response.data.agent
      };
    } catch (error) {
      console.error('创建客户端失败', error);
      return {
        success: false,
        message: '创建客户端失败',
        agent: null
      };
    }
  },
  
  // 更新客户端
  updateAgent: async (id: string, agentData: Partial<Agent>) => {
    try {
      const response = await axios.put(API_ENDPOINTS.AGENT_DETAIL(Number(id)), agentData);
      return {
        success: true,
        agent: response.data.agent
      };
    } catch (error) {
      console.error(`更新客户端 ${id} 失败`, error);
      return {
        success: false,
        message: '更新客户端失败',
        agent: null
      };
    }
  },
  
  // 删除客户端
  deleteAgent: async (id: string) => {
    try {
      await axios.delete(API_ENDPOINTS.AGENT_DETAIL(Number(id)));
      return {
        success: true
      };
    } catch (error) {
      console.error(`删除客户端 ${id} 失败`, error);
      return {
        success: false,
        message: '删除客户端失败'
      };
    }
  },
  
  // 生成新的客户端令牌
  generateToken: async (id: number): Promise<string | null> => {
    try {
      const response = await axios.post(API_ENDPOINTS.AGENT_TOKEN(id));
      
      if (response.data.success) {
        return response.data.token;
      }
      
      return null;
    } catch (error) {
      console.error(`生成客户端 ${id} 令牌失败`, error);
      return null;
    }
  },
  
  // 生成注册令牌
  generateRegistrationToken: async (): Promise<string | null> => {
    try {
      const response = await axios.post(API_ENDPOINTS.AGENT_GENERATE_TOKEN);
      
      if (response.data.success) {
        return response.data.token;
      }
      
      return null;
    } catch (error) {
      console.error('生成注册令牌失败', error);
      return null;
    }
  },
  
  // 为DashboardScreen添加的兼容方法
  getAgents: async (): Promise<Agent[]> => {
    try {
      console.log('调用getAgents方法获取客户端列表');
      const result = await agentService.getAllAgents();
      if (result.success && result.agents) {
        console.log(`成功获取${result.agents.length}个客户端`);
        return result.agents;
      }
      console.warn('客户端列表为空或获取失败');
      return [];
    } catch (error) {
      console.error('获取客户端列表异常:', error);
      return [];
    }
  }
};

export default agentService; 