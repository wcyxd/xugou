import { Hono } from 'hono';
import { Bindings } from '../models/db';
import { Agent } from '../models/agent';
import { 
  getAgents,
  getAgentDetail,
  createAgentService,
  updateAgentService,
  deleteAgentService,
  generateAgentToken,
  registerAgentService,
  updateAgentStatusService
} from '../services/AgentService';

const agents = new Hono<{ Bindings: Bindings; Variables: { agent: Agent; jwtPayload: any } }>();

// 获取所有客户端
agents.get('/', async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    const result = await getAgents(c.env.DB, payload.id, payload.role);
    
    return c.json({ 
      success: result.success, 
      agents: result.agents,
      message: result.message 
    }, result.status as any);
  } catch (error) {
    console.error('获取客户端列表错误:', error);
    return c.json({ 
      success: false, 
      message: '获取客户端列表失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 创建新客户端
agents.post('/', async (c) => {
  try {
    const { name } = await c.req.json();
    const payload = c.get('jwtPayload');
    
    const result = await createAgentService(c.env.DB, c.env, name, payload.id);
    
    return c.json({ 
      success: result.success, 
      message: result.message,
      agent: result.agent
    }, result.status as any);
  } catch (error) {
    console.error('创建客户端错误:', error);
    return c.json({ 
      success: false, 
      message: '创建客户端失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 获取单个客户端
agents.get('/:id', async (c) => {
  try {
    const agentId = Number(c.req.param('id'));
    const payload = c.get('jwtPayload');
    
    const result = await getAgentDetail(c.env.DB, agentId, payload.id, payload.role);
    
    return c.json({ 
      success: result.success, 
      agent: result.agent,
      message: result.message
    }, result.status as any);
  } catch (error) {
    console.error('获取客户端详情错误:', error);
    return c.json({ 
      success: false, 
      message: '获取客户端详情失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 更新客户端信息
agents.put('/:id', async (c) => {
  try {
    const agentId = Number(c.req.param('id'));
    const payload = c.get('jwtPayload');
    const updateData = await c.req.json();
    
    const result = await updateAgentService(c.env.DB, agentId, updateData, payload.id, payload.role);
    
    return c.json({ 
      success: result.success, 
      message: result.message,
      agent: result.agent
    }, result.status as any);
  } catch (error) {
    console.error('更新客户端错误:', error);
    return c.json({ 
      success: false, 
      message: '更新客户端失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 删除客户端
agents.delete('/:id', async (c) => {
  try {
    const agentId = Number(c.req.param('id'));
    const payload = c.get('jwtPayload');
    
    const result = await deleteAgentService(c.env.DB, agentId, payload.id, payload.role);
    
    return c.json({ 
      success: result.success, 
      message: result.message
    }, result.status as any);
  } catch (error) {
    console.error('删除客户端错误:', error);
    return c.json({ 
      success: false, 
      message: '删除客户端失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 生成客户端Token
agents.post('/token/generate', async (c) => {
  try {
    // 生成新令牌
    const newToken = await generateAgentToken(c.env);
    
    // 可以选择将此token存储在临时表中，或者使用其他方式验证(例如，设置过期时间)
    // 这里为简化操作，只返回令牌

    return c.json({ 
      success: true, 
      message: '已生成客户端注册令牌',
      token: newToken
    });
  } catch (error) {
    console.error('生成注册令牌错误:', error);
    return c.json({ 
      success: false, 
      message: '生成注册令牌失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 客户端自注册接口
agents.post('/register', async (c) => {
  try {
    const { token, name, hostname, ip_addresses, os, version } = await c.req.json();
    
    const result = await registerAgentService(
      c.env.DB,
      c.env,
      token,
      name || 'New Agent',
      hostname,
      ip_addresses,
      os,
      version
    );
    
    return c.json({ 
      success: result.success, 
      message: result.message,
      agent: result.agent
    }, result.status as any);
  } catch (error) {
    console.error('客户端注册错误:', error);
    return c.json({ 
      success: false, 
      message: '客户端注册失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// 通过令牌更新客户端状态
agents.post('/status', async (c) => {
  try {
    const { 
      token,
      cpu_usage, 
      memory_total, 
      memory_used, 
      disk_total, 
      disk_used, 
      network_rx, 
      network_tx,
      hostname,
      ip_addresses,
      os,
      version
    } = await c.req.json();
    
    const result = await updateAgentStatusService(c.env.DB, c.env, token, {
      cpu_usage,
      memory_total,
      memory_used,
      disk_total,
      disk_used,
      network_rx,
      network_tx,
      hostname,
      ip_addresses,
      os,
      version
    });
    
    return c.json({ 
      success: result.success, 
      message: result.message
    }, result.status as any);
  } catch (error) {
    console.error('更新客户端状态错误:', error);
    return c.json({ 
      success: false, 
      message: '更新客户端状态失败',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default agents; 