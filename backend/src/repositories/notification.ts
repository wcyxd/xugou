import { D1Database, D1Result } from '../models/db';
import { 
  NotificationChannel, 
  NotificationTemplate, 
  NotificationSettings,
  NotificationHistory,
  NotificationConfig
} from '../models/notification';

// 扩展D1Result meta属性的类型
interface D1Meta {
  last_row_id?: number;
  changes?: number;
}

// 获取所有通知渠道
export const getNotificationChannels = async (db: D1Database): Promise<NotificationChannel[]> => {
  const result = await db.prepare(
    'SELECT * FROM notification_channels ORDER BY id'
  ).all<NotificationChannel>();
  return result.results || [];
};

// 根据ID获取通知渠道
export const getNotificationChannelById = async (db: D1Database, id: number): Promise<NotificationChannel | null> => {
  const result = await db.prepare(
    'SELECT * FROM notification_channels WHERE id = ?'
  ).bind(id).first<NotificationChannel>();
  return result;
};

// 创建通知渠道
export const createNotificationChannel = async (
  db: D1Database, 
  channel: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>
): Promise<number> => {
  const result = await db.prepare(
    `INSERT INTO notification_channels (name, type, config, enabled, created_by) 
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    channel.name, 
    channel.type, 
    channel.config, 
    channel.enabled ? 1 : 0, 
    channel.created_by
  ).run();
  
  return ((result.meta as D1Meta)?.last_row_id) || 0;
};

// 更新通知渠道
export const updateNotificationChannel = async (
  db: D1Database, 
  id: number, 
  channel: Partial<Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  const sets: string[] = [];
  const values: any[] = [];
  
  if (channel.name !== undefined) {
    sets.push('name = ?');
    values.push(channel.name);
  }
  
  if (channel.type !== undefined) {
    sets.push('type = ?');
    values.push(channel.type);
  }
  
  if (channel.config !== undefined) {
    sets.push('config = ?');
    values.push(channel.config);
  }
  
  if (channel.enabled !== undefined) {
    sets.push('enabled = ?');
    values.push(channel.enabled ? 1 : 0);
  }
  
  if (sets.length === 0) {
    return false;
  }
  
  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const result = await db.prepare(
    `UPDATE notification_channels SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...values).run();
  
  return (((result.meta as D1Meta)?.changes) || 0) > 0;
};

// 删除通知渠道
export const deleteNotificationChannel = async (db: D1Database, id: number): Promise<boolean> => {
  // 先删除通知历史记录表中的关联记录
  await db.prepare(
    'DELETE FROM notification_history WHERE channel_id = ?'
  ).bind(id).run();
  
  // 再检查并更新通知设置中的channels列表
  const allSettings = await db.prepare(
    'SELECT id, channels FROM notification_settings'
  ).all<{ id: number, channels: string }>();
  
  // 遍历所有设置，从channels列表中移除要删除的渠道ID
  if (allSettings.results && allSettings.results.length > 0) {
    for (const setting of allSettings.results) {
      try {
        const channelsList = JSON.parse(setting.channels || '[]');
        const newChannelsList = channelsList.filter((channelId: number) => channelId !== id);
        
        // 如果列表变化了，更新数据库
        if (JSON.stringify(channelsList) !== JSON.stringify(newChannelsList)) {
          await db.prepare(
            'UPDATE notification_settings SET channels = ? WHERE id = ?'
          ).bind(JSON.stringify(newChannelsList), setting.id).run();
        }
      } catch (error) {
        console.error('解析通知设置渠道列表出错:', error);
      }
    }
  }
  
  // 最后删除通知渠道本身
  const result = await db.prepare(
    'DELETE FROM notification_channels WHERE id = ?'
  ).bind(id).run();
  
  return (((result.meta as D1Meta)?.changes) || 0) > 0;
};

// 获取所有通知模板
export const getNotificationTemplates = async (db: D1Database): Promise<NotificationTemplate[]> => {
  const result = await db.prepare(
    'SELECT * FROM notification_templates ORDER BY is_default DESC, id'
  ).all<NotificationTemplate>();
  return result.results || [];
};

// 根据ID获取通知模板
export const getNotificationTemplateById = async (db: D1Database, id: number): Promise<NotificationTemplate | null> => {
  const result = await db.prepare(
    'SELECT * FROM notification_templates WHERE id = ?'
  ).bind(id).first<NotificationTemplate>();
  return result;
};

