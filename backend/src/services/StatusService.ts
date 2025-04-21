/**
 * StatusService.ts
 * 状态页服务，处理状态页配置、监控项和客户端相关的业务逻辑
 */

import {
  StatusPageConfig,
  Monitor,
  Agent,
  getConfigMonitors,
  getConfigAgents,
  getStatusPageConfigById,
  updateStatusPageConfig,
  createStatusPageConfig,
  clearConfigMonitorLinks,
  clearConfigAgentLinks,
  addMonitorToConfig,
  addAgentToConfig,
  getAllStatusPageConfigs,
  getSelectedMonitors,
  getSelectedAgents,
  getMonitorsByIds,
  getMonitorHistory,
  getAgentsByIds,
  getAdminUserId,
  createDefaultConfig
} from '../repositories/status';
import { Bindings } from '../models/db';

/**
 * 获取状态页配置(管理员)
 * @param env 环境变量，包含数据库连接
 * @param userId 用户ID
 * @returns 状态页配置信息
 */
export async function getStatusPageConfig(env: { DB: Bindings['DB'] }, userId: number) {
  try {
    // 检查是否已存在配置
    const existingConfig = await getStatusPageConfigById(env.DB, userId);
    
    let configId: number;
    
    if (existingConfig && existingConfig.id) {
      configId = existingConfig.id;
    } else {
      // 创建默认配置
      const insertResult = await createStatusPageConfig(
        env.DB,
        userId,
        '系统状态',
        '实时监控系统状态',
        '',
        ''
      );
      
      if (!insertResult || typeof insertResult.id !== 'number') {
        throw new Error('创建状态页配置失败');
      }
      
      configId = insertResult.id;
    }
    
    // 获取该用户的所有监控项
    const monitorsResult = await getConfigMonitors(env.DB, configId, userId);
    
    // 获取该用户的所有客户端
    const agentsResult = await getConfigAgents(env.DB, configId, userId);
    
    // 构建配置对象返回
    const config = await env.DB.prepare(
      'SELECT * FROM status_page_config WHERE id = ?'
    ).bind(configId).first<{
      title?: string; 
      description?: string; 
      logo_url?: string; 
      custom_css?: string;
    }>();
    
    return {
      title: config?.title || '',
      description: config?.description || '',
      logoUrl: config?.logo_url || '',
      customCss: config?.custom_css || '',
      monitors: monitorsResult.results?.map(m => ({
        id: m.id,
        name: m.name,
        selected: m.selected === 1
      })) || [],
      agents: agentsResult.results?.map(a => ({
        id: a.id,
        name: a.name,
        selected: a.selected === 1
      })) || []
    };
  } catch (error) {
    console.error('获取状态页配置失败:', error);
    throw new Error('获取状态页配置失败');
  }
}

/**
 * 保存状态页配置
 * @param env 环境变量，包含数据库连接
 * @param userId 用户ID
 * @param data 要保存的配置数据
 * @returns 保存结果
 */
export async function saveStatusPageConfig(
  env: { DB: Bindings['DB'] },
  userId: number,
  data: {
    title: string;
    description: string;
    logoUrl: string;
    customCss: string;
    monitors: number[];
    agents: number[];
  }
) {
  try {
    // 检查是否已存在配置
    const existingConfig = await getStatusPageConfigById(env.DB, userId);
    
    let configId: number;
    
    if (existingConfig && existingConfig.id) {
      // 更新现有配置
      await updateStatusPageConfig(
        env.DB,
        existingConfig.id,
        data.title,
        data.description,
        data.logoUrl,
        data.customCss
      );
      
      configId = existingConfig.id;
    } else {
      // 创建新配置
      const insertResult = await createStatusPageConfig(
        env.DB,
        userId,
        data.title,
        data.description,
        data.logoUrl,
        data.customCss
      );
      
      if (!insertResult || typeof insertResult.id !== 'number') {
        throw new Error('创建状态页配置失败');
      }
      
      configId = insertResult.id;
    }
    
    // 清除现有的监控项关联
    await clearConfigMonitorLinks(env.DB, configId);
    
    // 清除现有的客户端关联
    await clearConfigAgentLinks(env.DB, configId);
    
    // 添加选定的监控项
    if (data.monitors && data.monitors.length > 0) {
      for (const monitorId of data.monitors) {
        await addMonitorToConfig(env.DB, configId, monitorId);
      }
    }
    
    // 添加选定的客户端
    if (data.agents && data.agents.length > 0) {
      for (const agentId of data.agents) {
        await addAgentToConfig(env.DB, configId, agentId);
      }
    }
    
    return { success: true, configId };
  } catch (error) {
    console.error('保存状态页配置失败:', error);
    throw new Error('保存状态页配置失败');
  }
}

