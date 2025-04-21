import { Bindings } from '../models/db';
import { Monitor, MonitorStatusHistory, MonitorCheck } from '../models/monitor';

// 定义操作结果的元数据类型
interface DbResultMeta {
  changes?: number;
  [key: string]: any;
}

/**
 * 监控相关的数据库操作
 */

// 清理30天以前的历史记录
export async function cleanupOldRecords(db: Bindings['DB']) {
  try {
    console.log('开始清理30天以前的历史记录...');
    
    // 清理监控状态历史记录
    const deleteStatusHistoryResult = await db.prepare(`
      DELETE FROM monitor_status_history 
      WHERE timestamp < datetime('now', '-30 days')
    `).run();
    
    // 清理监控检查记录
    const deleteChecksResult = await db.prepare(`
      DELETE FROM monitor_checks 
      WHERE checked_at < datetime('now', '-30 days')
    `).run();
    
    // 清理通知历史记录
    const deleteNotificationHistoryResult = await db.prepare(`
      DELETE FROM notification_history 
      WHERE sent_at < datetime('now', '-30 days')
    `).run();
    
    const statusHistoryDeleted = (deleteStatusHistoryResult.meta as DbResultMeta)?.changes || 0;
    const checksDeleted = (deleteChecksResult.meta as DbResultMeta)?.changes || 0;
    const notificationHistoryDeleted = (deleteNotificationHistoryResult.meta as DbResultMeta)?.changes || 0;
    
    console.log(`清理完成：删除了 ${statusHistoryDeleted} 条状态历史记录，${checksDeleted} 条检查记录，${notificationHistoryDeleted} 条通知历史记录`);
    
    return {
      success: true,
      statusHistoryDeleted,
      checksDeleted,
      notificationHistoryDeleted
    };
  } catch (error) {
    console.error('清理历史记录出错:', error);
    return { success: false, error: String(error) };
  }
}

// 获取需要检查的监控列表
export async function getMonitorsToCheck(db: Bindings['DB']) {
  return await db.prepare(`
    SELECT * FROM monitors 
    WHERE active = true 
    AND (last_checked IS NULL OR datetime('now') > datetime(last_checked, '+' || interval || ' seconds'))
  `).all();
}

// 获取单个监控详情
export async function getMonitorById(db: Bindings['DB'], id: number) {
  return await db.prepare(
    'SELECT * FROM monitors WHERE id = ?'
  ).bind(id).first<Monitor>();
}

// 获取监控状态历史
export async function getMonitorStatusHistory(db: Bindings['DB'], monitorId: number) {
  return await db.prepare(
    `SELECT * FROM monitor_status_history 
     WHERE monitor_id = ? 
     ORDER BY timestamp ASC`
  ).bind(monitorId).all<MonitorStatusHistory>();
}

// 获取监控检查记录
export async function getMonitorChecks(db: Bindings['DB'], monitorId: number, limit: number = 5) {
  return await db.prepare(
    `SELECT * FROM monitor_checks 
     WHERE monitor_id = ? 
     ORDER BY checked_at DESC 
     LIMIT ?`
  ).bind(monitorId, limit).all();
}

// 记录监控状态历史
export async function insertMonitorStatusHistory(db: Bindings['DB'], monitorId: number, status: string) {
  // 使用ISO格式的时间戳
  const now = new Date().toISOString();
  
  return await db.prepare(
    `INSERT INTO monitor_status_history (monitor_id, status, timestamp) 
     VALUES (?, ?, ?)`
  ).bind(monitorId, status, now).run();
}