// 创建通知模板
export const createNotificationTemplate = async (
  db: D1Database, 
  template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<number> => {
  const result = await db.prepare(
    `INSERT INTO notification_templates (name, type, subject, content, is_default, created_by) 
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    template.name, 
    template.type, 
    template.subject, 
    template.content, 
    template.is_default ? 1 : 0, 
    template.created_by
  ).run();
  
  return ((result.meta as D1Meta)?.last_row_id) || 0;
};

// 更新通知模板
export const updateNotificationTemplate = async (
  db: D1Database, 
  id: number, 
  template: Partial<Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  const sets: string[] = [];
  const values: any[] = [];
  
  if (template.name !== undefined) {
    sets.push('name = ?');
    values.push(template.name);
  }
  
  if (template.type !== undefined) {
    sets.push('type = ?');
    values.push(template.type);
  }
  
  if (template.subject !== undefined) {
    sets.push('subject = ?');
    values.push(template.subject);
  }
  
  if (template.content !== undefined) {
    sets.push('content = ?');
    values.push(template.content);
  }
  
  if (template.is_default !== undefined) {
    sets.push('is_default = ?');
    values.push(template.is_default ? 1 : 0);
  }
  
  if (sets.length === 0) {
    return false;
  }
  
  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const result = await db.prepare(
    `UPDATE notification_templates SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...values).run();
  
  return (((result.meta as D1Meta)?.changes) || 0) > 0;
};

// 删除通知模板
export const deleteNotificationTemplate = async (db: D1Database, id: number): Promise<boolean> => {
  const result = await db.prepare(
    'DELETE FROM notification_templates WHERE id = ?'
  ).bind(id).run();
  
  return (((result.meta as D1Meta)?.changes) || 0) > 0;
};

// 获取用户的全局通知设置
export const getGlobalSettings = async (db: D1Database, userId: number): Promise<{
  monitorSettings: NotificationSettings | null;
  agentSettings: NotificationSettings | null;
}> => {
  const monitorSettings = await db.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ? AND target_type = ?'
  ).bind(userId, 'global-monitor').first<NotificationSettings>();
  
  const agentSettings = await db.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ? AND target_type = ?'
  ).bind(userId, 'global-agent').first<NotificationSettings>();
  
  return {
    monitorSettings,
    agentSettings
  };
};

// 获取特定对象的通知设置
export const getSpecificSettings = async (
  db: D1Database, 
  userId: number, 
  targetType: 'monitor' | 'agent', 
  targetId?: number
): Promise<NotificationSettings[]> => {
  let query = 'SELECT * FROM notification_settings WHERE user_id = ? AND target_type = ?';
  const params: any[] = [userId, targetType];
  
  if (targetId !== undefined) {
    query += ' AND target_id = ?';
    params.push(targetId);
  }
  
  const result = await db.prepare(query).bind(...params).all<NotificationSettings>();
  return result.results || [];
};