/**
 * 获取状态页公开数据
 * @param env 环境变量，包含数据库连接
 * @returns 状态页公开数据
 */
export async function getStatusPagePublicData(env: { DB: Bindings['DB'] }) {
  try {
    // 获取所有配置
    const configsResult = await getAllStatusPageConfigs(env.DB);
    
    if (!configsResult.results || configsResult.results.length === 0) {
      // 尝试创建一个默认配置
      try {
        const adminUser = await getAdminUserId(env.DB);
        if (adminUser && adminUser.id) {
          const configId = await createDefaultConfig(env.DB, adminUser.id);
          if (configId) {
            // 重新获取新创建的配置
            const defaultConfig = await createDefaultStatusPageData(env);
            if (defaultConfig) {
              return { 
                success: true,
                data: defaultConfig
              };
            }
          }
        }
      } catch (error) {
        console.error('创建默认配置失败:', error);
      }
      
      return { 
        success: true,
        data: {
          title: '系统状态',
          description: '实时监控系统状态',
          logoUrl: '',
          customCss: '',
          monitors: [],
          agents: []
        }
      };
    }
    
    // 简单处理：获取第一个配置
    const config = configsResult.results[0];
    
    // 获取选中的监控项
    const selectedMonitors = await getSelectedMonitors(env.DB, config.id as number);
    
    // 获取选中的客户端
    const selectedAgents = await getSelectedAgents(env.DB, config.id as number);
    
    // 获取监控项详细信息
    let monitors: Monitor[] = [];
    if (selectedMonitors.results && selectedMonitors.results.length > 0) {
      const monitorIds = selectedMonitors.results.map(m => m.monitor_id);
      
      if (monitorIds.length > 0) {
        const monitorsResult = await getMonitorsByIds(env.DB, monitorIds);
        
        if (monitorsResult.results) {
          // 获取每个监控的历史记录
          monitors = await Promise.all(monitorsResult.results.map(async (monitor) => {
            const historyResult = await getMonitorHistory(env.DB, monitor.id);
            
            // 将历史记录转换为状态数组
            const history = historyResult.results 
              ? historyResult.results.map(h => h.status)
              : Array(24).fill('unknown');
              
            return {
              ...monitor,
              history
            };
          }));
        }
      }
    }
    
    // 获取客户端详细信息
    let agents: Agent[] = [];
    if (selectedAgents.results && selectedAgents.results.length > 0) {
      const agentIds = selectedAgents.results.map(a => a.agent_id);
      
      if (agentIds.length > 0) {
        const agentsResult = await getAgentsByIds(env.DB, agentIds);
        
        if (agentsResult.results) {
          agents = agentsResult.results;
        }
      }
    }
    
    // 为监控项添加必要的字段
    const enrichedMonitors = monitors.map((monitor: any) => ({
      ...monitor,
      status: monitor.status || 'unknown',
      uptime: monitor.uptime || 0,
      response_time: monitor.response_time || 0,
      history: monitor.history || Array(24).fill('unknown')
    }));
    
    // 为客户端添加资源使用情况字段
    const enrichedAgents = agents.map((agent: any) => {
      // 计算内存使用百分比 (如果有总量和使用量)
      const memoryPercent = agent.memory_total && agent.memory_used
        ? (agent.memory_used / agent.memory_total) * 100
        : null;
        
      // 计算磁盘使用百分比 (如果有总量和使用量)
      const diskPercent = agent.disk_total && agent.disk_used
        ? (agent.disk_used / agent.disk_total) * 100
        : null;
        
      return {
        ...agent,
        // 使用数据库中的 status 字段，不重新计算
        cpu: agent.cpu_usage || 0,               // 使用数据库中的CPU使用率
        memory: memoryPercent || 0,              // 使用数据库中的内存使用百分比
        disk: diskPercent || 0,                  // 使用数据库中的磁盘使用百分比
        network_rx: agent.network_rx || 0,       // 使用数据库中的网络下载速率
        network_tx: agent.network_tx || 0,       // 使用数据库中的网络上传速率
        hostname: agent.hostname || "未知主机",
        ip_addresses: agent.ip_addresses || "0.0.0.0",
        os: agent.os || "未知系统",
        version: agent.version || "未知版本"
      };
    });
    
    return {
      success: true,
      data: {
        title: config.title,
        description: config.description,
        logoUrl: config.logo_url,
        customCss: config.custom_css,
        monitors: enrichedMonitors,
        agents: enrichedAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          cpu: agent.cpu,
          memory: agent.memory,
          disk: agent.disk,
          network_rx: agent.network_rx,
          network_tx: agent.network_tx,
          hostname: agent.hostname,
          ip_addresses: agent.ip_addresses,
          os: agent.os,
          version: agent.version
        }))
      }
    };
  } catch (error) {
    console.error('获取状态页数据失败:', error);
    throw new Error('获取状态页数据失败: ' + String(error));
  }
}