// 记录监控检查详情
export async function insertMonitorCheck(
  db: Bindings['DB'], 
  monitorId: number, 
  status: string, 
  responseTime: number, 
  statusCode: number | null, 
  error: string | null = null
) {
  // 使用ISO格式的时间戳
  const now = new Date().toISOString();
  
  return await db.prepare(
    `INSERT INTO monitor_checks
     (monitor_id, status, response_time, status_code, error, checked_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(monitorId, status, responseTime, statusCode, error, now).run();
}

// 更新监控状态
export async function updateMonitorStatus(
  db: Bindings['DB'], 
  monitorId: number, 
  status: string, 
  responseTime: number
) {
  // 使用ISO格式的时间戳
  const now = new Date().toISOString();
  
  return await db.prepare(
    `UPDATE monitors 
     SET status = ?, 
         last_checked = ?,
         response_time = ?,
         uptime = (
           SELECT ROUND((COUNT(CASE WHEN status = 'up' THEN 1 ELSE NULL END) * 100.0 / COUNT(*)), 2)
           FROM monitor_status_history
           WHERE monitor_id = ?
           ORDER BY timestamp DESC
           LIMIT 100
         )
     WHERE id = ?`
  ).bind(status, now, responseTime, monitorId, monitorId).run();
}

// 记录监控出错状态
export async function recordMonitorError(
  db: Bindings['DB'], 
  monitorId: number, 
  errorMessage: string
) {
  // 记录错误状态
  await insertMonitorStatusHistory(db, monitorId, 'down');
  
  // 记录检查详情
  await insertMonitorCheck(db, monitorId, 'down', 0, null, errorMessage);
  
  // 使用ISO格式的时间戳
  const now = new Date().toISOString();
  
  // 更新监控状态
  return await db.prepare(
    `UPDATE monitors 
     SET status = 'down',
         last_checked = ?,
         response_time = 0,
         uptime = (
           SELECT ROUND((COUNT(CASE WHEN status = 'up' THEN 1 ELSE NULL END) * 100.0 / COUNT(*)), 2)
           FROM monitor_status_history
           WHERE monitor_id = ?
           ORDER BY timestamp DESC
           LIMIT 100
         )
     WHERE id = ?`
  ).bind(now, monitorId, monitorId).run();
}

// 创建新监控
export async function createMonitor(
  db: Bindings['DB'],
  name: string,
  url: string,
  method: string = 'GET',
  interval: number = 60,
  timeout: number = 30,
  expectedStatus: number = 200,
  headers: string = '{}',
  body: string = '',
  userId: number
) {
  const now = new Date().toISOString();
  
  const result = await db.prepare(
    `INSERT INTO monitors 
     (name, url, method, interval, timeout, expected_status, headers, body, created_by, active, status, uptime, response_time, last_checked, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    name,
    url,
    method,
    interval,
    timeout,
    expectedStatus,
    headers,
    body,
    userId,
    1, // active
    'pending',
    100.0,
    0,
    null,
    now,
    now
  ).run();
  
  if (!result.success) {
    throw new Error('创建监控失败');
  }
  
  // 获取新创建的监控
  return await db.prepare(
    'SELECT * FROM monitors WHERE rowid = last_insert_rowid()'
  ).first<Monitor>();
}

// 更新监控配置
export async function updateMonitorConfig(
  db: Bindings['DB'],
  id: number,
  updates: Partial<Monitor>
) {
  // 准备更新字段
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  
  if (updates.url !== undefined) {
    fields.push('url = ?');
    values.push(updates.url);
  }
  
  if (updates.method !== undefined) {
    fields.push('method = ?');
    values.push(updates.method);
  }
  
  if (updates.interval !== undefined) {
    fields.push('interval = ?');
    values.push(updates.interval);
  }
  
  if (updates.timeout !== undefined) {
    fields.push('timeout = ?');
    values.push(updates.timeout);
  }
  
  if (updates.expected_status !== undefined) {
    fields.push('expected_status = ?');
    values.push(updates.expected_status);
  }
  
  if (updates.headers !== undefined) {
    fields.push('headers = ?');
    values.push(updates.headers);
  }
  
  if (updates.body !== undefined) {
    fields.push('body = ?');
    values.push(updates.body);
  }
  
  if (updates.active !== undefined) {
    fields.push('active = ?');
    values.push(updates.active ? 1 : 0);
  }
  
  // 添加更新时间
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  
  // 没有要更新的字段时返回
  if (fields.length === 0) {
    return { message: '没有提供要更新的字段' };
  }
  
  // 添加 ID 作为 WHERE 条件
  values.push(id);
  
  // 执行更新
  const result = await db.prepare(
    `UPDATE monitors SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();
  
  if (!result.success) {
    throw new Error('更新监控失败');
  }
  
  // 获取更新后的监控
  return await db.prepare(
    'SELECT * FROM monitors WHERE id = ?'
  ).bind(id).first<Monitor>();
}

// 删除监控
export async function deleteMonitor(db: Bindings['DB'], id: number) {
  // 先删除关联的历史数据
  await db.prepare(
    'DELETE FROM monitor_status_history WHERE monitor_id = ?'
  ).bind(id).run();
  
  await db.prepare(
    'DELETE FROM monitor_checks WHERE monitor_id = ?'
  ).bind(id).run();
  
  // 执行删除监控
  return await db.prepare(
    'DELETE FROM monitors WHERE id = ?'
  ).bind(id).run();
} 