// 创建或更新通知设置
export const createOrUpdateSettings = async (
  db: D1Database, 
  settings: Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>
): Promise<number> => {
  // 先检查是否已存在相同的设置
  const existingSettings = await db.prepare(
    'SELECT id FROM notification_settings WHERE user_id = ? AND target_type = ? AND (target_id = ? OR (target_id IS NULL AND ? IS NULL))'
  ).bind(
    settings.user_id, 
    settings.target_type, 
    settings.target_id, 
    settings.target_id
  ).first<{ id: number }>();
  
  if (existingSettings) {
    // 如果存在则更新
    const sets: string[] = [];
    const values: any[] = [];
    
    // 动态构建UPDATE语句
    Object.entries(settings).forEach(([key, value]) => {
      if (key !== 'user_id' && key !== 'target_type' && key !== 'target_id') {
        sets.push(`${key} = ?`);
        
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });
    
    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(existingSettings.id);
    
    await db.prepare(
      `UPDATE notification_settings SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...values).run();
    
    return existingSettings.id;
  } else {
    // 如果不存在则创建
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];
    
    Object.entries(settings).forEach(([key, value]) => {
      keys.push(key);
      placeholders.push('?');
      
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    });
    
    const result = await db.prepare(
      `INSERT INTO notification_settings (${keys.join(', ')}) VALUES (${placeholders.join(', ')})`
    ).bind(...values).run();
    
    return ((result.meta as D1Meta)?.last_row_id) || 0;
  }
};

// 删除特定对象的通知设置
export const deleteNotificationSettings = async (
  db: D1Database, 
  id: number
): Promise<boolean> => {
  const result = await db.prepare(
    'DELETE FROM notification_settings WHERE id = ?'
  ).bind(id).run();
  
  return (((result.meta as D1Meta)?.changes) || 0) > 0;
};

// 记录通知历史
export const createNotificationHistory = async (
  db: D1Database,
  history: Omit<NotificationHistory, 'id' | 'sent_at'>
): Promise<number> => {
  const result = await db.prepare(
    `INSERT INTO notification_history 
     (type, target_id, channel_id, template_id, status, content, error) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    history.type,
    history.target_id,
    history.channel_id,
    history.template_id,
    history.status,
    history.content,
    history.error
  ).run();
  
  return ((result.meta as D1Meta)?.last_row_id) || 0;
};

// 获取通知历史记录
export const getNotificationHistory = async (
  db: D1Database,
  filter: {
    type?: string | undefined;
    targetId?: number | undefined;
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }
): Promise<{ total: number; records: NotificationHistory[] }> => {
  // 构建查询
  let whereConditions = [];
  let whereParams = [];
  
  if (filter.type) {
    whereConditions.push('type = ?');
    whereParams.push(filter.type);
  }
  
  if (filter.targetId !== undefined) {
    whereConditions.push('target_id = ?');
    whereParams.push(filter.targetId);
  }
  
  if (filter.status) {
    whereConditions.push('status = ?');
    whereParams.push(filter.status);
  }
  
  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';
  
  // 查询总数
  const countQuery = `SELECT COUNT(*) as count FROM notification_history ${whereClause}`;
  const countResult = await db.prepare(countQuery).bind(...whereParams).first<{ count: number }>();
  const total = countResult?.count || 0;
  
  // 查询记录
  const recordsQuery = `
    SELECT * FROM notification_history 
    ${whereClause}
    ORDER BY sent_at DESC
    LIMIT ? OFFSET ?
  `;
  
  // 构建参数数组
  const queryParams = [...whereParams, filter.limit || 10, filter.offset || 0];
  
  const recordsResult = await db.prepare(recordsQuery).bind(...queryParams).all<NotificationHistory>();
  
  return {
    total,
    records: recordsResult.results || []
  };
};

// 获取完整的通知配置（用于前端）
export const getNotificationConfig = async (
  db: D1Database, 
  userId: number
): Promise<NotificationConfig> => {
  // 获取所有渠道
  const channels = await getNotificationChannels(db);
  
  // 获取所有模板
  const templates = await getNotificationTemplates(db);
  
  // 获取全局设置
  const globalSettings = await getGlobalSettings(db, userId);
  
  // 获取特定监控项设置
  const monitorSettings = await getSpecificSettings(db, userId, 'monitor');
  
  // 获取特定客户端设置
  const agentSettings = await getSpecificSettings(db, userId, 'agent');
  
  // 构建通知配置
  const config: NotificationConfig = {
    channels: channels,
    templates: templates,
    settings: {
      monitors: {
        enabled: false,
        onDown: false,
        onRecovery: false,
        channels: []
      },
      agents: {
        enabled: false,
        onOffline: false,
        onRecovery: false,
        onCpuThreshold: false,
        cpuThreshold: 90,
        onMemoryThreshold: false,
        memoryThreshold: 85,
        onDiskThreshold: false,
        diskThreshold: 90,
        channels: []
      },
      specificMonitors: {},
      specificAgents: {}
    }
  };
  
  // 如果找到全局设置，应用到配置对象
  if (globalSettings.monitorSettings) {
    config.settings.monitors = {
      enabled: globalSettings.monitorSettings.enabled,
      onDown: globalSettings.monitorSettings.on_down,
      onRecovery: globalSettings.monitorSettings.on_recovery,
      channels: JSON.parse(globalSettings.monitorSettings.channels)
    };
  }
  
  if (globalSettings.agentSettings) {
    config.settings.agents = {
      enabled: globalSettings.agentSettings.enabled,
      onOffline: globalSettings.agentSettings.on_offline,
      onRecovery: globalSettings.agentSettings.on_recovery,
      onCpuThreshold: globalSettings.agentSettings.on_cpu_threshold,
      cpuThreshold: globalSettings.agentSettings.cpu_threshold,
      onMemoryThreshold: globalSettings.agentSettings.on_memory_threshold,
      memoryThreshold: globalSettings.agentSettings.memory_threshold,
      onDiskThreshold: globalSettings.agentSettings.on_disk_threshold,
      diskThreshold: globalSettings.agentSettings.disk_threshold,
      channels: JSON.parse(globalSettings.agentSettings.channels)
    };
  }
  
  // 处理特定监控项设置
  for (const setting of monitorSettings) {
    const monitorId = setting.target_id!.toString();
    
    config.settings.specificMonitors[monitorId] = {
      enabled: setting.enabled,
      onDown: setting.on_down,
      onRecovery: setting.on_recovery,
      channels: JSON.parse(setting.channels),
      overrideGlobal: setting.override_global
    };
  }
  
  // 处理特定客户端设置
  for (const setting of agentSettings) {
    const agentId = setting.target_id!.toString();
    
    config.settings.specificAgents[agentId] = {
      enabled: setting.enabled,
      onOffline: setting.on_offline,
      onRecovery: setting.on_recovery,
      onCpuThreshold: setting.on_cpu_threshold,
      cpuThreshold: setting.cpu_threshold,
      onMemoryThreshold: setting.on_memory_threshold,
      memoryThreshold: setting.memory_threshold,
      onDiskThreshold: setting.on_disk_threshold,
      diskThreshold: setting.disk_threshold,
      channels: JSON.parse(setting.channels),
      overrideGlobal: setting.override_global
    };
  }
  
  return config;
}; 