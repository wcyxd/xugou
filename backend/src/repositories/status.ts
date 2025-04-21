import { Bindings } from '../models/db';

// 状态页配置接口定义
export interface StatusPageConfig {
  id?: number;
  user_id: number;
  title: string;
  description: string;
  logo_url: string;
  custom_css: string;
}

// 监控项接口
export interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  interval: number;
  timeout: number;
  expected_status: number;
  headers: string;
  body: string;
  created_by: number;
  active: boolean;
  status: string;
  uptime: number;
  response_time: number;
  last_checked?: string;
  created_at: string;
  updated_at: string;
  history?: string[];
}

// 客户端接口
export interface Agent {
  id: number;
  name: string;
  token: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  status?: string;
  cpu_usage?: number;
  memory_total?: number;
  memory_used?: number;
  disk_total?: number;
  disk_used?: number;
  network_rx?: number;
  network_tx?: number;
  hostname?: string;
  ip_addresses?: string;
  os?: string;
  version?: string;
}

// 数据库结果接口
interface DbQueryResult<T> {
  results?: T[];
  success: boolean;
  error?: string;
}

/**
 * 状态页相关的数据库操作
 */

// 获取用户的状态页配置
export async function getUserStatusPageConfig(db: Bindings['DB'], userId: number) {
  return await db.prepare(
    'SELECT * FROM status_page_config WHERE user_id = ?'
  ).bind(userId).all<StatusPageConfig>();
}

// 获取所有状态页配置
export async function getAllStatusPageConfigs(db: Bindings['DB']) {
  return await db.prepare(
    'SELECT * FROM status_page_config'
  ).all<StatusPageConfig>();
}

// 获取配置的监控项
export async function getConfigMonitors(db: Bindings['DB'], configId: number, userId: number) {
  return await db.prepare(
    'SELECT m.id, m.name, CASE WHEN spm.monitor_id IS NOT NULL THEN 1 ELSE 0 END as selected ' +
    'FROM monitors m ' +
    'LEFT JOIN status_page_monitors spm ON m.id = spm.monitor_id AND spm.config_id = ? ' +
    'WHERE m.created_by = ?'
  ).bind(configId, userId).all<{id: number, name: string, selected: number}>();
}

// 获取配置的客户端
export async function getConfigAgents(db: Bindings['DB'], configId: number, userId: number) {
  return await db.prepare(
    'SELECT a.id, a.name, CASE WHEN spa.agent_id IS NOT NULL THEN 1 ELSE 0 END as selected ' +
    'FROM agents a ' +
    'LEFT JOIN status_page_agents spa ON a.id = spa.agent_id AND spa.config_id = ? ' +
    'WHERE a.created_by = ?'
  ).bind(configId, userId).all<{id: number, name: string, selected: number}>();
}

// 检查状态页配置是否存在
export async function getStatusPageConfigById(db: Bindings['DB'], id: number) {
  return await db.prepare(
    'SELECT id FROM status_page_config WHERE id = ?'
  ).bind(id).first<{id: number}>();
}

// 更新状态页配置
export async function updateStatusPageConfig(
  db: Bindings['DB'],
  id: number,
  title: string,
  description: string,
  logoUrl: string,
  customCss: string
) {
  return await db.prepare(
    'UPDATE status_page_config SET title = ?, description = ?, logo_url = ?, custom_css = ? WHERE id = ?'
  ).bind(
    title,
    description,
    logoUrl,
    customCss,
    id
  ).run();
}

// 创建状态页配置
export async function createStatusPageConfig(
  db: Bindings['DB'],
  userId: number,
  title: string,
  description: string,
  logoUrl: string,
  customCss: string
) {
  const result = await db.prepare(
    'INSERT INTO status_page_config (user_id, title, description, logo_url, custom_css) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    userId,
    title,
    description,
    logoUrl,
    customCss
  ).run();
  
  if (!result.success) {
    throw new Error('创建状态页配置失败');
  }
  
  // 获取新插入的ID
  return await db.prepare('SELECT last_insert_rowid() as id').first<{ id: number }>();
}

// 清除配置的监控项关联
export async function clearConfigMonitorLinks(db: Bindings['DB'], configId: number) {
  return await db.prepare(
    'DELETE FROM status_page_monitors WHERE config_id = ?'
  ).bind(configId).run();
}