/**
 * 创建默认状态页数据
 * @param env 环境变量，包含数据库连接
 * @returns 状态页数据
 */
export async function createDefaultStatusPageData(env: { DB: Bindings['DB'] }) {
  try {
    // 获取所有配置
    const configsResult = await getAllStatusPageConfigs(env.DB);
    if (!configsResult.results || configsResult.results.length === 0) {
      return null;
    }
    
    const config = configsResult.results[0];
    
    // 获取选中的监控项
    const selectedMonitors = await getSelectedMonitors(env.DB, config.id as number);
    
    // 获取选中的客户端
    const selectedAgents = await getSelectedAgents(env.DB, config.id as number);
    
    // 获取监控项详细信息
    let monitors: any[] = [];
    if (selectedMonitors.results && selectedMonitors.results.length > 0) {
      const monitorIds = selectedMonitors.results.map(m => m.monitor_id);
      
      if (monitorIds.length > 0) {
        const monitorsResult = await getMonitorsByIds(env.DB, monitorIds);
        
        if (monitorsResult.results) {
          monitors = monitorsResult.results;
        }
      }
    }
    
    // 获取客户端详细信息
    let agents: any[] = [];
    if (selectedAgents.results && selectedAgents.results.length > 0) {
      const agentIds = selectedAgents.results.map(a => a.agent_id);
      
      if (agentIds.length > 0) {
        const agentsResult = await getAgentsByIds(env.DB, agentIds);
        
        if (agentsResult.results) {
          agents = agentsResult.results;
        }
      }
    }
    
    // 为监控项添加必要的字段
    const enrichedMonitors = monitors.map(monitor => ({
      ...monitor,
      status: monitor.status || 'unknown',
      uptime: monitor.uptime || 0,
      response_time: monitor.response_time || 0,
      history: Array(24).fill('unknown')
    }));
    
    // 为客户端添加资源使用情况字段
    const enrichedAgents = agents.map(agent => {
      // 计算内存使用百分比 (如果有总量和使用量)
      const memoryPercent = agent.memory_total && agent.memory_used
        ? (agent.memory_used / agent.memory_total) * 100
        : null;
        
      // 计算磁盘使用百分比 (如果有总量和使用量)
      const diskPercent = agent.disk_total && agent.disk_used
        ? (agent.disk_used / agent.disk_total) * 100
        : null;
        
      return {
        ...agent,
        cpu: agent.cpu_usage || 0,
        memory: memoryPercent || 0,
        disk: diskPercent || 0,
        network_rx: agent.network_rx || 0,
        network_tx: agent.network_tx || 0,
        hostname: agent.hostname || "未知主机",
        ip_addresses: agent.ip_addresses || "0.0.0.0",
        os: agent.os || "未知系统",
        version: agent.version || "未知版本"
      };
    });
    
    return {
      title: config.title,
      description: config.description,
      logoUrl: config.logo_url,
      customCss: config.custom_css,
      monitors: enrichedMonitors,
      agents: enrichedAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        cpu: agent.cpu,
        memory: agent.memory,
        disk: agent.disk,
        network_rx: agent.network_rx,
        network_tx: agent.network_tx,
        hostname: agent.hostname,
        ip_addresses: agent.ip_addresses,
        os: agent.os,
        version: agent.version
      }))
    };
  } catch (error) {
    console.error('创建默认状态页数据失败:', error);
    return null;
  }
} 