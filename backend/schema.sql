DROP TABLE IF EXISTS notification_history;
DROP TABLE IF EXISTS notification_settings;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS notification_channels;
DROP TABLE IF EXISTS status_page_agents;
DROP TABLE IF EXISTS status_page_monitors;
DROP TABLE IF EXISTS status_page_config;
DROP TABLE IF EXISTS monitor_status_history;
DROP TABLE IF EXISTS monitor_checks;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS monitors;
DROP TABLE IF EXISTS users;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 监控表
CREATE TABLE IF NOT EXISTS monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  interval INTEGER NOT NULL DEFAULT 60,
  timeout INTEGER NOT NULL DEFAULT 30,
  expected_status INTEGER NOT NULL DEFAULT 200,
  headers TEXT DEFAULT '{}',
  body TEXT DEFAULT '',
  created_by INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'pending',
  uptime REAL DEFAULT 100.0,
  response_time INTEGER DEFAULT 0,
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 监控历史记录表
CREATE TABLE IF NOT EXISTS monitor_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  error TEXT,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

-- 监控状态历史表（用于UI状态条展示）
CREATE TABLE IF NOT EXISTS monitor_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

-- 客户端表
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL,
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hostname TEXT,
  ip_addresses TEXT, -- 存储多个IP地址的JSON字符串
  os TEXT,
  version TEXT,
  cpu_usage REAL,
  memory_total INTEGER,
  memory_used INTEGER,
  disk_total INTEGER,
  disk_used INTEGER,
  network_rx INTEGER,
  network_tx INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 状态页配置表
CREATE TABLE IF NOT EXISTS status_page_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '系统状态',
  description TEXT DEFAULT '系统当前运行状态',
  logo_url TEXT DEFAULT '',
  custom_css TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 状态页监控项关联表
CREATE TABLE IF NOT EXISTS status_page_monitors (
  config_id INTEGER NOT NULL,
  monitor_id INTEGER NOT NULL,
  PRIMARY KEY (config_id, monitor_id),
  FOREIGN KEY (config_id) REFERENCES status_page_config(id) ON DELETE CASCADE,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

-- 状态页客户端关联表
CREATE TABLE IF NOT EXISTS status_page_agents (
  config_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  PRIMARY KEY (config_id, agent_id),
  FOREIGN KEY (config_id) REFERENCES status_page_config(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- 初始管理员用户 (密码: admin123)
INSERT OR IGNORE INTO users (id, username, password, role) 
VALUES (1, 'admin', '$2a$10$cy8EjTIFgMXQfKrMV1lw6.Ltx6P/VVKCGP7PME3XbZv3lmDmTUwEK', 'admin');

-- 以下是通知系统表结构 --

-- 通知渠道表
CREATE TABLE IF NOT EXISTS notification_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- email, telegram
  config TEXT NOT NULL, -- JSON格式存储配置，如邮箱地址、API令牌等
  enabled BOOLEAN NOT NULL DEFAULT 1,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- default, custom
  subject TEXT NOT NULL, -- 邮件主题模板
  content TEXT NOT NULL, -- 消息内容模板
  is_default BOOLEAN NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 统一通知设置表
CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'global', -- global, monitor, agent
  target_id INTEGER DEFAULT NULL, -- 当target_type不是global时，存储monitor_id或agent_id
  
  enabled BOOLEAN NOT NULL DEFAULT 1,
  on_down BOOLEAN NOT NULL DEFAULT 1, -- 适用于monitor
  on_recovery BOOLEAN NOT NULL DEFAULT 1, -- 适用于monitor和agent
  
  on_offline BOOLEAN NOT NULL DEFAULT 1, -- 适用于agent
  on_cpu_threshold BOOLEAN NOT NULL DEFAULT 0, -- 适用于agent
  cpu_threshold INTEGER NOT NULL DEFAULT 90, -- 适用于agent
  on_memory_threshold BOOLEAN NOT NULL DEFAULT 0, -- 适用于agent
  memory_threshold INTEGER NOT NULL DEFAULT 85, -- 适用于agent
  on_disk_threshold BOOLEAN NOT NULL DEFAULT 0, -- 适用于agent
  disk_threshold INTEGER NOT NULL DEFAULT 90, -- 适用于agent
  
  channels TEXT DEFAULT '[]', -- JSON数组，存储channel IDs
  override_global BOOLEAN NOT NULL DEFAULT 0, -- 当target_type不是global时有效
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, target_type, target_id)
);

-- 通知历史记录表
CREATE TABLE IF NOT EXISTS notification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- monitor, agent, system
  target_id INTEGER, -- monitor_id 或 agent_id，系统通知为null
  channel_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  status TEXT NOT NULL, -- success, failed, pending
  content TEXT NOT NULL,
  error TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES notification_channels(id),
  FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- 初始通知模板
INSERT OR IGNORE INTO notification_templates (id, name, type, subject, content, is_default, created_by) 
VALUES (
  1, 
  'Monitor监控模板', 
  'default', 
  '【${status}】${name} 监控状态变更',
  '🔔 网站监控状态变更通知

📊 服务: ${name}
🔄 状态: ${status} (之前: ${previous_status})
🕒 时间: ${time}

🔗 地址: ${url}
⏱️ 响应时间: ${response_time}
📝 实际状态码: ${status_code}
🎯 期望状态码: ${expected_status_code}

❗ 错误信息: ${error}',
  1,
  1
);

-- Agent客户端监控模板
INSERT OR IGNORE INTO notification_templates (id, name, type, subject, content, is_default, created_by) 
VALUES (
  2, 
  'Agent监控模板', 
  'default', 
  '【${status}】${name} 客户端状态变更', 
  '🔔 客户端状态变更通知

📊 主机: ${name}
🔄 状态: ${status} (之前: ${previous_status})
🕒 时间: ${time}

🖥️ 主机信息:
  主机名: ${hostname}
  IP地址: ${ip_addresses}
  操作系统: ${os}

❗ 错误信息: ${error}',
  1,
  1
);

-- 初始通知渠道
INSERT OR IGNORE INTO notification_channels (id, name, type, config, enabled, created_by)
VALUES (
  1,
  '默认Telegram通知渠道(https://t.me/xugou_group)',
  'telegram',
  '{"botToken": "8163201319:AAGyY7FtdaRb6o8NCVXSbBUb6ofDK45cNJU", "chatId": "-1002608818360"}',
  1,
  1
);

-- 初始全局监控通知设置
INSERT OR IGNORE INTO notification_settings (
  id, user_id, target_type, 
  enabled, on_down, on_recovery,
  channels
)
VALUES (
  1, 1, 'global-monitor',
  1, 1, 1,
  '[1]'
);

-- 初始全局客户端通知设置
INSERT OR IGNORE INTO notification_settings (
  id, user_id, target_type,
  enabled, on_offline, on_recovery,
  on_cpu_threshold, cpu_threshold,
  on_memory_threshold, memory_threshold,
  on_disk_threshold, disk_threshold,
  channels
)
VALUES (
  2, 1, 'global-agent',
  1, 1, 1,
  1, 80,
  1, 80,
  1, 90,
  '[1]'
);

-- 初始全局系统通知设置
INSERT OR IGNORE INTO notification_settings (
  id, user_id, target_type,
  enabled, channels
)
VALUES (
  3, 1, 'global-system',
  1, '[1]'
); 