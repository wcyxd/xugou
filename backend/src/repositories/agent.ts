import { Bindings } from '../models/db';
import { Agent } from '../models/agent';

// 定义操作结果的元数据类型
interface DbResultMeta {
  changes?: number;
  [key: string]: any;
}

/**
 * 客户端相关的数据库操作
 */

// 获取所有客户端
export async function getAllAgents(db: Bindings['DB']) {
  return await db.prepare(
    'SELECT * FROM agents ORDER BY created_at DESC'
  ).all<Agent>();
}

// 获取用户创建的客户端
export async function getAgentsByUser(db: Bindings['DB'], userId: number) {
  return await db.prepare(
    'SELECT * FROM agents WHERE created_by = ? ORDER BY created_at DESC'
  ).bind(userId).all<Agent>();
}

// 获取单个客户端详情
export async function getAgentById(db: Bindings['DB'], id: number) {
  return await db.prepare(
    'SELECT * FROM agents WHERE id = ?'
  ).bind(id).first<Agent>();
}

// 创建新客户端
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
  const now = new Date().toISOString();
  
  // 将 ipAddresses 数组转换为 JSON 字符串
  const ipAddressesJson = ipAddresses ? JSON.stringify(ipAddresses) : null;
  
  const result = await db.prepare(
    `INSERT INTO agents 
     (name, token, created_by, status, created_at, updated_at, hostname, ip_addresses, os, version) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    name,
    token,
    createdBy,
    status,
    now,
    now,
    hostname,
    ipAddressesJson,
    os,
    version
  ).run();
  
  if (!result.success) {
    throw new Error('创建客户端失败');
  }
  
  // 获取新创建的客户端
  return await db.prepare(
    'SELECT * FROM agents WHERE rowid = last_insert_rowid()'
  ).first<Agent>();
}

// 更新客户端信息
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
  const fieldsToUpdate = [];
  const values = [];
  
  // 添加需要更新的字段
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      // 特殊处理 ip_addresses 数组，转换为 JSON 字符串
      if (key === 'ip_addresses' && Array.isArray(value)) {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(value);
      }
    }
  }
  
  // 添加更新时间
  fieldsToUpdate.push('updated_at = ?');
  values.push(new Date().toISOString());
  
  // 添加ID作为条件
  values.push(id);
  
  // 如果没有要更新的字段，直接返回
  if (fieldsToUpdate.length === 1) { // 只有updated_at
    return { success: true, message: '没有更新任何字段' };
  }
  
  // 执行更新
  const updateSql = `
    UPDATE agents 
    SET ${fieldsToUpdate.join(', ')} 
    WHERE id = ?
  `;
  
  const result = await db.prepare(updateSql).bind(...values).run();
  
  if (!result.success) {
    throw new Error('更新客户端失败');
  }
  
  // 获取更新后的客户端
  return await getAgentById(db, id);
}

// 更新客户端状态和指标
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
  const now = new Date().toISOString();
  
  // 将 ip_addresses 数组转换为 JSON 字符串
  const ipAddressesJson = metrics.ip_addresses ? JSON.stringify(metrics.ip_addresses) : null;
  
  const result = await db.prepare(
    `UPDATE agents SET 
     status = ?,
     cpu_usage = ?, 
     memory_total = ?, 
     memory_used = ?, 
     disk_total = ?, 
     disk_used = ?, 
     network_rx = ?, 
     network_tx = ?, 
     hostname = ?,
     ip_addresses = ?,
     os = ?,
     version = ?,
     updated_at = ?
     WHERE id = ?`
  ).bind(
    status,
    metrics.cpu_usage,
    metrics.memory_total,
    metrics.memory_used,
    metrics.disk_total,
    metrics.disk_used,
    metrics.network_rx,
    metrics.network_tx,
    metrics.hostname,
    ipAddressesJson,
    metrics.os,
    metrics.version,
    now,
    id
  ).run();
  
  if (!result.success) {
    throw new Error('更新客户端状态失败');
  }
  
  return { success: true, message: '客户端状态已更新' };
}

// 删除客户端
export async function deleteAgent(db: Bindings['DB'], id: number) {
  const result = await db.prepare(
    'DELETE FROM agents WHERE id = ?'
  ).bind(id).run();
  
  if (!result.success) {
    throw new Error('删除客户端失败');
  }
  
  return { success: true, message: '客户端已删除' };
}

// 更新客户端令牌
export async function updateAgentToken(db: Bindings['DB'], id: number, token: string) {
  const now = new Date().toISOString();
  
  const result = await db.prepare(
    'UPDATE agents SET token = ?, updated_at = ? WHERE id = ?'
  ).bind(token, now, id).run();
  
  if (!result.success) {
    throw new Error('更新客户端令牌失败');
  }
  
  return { success: true, message: '客户端令牌已更新', token };
}

// 通过令牌获取客户端
export async function getAgentByToken(db: Bindings['DB'], token: string) {
  return await db.prepare(
    'SELECT * FROM agents WHERE token = ?'
  ).bind(token).first<Agent>();
}

// 获取管理员用户ID
export async function getAdminUserId(db: Bindings['DB']) {
  const adminUser = await db.prepare(
    'SELECT id FROM users WHERE role = ?'
  ).bind('admin').first<{id: number}>();
  
  if (!adminUser) {
    throw new Error('无法找到管理员用户');
  }
  
  return adminUser.id;
}

// 获取活跃状态的客户端
export async function getActiveAgents(db: Bindings['DB']) {
  return await db.prepare(
    'SELECT id, name, updated_at FROM agents WHERE status = "active"'
  ).all();
}

// 设置客户端为离线状态
export async function setAgentInactive(db: Bindings['DB'], id: number) {
  const now = new Date().toISOString();
  
  return await db.prepare(
    'UPDATE agents SET status = "inactive", updated_at = ? WHERE id = ?'
  ).bind(now, id).run();
} 