import { Bindings } from '../models/db';
import { Agent } from '../models/agent';
import * as AgentRepository from '../repositories/agent';
import { generateToken, verifyToken } from '../utils/jwt';

/**
 * 获取所有客户端或按用户过滤
 * @param db 数据库连接
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns 客户端列表
 */
export async function getAgents(db: Bindings['DB'], userId: number, userRole: string) {
  try {
    // 根据用户角色过滤客户端
    let result;
    if (userRole === 'admin') {
      result = await AgentRepository.getAllAgents(db);
    } else {
      result = await AgentRepository.getAgentsByUser(db, userId);
    }
    
    return { 
      success: true, 
      agents: result.results || [],
      status: 200
    };
  } catch (error) {
    console.error('获取客户端列表错误:', error);
    return { 
      success: false, 
      message: '获取客户端列表失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 根据ID获取客户端详情
 * @param db 数据库连接
 * @param agentId 客户端ID
 * @param userId 当前用户ID
 * @param userRole 当前用户角色
 * @returns 客户端详情
 */
export async function getAgentDetail(db: Bindings['DB'], agentId: number, userId: number, userRole: string) {
  try {
    // 获取客户端信息
    const agent = await AgentRepository.getAgentById(db, agentId);
    
    if (!agent) {
      return { success: false, message: '客户端不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && agent.created_by !== userId) {
      return { success: false, message: '无权访问此客户端', status: 403 };
    }
    
    // 不返回令牌，但保留其他所有字段
    const { token, ...rest } = agent;
    
    return { 
      success: true, 
      agent: {
        ...rest,
        cpu_usage: rest.cpu_usage || 0,
        memory_total: rest.memory_total || 0,
        memory_used: rest.memory_used || 0,
        disk_total: rest.disk_total || 0,
        disk_used: rest.disk_used || 0,
        network_rx: rest.network_rx || 0,
        network_tx: rest.network_tx || 0,
        ip_addresses: getFormattedIPAddresses(rest.ip_addresses as any)
      },
      status: 200
    };
  } catch (error) {
    console.error('获取客户端详情错误:', error);
    return { 
      success: false, 
      message: '获取客户端详情失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 创建新客户端
 * @param db 数据库连接
 * @param env 环境变量
 * @param name 客户端名称
 * @param userId 创建者ID
 * @returns 创建结果
 */
export async function createAgentService(db: Bindings['DB'], env: any, name: string, userId: number) {
  try {
    // 验证名称
    if (!name || name.trim() === '') {
      return { success: false, message: '客户端名称不能为空', status: 400 };
    }
    
    // 生成令牌
    const token = await generateAgentToken(env);
    
    // 创建新客户端
    const newAgent = await AgentRepository.createAgent(db, name, token, userId);
    
    return { 
      success: true, 
      message: '客户端创建成功',
      agent: newAgent,
      status: 201
    };
  } catch (error) {
    console.error('创建客户端错误:', error);
    return { 
      success: false, 
      message: '创建客户端失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 更新客户端信息
 * @param db 数据库连接
 * @param agentId 客户端ID
 * @param updateData 更新数据
 * @param userId 当前用户ID
 * @param userRole 当前用户角色
 * @returns 更新结果
 */
export async function updateAgentService(
  db: Bindings['DB'],
  agentId: number,
  updateData: {
    name?: string;
    hostname?: string;
    ip_addresses?: string[];
    os?: string;
    version?: string;
    status?: string;
  },
  userId: number,
  userRole: string
) {
  try {
    // 获取当前客户端数据
    const agent = await AgentRepository.getAgentById(db, agentId);
    
    if (!agent) {
      return { success: false, message: '客户端不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && agent.created_by !== userId) {
      return { success: false, message: '无权修改此客户端', status: 403 };
    }
    
    // 验证数据
    if (updateData.name && updateData.name.trim() === '') {
      return { success: false, message: '客户端名称不能为空', status: 400 };
    }
    
    // 执行更新
    const result = await AgentRepository.updateAgent(db, agentId, updateData);
    
    if (typeof result === 'object' && 'message' in result && result.message === '没有更新任何字段') {
      return { 
        success: true, 
        message: '没有更新任何字段', 
        agent,
        status: 200
      };
    }
    
    return { 
      success: true, 
      message: '客户端信息已更新',
      agent: result,
      status: 200
    };
  } catch (error) {
    console.error('更新客户端错误:', error);
    return { 
      success: false, 
      message: '更新客户端失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 删除客户端
 * @param db 数据库连接
 * @param agentId 客户端ID
 * @param userId 当前用户ID
 * @param userRole 当前用户角色
 * @returns 删除结果
 */
export async function deleteAgentService(
  db: Bindings['DB'],
  agentId: number,
  userId: number,
  userRole: string
) {
  try {
    // 获取客户端信息
    const agent = await AgentRepository.getAgentById(db, agentId);
    
    if (!agent) {
      return { success: false, message: '客户端不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && agent.created_by !== userId) {
      return { success: false, message: '无权删除此客户端', status: 403 };
    }
    
    // 执行删除客户端
    await AgentRepository.deleteAgent(db, agent.id);
    
    return { 
      success: true, 
      message: '客户端已删除',
      status: 200
    };
  } catch (error) {
    console.error('删除客户端错误:', error);
    return { 
      success: false, 
      message: '删除客户端失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 生成客户端注册令牌
 * @param env 环境变量
 * @returns 生成结果
 */
export async function generateAgentToken(env: any) {
  try {
    return await generateToken(env);
  } catch (error) {
    console.error('生成令牌错误:', error);
    throw new Error('生成令牌失败');
  }
}

/**
 * 验证客户端注册令牌
 * @param token 令牌
 * @param env 环境变量
 * @returns 验证结果
 */
export async function verifyAgentToken(token: string, env: any) {
  try {
    return await verifyToken(token, env);
  } catch (error) {
    console.error('验证令牌错误:', error);
    return { valid: false, message: '令牌验证失败' };
  }
}

/**
 * 获取格式化后的IP地址
 * @param ipAddressesJson IP地址的JSON字符串
 * @returns 格式化后的IP地址
 */
export function getFormattedIPAddresses(ipAddressesJson: string | null): string {
  try {
    if (!ipAddressesJson) return '未知';
    const ipArray = JSON.parse(String(ipAddressesJson));
    return Array.isArray(ipArray) && ipArray.length > 0 
      ? ipArray.join(', ') 
      : '未知';
  } catch (e) {
    return String(ipAddressesJson || '未知');
  }
}

/**
 * 客户端自注册
 * @param db 数据库连接
 * @param env 环境变量
 * @param token 注册令牌
 * @param name 客户端名称
 * @param hostname 主机名
 * @param ipAddresses IP地址
 * @param os 操作系统
 * @param version 版本
 * @returns 注册结果
 */
export async function registerAgentService(
  db: Bindings['DB'],
  env: any,
  token: string,
  name: string,
  hostname: string | null = null,
  ipAddresses: string[] | null = null,
  os: string | null = null,
  version: string | null = null
) {
  try {
    // 验证令牌
    if (!token) {
      return { success: false, message: '缺少注册令牌', status: 400 };
    }
    
    // 通过token查找客户端
    const existingAgent = await AgentRepository.getAgentByToken(db, token);

    if (existingAgent) {
      return { success: false, message: '客户端已存在', status: 400 };
    }

    // 验证令牌
    const tokenVerification = await verifyAgentToken(token, env);
    
    // 如果令牌无效，返回错误
    if (!tokenVerification.valid) {
      return { 
        success: false, 
        message: `注册令牌无效: ${tokenVerification.message}`,
        status: 400
      };
    }
    
    // 查找管理员用户作为客户端创建者
    const adminId = await AgentRepository.getAdminUserId(db);
    
    // 创建新客户端
    const newAgent = await AgentRepository.createAgent(
      db,
      name || 'New Agent',
      token,
      adminId,
      'active',
      hostname || null,
      os || null,
      version || null,
      ipAddresses
    );
    
    return { 
      success: true, 
      message: '客户端注册成功',
      agent: { id: newAgent.id },
      status: 201
    };
  } catch (error) {
    console.error('客户端注册错误:', error);
    return { 
      success: false, 
      message: '客户端注册失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 更新客户端状态
 * @param db 数据库连接
 * @param env 环境变量
 * @param token 客户端令牌
 * @param metrics 性能指标
 * @returns 更新结果
 */
export async function updateAgentStatusService(
  db: Bindings['DB'],
  env: any,
  token: string,
  metrics: {
    cpu_usage?: number;
    memory_total?: number;
    memory_used?: number;
    disk_total?: number;
    disk_used?: number;
    network_rx?: number;
    network_tx?: number;
    hostname?: string;
    ip_addresses?: string[];
    os?: string;
    version?: string;
  }
) {
  try {
    if (!token) {
      return { success: false, message: '缺少API令牌', status: 400 };
    }
    
    // 通过token查找客户端
    const agent = await AgentRepository.getAgentByToken(db, token);
    
    if (!agent) {
      return { success: false, message: '客户端不存在或令牌无效', status: 404 };
    }
    
    // 更新客户端状态和资源指标
    await AgentRepository.updateAgentStatus(db, agent.id, 'active', metrics);
    
    // 处理通知逻辑
    try {
      // 动态导入阈值通知函数以避免循环依赖
      const { handleAgentThresholdNotification } = await import('../jobs/agent-task');
      
      // 检查CPU使用率是否需要通知
      if (typeof metrics.cpu_usage === 'number') {
        await handleAgentThresholdNotification(env, agent.id, 'cpu', metrics.cpu_usage);
      }
      
      // 检查内存使用率是否需要通知
      if (typeof metrics.memory_total === 'number' && 
          typeof metrics.memory_used === 'number' && 
          metrics.memory_total > 0) {
        const memoryUsagePercent = (metrics.memory_used / metrics.memory_total) * 100;
        await handleAgentThresholdNotification(env, agent.id, 'memory', memoryUsagePercent);
      }
      
      // 检查磁盘使用率是否需要通知
      if (typeof metrics.disk_total === 'number' && 
          typeof metrics.disk_used === 'number' && 
          metrics.disk_total > 0) {
        const diskUsagePercent = (metrics.disk_used / metrics.disk_total) * 100;
        await handleAgentThresholdNotification(env, agent.id, 'disk', diskUsagePercent);
      }
    } catch (notificationError) {
      console.error('处理阈值通知错误:', notificationError);
      // 这里不抛出错误，继续执行
    }
    
    return { 
      success: true, 
      message: '客户端状态已更新',
      agentId: agent.id,
      status: 200
    };
  } catch (error) {
    console.error('更新客户端状态错误:', error);
    return { 
      success: false, 
      message: '更新客户端状态失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

// 保留原有函数供直接使用
export async function getAllAgents(db: Bindings['DB']) {
  return await AgentRepository.getAllAgents(db);
}

export async function getAgentsByUser(db: Bindings['DB'], userId: number) {
  return await AgentRepository.getAgentsByUser(db, userId);
}

export async function getAgentById(db: Bindings['DB'], id: number) {
  return await AgentRepository.getAgentById(db, id);
}

export async function createAgent(
  db: Bindings['DB'],
  name: string,
  token: string,
  createdBy: number,
  status: string = 'inactive',
  hostname: string | null = null,
  os: string | null = null,
  version: string | null = null,
  ipAddresses: string[] | null = null
) {
  return await AgentRepository.createAgent(
    db,
    name,
    token,
    createdBy,
    status,
    hostname,
    os,
    version,
    ipAddresses
  );
}

export async function updateAgent(
  db: Bindings['DB'],
  id: number,
  fields: {
    name?: string;
    hostname?: string;
    ip_addresses?: string[];
    os?: string;
    version?: string;
    status?: string;
    cpu_usage?: number;
    memory_total?: number;
    memory_used?: number;
    disk_total?: number;
    disk_used?: number;
    network_rx?: number;
    network_tx?: number;
  }
) {
  return await AgentRepository.updateAgent(db, id, fields);
}

export async function updateAgentStatus(
  db: Bindings['DB'],
  id: number,
  status: string = 'active',
  metrics: {
    cpu_usage?: number;
    memory_total?: number;
    memory_used?: number;
    disk_total?: number;
    disk_used?: number;
    network_rx?: number;
    network_tx?: number;
    hostname?: string;
    ip_addresses?: string[];
    os?: string;
    version?: string;
  }
) {
  return await AgentRepository.updateAgentStatus(db, id, status, metrics);
}

export async function deleteAgent(db: Bindings['DB'], id: number) {
  return await AgentRepository.deleteAgent(db, id);
}

export async function updateAgentToken(db: Bindings['DB'], id: number, token: string) {
  return await AgentRepository.updateAgentToken(db, id, token);
}

export async function getAgentByToken(db: Bindings['DB'], token: string) {
  return await AgentRepository.getAgentByToken(db, token);
}

export async function getAdminUserId(db: Bindings['DB']) {
  return await AgentRepository.getAdminUserId(db);
}

export async function getActiveAgents(db: Bindings['DB']) {
  return await AgentRepository.getActiveAgents(db);
}

export async function setAgentInactive(db: Bindings['DB'], id: number) {
  return await AgentRepository.setAgentInactive(db, id);
}

export async function registerAgent(
  db: Bindings['DB'],
  env: any,
  token: string,
  name: string,
  hostname: string | null = null,
  ipAddresses: string[] | null = null,
  os: string | null = null,
  version: string | null = null
) {
  return await registerAgentService(db, env, token, name, hostname, ipAddresses, os, version);
} 