// 清除配置的客户端关联
export async function clearConfigAgentLinks(db: Bindings['DB'], configId: number) {
  return await db.prepare(
    'DELETE FROM status_page_agents WHERE config_id = ?'
  ).bind(configId).run();
}

// 添加监控项到配置
export async function addMonitorToConfig(db: Bindings['DB'], configId: number, monitorId: number) {
  return await db.prepare(
    'INSERT INTO status_page_monitors (config_id, monitor_id) VALUES (?, ?)'
  ).bind(configId, monitorId).run();
}

// 添加客户端到配置
export async function addAgentToConfig(db: Bindings['DB'], configId: number, agentId: number) {
  return await db.prepare(
    'INSERT INTO status_page_agents (config_id, agent_id) VALUES (?, ?)'
  ).bind(configId, agentId).run();
}

// 获取选中的监控项IDs
export async function getSelectedMonitors(db: Bindings['DB'], configId: number) {
  return await db.prepare(
    'SELECT monitor_id FROM status_page_monitors WHERE config_id = ?'
  ).bind(configId).all<{ monitor_id: number }>();
}

// 获取选中的客户端IDs
export async function getSelectedAgents(db: Bindings['DB'], configId: number) {
  return await db.prepare(
    'SELECT agent_id FROM status_page_agents WHERE config_id = ?'
  ).bind(configId).all<{ agent_id: number }>();
}

// 获取监控项详情
export async function getMonitorsByIds(db: Bindings['DB'], monitorIds: number[]) {
  if (monitorIds.length === 0) {
    return { results: [] };
  }
  
  const placeholders = monitorIds.map(() => '?').join(',');
  return await db.prepare(
    `SELECT * FROM monitors WHERE id IN (${placeholders})`
  ).bind(...monitorIds).all<Monitor>();
}

// 获取监控项历史状态记录
export async function getMonitorHistory(db: Bindings['DB'], monitorId: number, limit: number = 24) {
  return await db.prepare(
    `SELECT status, timestamp 
     FROM monitor_status_history 
     WHERE monitor_id = ? 
     ORDER BY timestamp DESC 
     LIMIT ?`
  ).bind(monitorId, limit).all<{status: string, timestamp: string}>();
}

// 获取客户端详情
export async function getAgentsByIds(db: Bindings['DB'], agentIds: number[]) {
  if (agentIds.length === 0) {
    return { results: [] };
  }
  
  const placeholders = agentIds.map(() => '?').join(',');
  return await db.prepare(
    `SELECT * FROM agents WHERE id IN (${placeholders})`
  ).bind(...agentIds).all<Agent>();
}

// 获取管理员用户ID
export async function getAdminUserId(db: Bindings['DB']) {
  return await db.prepare(
    'SELECT id FROM users WHERE role = ?'
  ).bind('admin').first<{id: number}>();
}

// 创建默认配置并关联所有监控项和客户端
export async function createDefaultConfig(db: Bindings['DB'], adminId: number) {
  // 创建默认配置
  const insertResult = await createStatusPageConfig(
    db,
    adminId,
    '系统状态',
    '实时监控系统状态',
    '',
    ''
  );
  
  if (!insertResult || typeof insertResult.id !== 'number') {
    throw new Error('创建默认配置失败');
  }
  
  const configId = insertResult.id;
  
  // 获取所有活跃监控项
  let monitors;
  try {
    monitors = await db.prepare(
      'SELECT * FROM monitors WHERE active = 1'
    ).all();
  } catch (error) {
    monitors = { results: [] };
  }
  
  // 获取所有客户端
  let agents;
  try {
    agents = await db.prepare(
      'SELECT * FROM agents'
    ).all();
  } catch (error) {
    agents = { results: [] };
  }
  
  // 关联监控项
  if (monitors.results && monitors.results.length > 0) {
    for (const monitor of monitors.results as {id: number}[]) {
      await addMonitorToConfig(db, configId, monitor.id);
    }
  }
  
  // 关联客户端
  if (agents.results && agents.results.length > 0) {
    for (const agent of agents.results as {id: number}[]) {
      await addAgentToConfig(db, configId, agent.id);
    }
  }
  
  return configId;
} 