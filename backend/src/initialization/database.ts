// 初始化数据库脚本
// 用于在 Cloudflare Workers 环境中创建数据库表和初始数据

import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Bindings } from '../models/db';

const initDb = new Hono<{ Bindings: Bindings }>();

// 创建数据库表结构
export async function createTables(env: Bindings): Promise<void> {
  console.log('创建用户表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, email TEXT, role TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");

  console.log('创建监控表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS monitors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL, method TEXT NOT NULL, interval INTEGER NOT NULL, timeout INTEGER NOT NULL, expected_status INTEGER NOT NULL, headers TEXT NOT NULL, body TEXT, created_by INTEGER NOT NULL, active BOOLEAN NOT NULL, status TEXT DEFAULT 'pending', uptime REAL DEFAULT 100.0, response_time INTEGER DEFAULT 0, last_checked TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (created_by) REFERENCES users(id))");

  console.log('创建监控历史记录表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS monitor_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, monitor_id INTEGER NOT NULL, status TEXT NOT NULL, response_time INTEGER, status_code INTEGER, error TEXT, checked_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (monitor_id) REFERENCES monitors(id))");

  console.log('创建监控状态历史表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS monitor_status_history (id INTEGER PRIMARY KEY AUTOINCREMENT, monitor_id INTEGER NOT NULL, status TEXT NOT NULL, timestamp TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (monitor_id) REFERENCES monitors(id))");

  console.log('创建客户端表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS agents (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, token TEXT NOT NULL UNIQUE, created_by INTEGER NOT NULL, status TEXT DEFAULT 'inactive', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, hostname TEXT, ip_addresses TEXT, os TEXT, version TEXT, cpu_usage REAL, memory_total INTEGER, memory_used INTEGER, disk_total INTEGER, disk_used INTEGER, network_rx INTEGER, network_tx INTEGER, FOREIGN KEY (created_by) REFERENCES users(id))");

  console.log('创建状态页配置表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS status_page_config (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL DEFAULT '系统状态', description TEXT DEFAULT '系统当前运行状态', logo_url TEXT DEFAULT '', custom_css TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))");

  console.log('创建状态页监控项关联表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS status_page_monitors (config_id INTEGER NOT NULL, monitor_id INTEGER NOT NULL, PRIMARY KEY (config_id, monitor_id), FOREIGN KEY (config_id) REFERENCES status_page_config(id) ON DELETE CASCADE, FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE)");

  console.log('创建状态页客户端关联表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS status_page_agents (config_id INTEGER NOT NULL, agent_id INTEGER NOT NULL, PRIMARY KEY (config_id, agent_id), FOREIGN KEY (config_id) REFERENCES status_page_config(id) ON DELETE CASCADE, FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE)");
  
  // 添加通知系统相关表
  console.log('创建通知渠道表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS notification_channels (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, config TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT 1, created_by INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (created_by) REFERENCES users(id))");
  
  console.log('创建通知模板表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS notification_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, subject TEXT NOT NULL, content TEXT NOT NULL, is_default BOOLEAN NOT NULL DEFAULT 0, created_by INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (created_by) REFERENCES users(id))");
  
  console.log('创建通知设置表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS notification_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, target_type TEXT NOT NULL DEFAULT 'global', target_id INTEGER DEFAULT NULL, enabled BOOLEAN NOT NULL DEFAULT 1, on_down BOOLEAN NOT NULL DEFAULT 1, on_recovery BOOLEAN NOT NULL DEFAULT 1, on_offline BOOLEAN NOT NULL DEFAULT 1, on_cpu_threshold BOOLEAN NOT NULL DEFAULT 0, cpu_threshold INTEGER NOT NULL DEFAULT 90, on_memory_threshold BOOLEAN NOT NULL DEFAULT 0, memory_threshold INTEGER NOT NULL DEFAULT 85, on_disk_threshold BOOLEAN NOT NULL DEFAULT 0, disk_threshold INTEGER NOT NULL DEFAULT 90, channels TEXT DEFAULT '[]', override_global BOOLEAN NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), UNIQUE(user_id, target_type, target_id))");
  
  console.log('创建通知历史记录表...');
  await env.DB.exec("CREATE TABLE IF NOT EXISTS notification_history (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, target_id INTEGER, channel_id INTEGER NOT NULL, template_id INTEGER NOT NULL, status TEXT NOT NULL, content TEXT NOT NULL, error TEXT, sent_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (channel_id) REFERENCES notification_channels(id), FOREIGN KEY (template_id) REFERENCES notification_templates(id))");
}

// 创建管理员用户
export async function createAdminUser(env: Bindings): Promise<void> {
  console.log('检查管理员用户...');
  const adminUser = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind('admin').first();

  // 如果不存在管理员用户，则创建一个
  if (!adminUser) {
    console.log('创建管理员用户...');
    // 密码: admin123
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO users (username, password, email, role, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      'admin',
      hashedPassword,
      'admin@mdzz.uk',
      'admin',
      now,
      now
    ).run();
  }
}

// 添加示例监控数据
export async function addSampleMonitors(env: Bindings): Promise<void> {
  // 检查是否已有示例监控数据
  const existingMonitors = await env.DB.prepare('SELECT COUNT(*) as count FROM monitors').first<{count: number}>();
  
  if (existingMonitors.count === 0) {
    console.log('添加示例监控...');
    const now = new Date().toISOString();
    const userId = 1; // 管理员用户ID
    
    await env.DB.prepare(
      `INSERT INTO monitors (name, url, method, interval, timeout, expected_status, headers, body, created_by, active, status, uptime, response_time, last_checked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      '百度',
      'https://www.baidu.com',
      'GET',
      60,
      30,
      200,
      '{}',
      '',
      userId,
      true,
      'up',
      99.98,
      120,
      now,
      now,
      now
    ).run();
    
    await env.DB.prepare(
      `INSERT INTO monitors (name, url, method, interval, timeout, expected_status, headers, body, created_by, active, status, uptime, response_time, last_checked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      '哔哩哔哩',
      'https://www.bilibili.com',
      'GET',
      30,
      30,
      200,
      '{}',
      '',
      userId,
      true,
      'up',
      99.95,
      150,
      now,
      now,
      now
    ).run();
    
    await env.DB.prepare(
      `INSERT INTO monitors (name, url, method, interval, timeout, expected_status, headers, body, created_by, active, status, uptime, response_time, last_checked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      '油管',
      'https://www.youtube.com',
      'GET',
      60,
      30,
      200,
      '{}',
      '',
      userId,
      true,
      'up',
      99.9,
      180,
      now,
      now,
      now
    ).run();
  }
}

// 添加示例客户端数据
export async function addSampleAgents(env: Bindings): Promise<void> {
  // 检查是否已有示例客户端数据
  const existingAgents = await env.DB.prepare('SELECT COUNT(*) as count FROM agents').first<{count: number}>();
  
  if (existingAgents.count === 0) {
    console.log('添加示例客户端...');
    const now = new Date().toISOString();
    const userId = 1; // 管理员用户ID
    
    // 主服务器
    await env.DB.prepare(
      `INSERT INTO agents (name, token, created_by, status, created_at, updated_at, cpu_usage, memory_total, memory_used, disk_total, disk_used, network_rx, network_tx, hostname, ip_addresses, os, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      '主服务器',
      'primary-server-token-123456',
      userId,
      'active',
      now,
      now,
      25.5,  // CPU使用率
      16384, // 内存总量 (MB)
      8192,  // 内存使用量 (MB)
      500000, // 磁盘总量 (MB)
      250000, // 磁盘使用量 (MB)
      1024,   // 网络接收流量 (KB)
      512,    // 网络发送流量 (KB)
      'primary-server', // 主机名
      '192.168.1.11',   // IP地址列表
      'Linux Ubuntu 20.04', // 操作系统
      '1.0.0'           // 版本
    ).run();
    
    // 备份服务器
    await env.DB.prepare(
      `INSERT INTO agents (name, token, created_by, status, created_at, updated_at, cpu_usage, memory_total, memory_used, disk_total, disk_used, network_rx, network_tx, hostname, ip_addresses, os, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      '备份服务器',
      'backup-server-token-789012',
      userId,
      'active',
      now,
      now,
      15.0,  // CPU使用率
      8192,  // 内存总量 (MB)
      4096,  // 内存使用量 (MB)
      1000000, // 磁盘总量 (MB)
      300000,  // 磁盘使用量 (MB)
      512,     // 网络接收流量 (KB)
      256,     // 网络发送流量 (KB)
      'backup-server', // 主机名
      '192.168.1.21',  // IP地址列表
      'Linux Debian 11', // 操作系统
      '1.0.0'           // 版本
    ).run();
    
    // 应用服务器
    await env.DB.prepare(
      `INSERT INTO agents (name, token, created_by, status, created_at, updated_at, cpu_usage, memory_total, memory_used, disk_total, disk_used, network_rx, network_tx, hostname, ip_addresses, os, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      '应用服务器',
      'app-server-token-345678',
      userId,
      'active',
      now,
      now,
      45.0,  // CPU使用率
      32768, // 内存总量 (MB)
      24576, // 内存使用量 (MB)
      250000, // 磁盘总量 (MB)
      150000, // 磁盘使用量 (MB)
      2048,   // 网络接收流量 (KB)
      1024,   // 网络发送流量 (KB)
      'app-server',    // 主机名
      '192.168.1.31',  // IP地址列表
      'Linux CentOS 7', // 操作系统
      '1.0.0'           // 版本
    ).run();
  }
}

// 添加通知模板初始化函数
export async function createNotificationTemplates(env: Bindings): Promise<void> {
  // 检查是否已有通知模板
  const existingTemplates = await env.DB.prepare('SELECT COUNT(*) as count FROM notification_templates').first<{count: number}>();
  
  if (existingTemplates.count === 0) {
    console.log('添加默认通知模板...');
    const now = new Date().toISOString();
    const userId = 1; // 管理员用户ID
    
    // 添加 Monitor 监控模板 (ID: 1)
    await env.DB.prepare(
      `INSERT INTO notification_templates (id, name, type, subject, content, is_default, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      1,
      'Monitor监控模板',
      'default',
      '【${status}】${name} 监控状态变更',
      '🔔 网站监控状态变更通知\n\n📊 服务: ${name}\n🔄 状态: ${status} (之前: ${previous_status})\n🕒 时间: ${time}\n\n🔗 地址: ${url}\n⏱️ 响应时间: ${response_time}\n📝 实际状态码: ${status_code}\n🎯 期望状态码: ${expected_status_code}\n\n❗ 错误信息: ${error}',
      1, // is_default=1
      userId,
      now,
      now
    ).run();
    
    // 添加 Agent 客户端监控模板 (ID: 2)
    await env.DB.prepare(
      `INSERT INTO notification_templates (id, name, type, subject, content, is_default, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      2,
      'Agent监控模板',
      'default',
      '【${status}】${name} 客户端状态变更',
      '🔔 客户端状态变更通知\n\n📊 主机: ${name}\n🔄 状态: ${status} (之前: ${previous_status})\n🕒 时间: ${time}\n\n🖥️ 主机信息:\n  主机名: ${hostname}\n  IP地址: ${ip_addresses}\n  操作系统: ${os}\n\n❗ 错误信息: ${error}',
      1, // is_default=1
      userId,
      now,
      now
    ).run();
  }
}

// 添加通知渠道和设置初始化函数
export async function createNotificationChannelsAndSettings(env: Bindings): Promise<void> {
  // 检查是否已有通知渠道
  const existingChannels = await env.DB.prepare('SELECT COUNT(*) as count FROM notification_channels').first<{count: number}>();
  
  if (existingChannels.count === 0) {
    console.log('添加默认通知渠道...');
    const now = new Date().toISOString();
    const userId = 1; // 管理员用户ID
    
    // 添加Telegram通知渠道 (ID: 1)
    await env.DB.prepare(
      `INSERT INTO notification_channels (id, name, type, config, enabled, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      1,
      '默认Telegram通知渠道(https://t.me/xugou_group)',
      'telegram',
      '{"botToken": "8163201319:AAGyY7FtdaRb6o8NCVXSbBUb6ofDK45cNJU", "chatId": "-1002608818360"}',
      1, // enabled
      userId,
      now,
      now
    ).run();
  }
  
  // 检查是否已有通知设置
  const existingSettings = await env.DB.prepare('SELECT COUNT(*) as count FROM notification_settings').first<{count: number}>();
  
  if (existingSettings.count === 0) {
    console.log('添加默认通知设置...');
    const now = new Date().toISOString();
    const userId = 1; // 管理员用户ID
    
    // 添加全局监控通知设置 (ID: 1)
    await env.DB.prepare(
      `INSERT INTO notification_settings (id, user_id, target_type, enabled, on_down, on_recovery, channels, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      1,
      userId,
      'global-monitor',
      1, // enabled
      1, // on_down
      1, // on_recovery
      '[1]', // channels (只有Telegram)
      now,
      now
    ).run();
    
    // 添加全局客户端通知设置 (ID: 2)
    await env.DB.prepare(
      `INSERT INTO notification_settings (id, user_id, target_type, enabled, on_offline, on_recovery, on_cpu_threshold, cpu_threshold, on_memory_threshold, memory_threshold, on_disk_threshold, disk_threshold, channels, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      2,
      userId,
      'global-agent',
      1, // enabled
      1, // on_offline
      1, // on_recovery
      1, // on_cpu_threshold
      80, // cpu_threshold
      1, // on_memory_threshold
      80, // memory_threshold
      1, // on_disk_threshold
      90, // disk_threshold
      '[1]', // channels (只有Telegram)
      now,
      now
    ).run();
    
    // 添加全局系统通知设置 (ID: 3)
    await env.DB.prepare(
      `INSERT INTO notification_settings (id, user_id, target_type, enabled, channels, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      3,
      userId,
      'global-system',
      1, // enabled
      '[1]', // channels (只有Telegram)
      now,
      now
    ).run();
  }
}

// 初始化数据库，包括创建表和填充示例数据
export async function initializeDatabase(env: Bindings): Promise<{ success: boolean, message: string }> {
  try {
    console.log('开始初始化数据库...');
    
    // 创建表结构
    await createTables(env);
    
    // 创建管理员用户
    await createAdminUser(env);
    
    // 添加示例数据
    await addSampleMonitors(env);
    await addSampleAgents(env);
    
    // 添加默认通知模板
    await createNotificationTemplates(env);
    
    // 添加默认通知渠道和设置
    await createNotificationChannelsAndSettings(env);
    
    // 创建默认状态页配置和关联数据
    await createDefaultStatusPage(env);
    
    return {
      success: true,
      message: '数据库初始化成功',
    };
  } catch (error) {
    console.error('数据库初始化错误:', error);
    return {
      success: false,
      message: `数据库初始化失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// 创建默认状态页配置
export async function createDefaultStatusPage(env: Bindings): Promise<void> {
  // 检查是否已有状态页配置
  const existingConfig = await env.DB.prepare('SELECT COUNT(*) as count FROM status_page_config').first<{count: number}>();
  
  if (existingConfig && existingConfig.count === 0) {
    console.log('创建默认状态页配置...');
    const now = new Date().toISOString();
    const userId = 1; // 管理员用户ID
    
    // 创建配置
    const result = await env.DB.prepare(
      `INSERT INTO status_page_config (user_id, title, description, logo_url, custom_css, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      userId,
      '系统状态',
      '实时监控系统运行状态',
      '',
      '',
      now,
      now
    ).run();
    
    // 获取配置ID
    const configId = await env.DB.prepare('SELECT last_insert_rowid() as id').first<{id: number}>();
    
    if (configId && configId.id) {
      // 关联所有监控项
      const monitors = await env.DB.prepare('SELECT id FROM monitors').all<{id: number}>();
      
      if (monitors.results) {
        for (const monitor of monitors.results) {
          await env.DB.prepare(
            'INSERT INTO status_page_monitors (config_id, monitor_id) VALUES (?, ?)'
          ).bind(configId.id, monitor.id).run();
        }
      }
      
      // 关联所有客户端
      const agents = await env.DB.prepare('SELECT id FROM agents').all<{id: number}>();
      
      if (agents.results) {
        for (const agent of agents.results) {
          await env.DB.prepare(
            'INSERT INTO status_page_agents (config_id, agent_id) VALUES (?, ?)'
          ).bind(configId.id, agent.id).run();
        }
      }
    }
  }
}

export default initDb; 