/**
 * NotificationService.ts
 * 处理所有与通知相关的业务逻辑
 */

import { D1Database } from '../models/db';
import { 
  NotificationChannel, 
  NotificationTemplate, 
  NotificationSettings,
  NotificationHistory,
  NotificationConfig
} from '../models/notification';
import * as NotificationRepository from '../repositories/notification';

// 通知渠道相关服务
export async function getNotificationChannels(db: D1Database): Promise<NotificationChannel[]> {
  return await NotificationRepository.getNotificationChannels(db);
}

export async function getNotificationChannelById(db: D1Database, id: number): Promise<NotificationChannel | null> {
  return await NotificationRepository.getNotificationChannelById(db, id);
}

export async function createNotificationChannel(
  db: D1Database,
  channel: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: number; message?: string }> {
  try {
    const id = await NotificationRepository.createNotificationChannel(db, channel);
    return { success: true, id };
  } catch (error) {
    console.error('创建通知渠道失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '创建通知渠道失败'
    };
  }
}

export async function updateNotificationChannel(
  db: D1Database,
  id: number,
  channel: Partial<Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await NotificationRepository.updateNotificationChannel(db, id, channel);
    return { 
      success: result, 
      message: result ? '通知渠道更新成功' : '通知渠道不存在或未做任何更改'
    };
  } catch (error) {
    console.error('更新通知渠道失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '更新通知渠道失败'
    };
  }
}

export async function deleteNotificationChannel(
  db: D1Database,
  id: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await NotificationRepository.deleteNotificationChannel(db, id);
    return { 
      success: result, 
      message: result ? '通知渠道删除成功' : '通知渠道不存在'
    };
  } catch (error) {
    console.error('删除通知渠道失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '删除通知渠道失败，可能存在关联数据'
    };
  }
}

// 通知模板相关服务
export async function getNotificationTemplates(db: D1Database): Promise<NotificationTemplate[]> {
  return await NotificationRepository.getNotificationTemplates(db);
}

export async function getNotificationTemplateById(db: D1Database, id: number): Promise<NotificationTemplate | null> {
  return await NotificationRepository.getNotificationTemplateById(db, id);
}

export async function createNotificationTemplate(
  db: D1Database,
  template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: number; message?: string }> {
  try {
    const id = await NotificationRepository.createNotificationTemplate(db, template);
    return { success: true, id };
  } catch (error) {
    console.error('创建通知模板失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '创建通知模板失败'
    };
  }
}

export async function updateNotificationTemplate(
  db: D1Database,
  id: number,
  template: Partial<Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await NotificationRepository.updateNotificationTemplate(db, id, template);
    return { 
      success: result, 
      message: result ? '通知模板更新成功' : '通知模板不存在或未做任何更改'
    };
  } catch (error) {
    console.error('更新通知模板失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '更新通知模板失败'
    };
  }
}

export async function deleteNotificationTemplate(
  db: D1Database,
  id: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await NotificationRepository.deleteNotificationTemplate(db, id);
    return { 
      success: result, 
      message: result ? '通知模板删除成功' : '通知模板不存在'
    };
  } catch (error) {
    console.error('删除通知模板失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '删除通知模板失败'
    };
  }
}

// 通知设置相关服务
export async function getNotificationConfig(db: D1Database, userId: number): Promise<NotificationConfig> {
  return await NotificationRepository.getNotificationConfig(db, userId);
}

export async function createOrUpdateSettings(
  db: D1Database,
  settings: Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: number; message?: string }> {
  try {
    const id = await NotificationRepository.createOrUpdateSettings(db, settings);
    return { success: true, id };
  } catch (error) {
    console.error('保存通知设置失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '保存通知设置失败'
    };
  }
}

// 通知历史相关服务
export async function getNotificationHistory(
  db: D1Database,
  filter: {
    type?: string | undefined;
    targetId?: number | undefined;
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }
): Promise<{ total: number; records: NotificationHistory[] }> {
  return await NotificationRepository.getNotificationHistory(db, filter);
}

// 从utils/notification.ts移植过来的通知发送逻辑
// 变量替换函数 - 替换模板中的变量
function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// 通知渠道配置接口定义
interface TelegramConfig {
  botToken: string;
  chatId: string;
}

// 邮件配置接口
interface ResendConfig {
  apiKey: string;
  from: string;
  to: string;
}

/**
 * 解析通知渠道配置
 */
function parseChannelConfig<T>(channel: NotificationChannel): T {
  try {
    console.log(`[解析配置] 开始解析渠道ID=${channel.id} 名称=${channel.name} 类型=${channel.type}的配置`);
    
    let config: any;
    if (typeof channel.config === 'string') {
      // 如果是字符串，尝试解析为JSON对象
      try {
        config = JSON.parse(channel.config);
        console.log(`[解析配置] 成功解析渠道${channel.id}的JSON配置`);
      } catch (jsonError) {
        console.error(`[解析配置] 解析渠道${channel.id}的JSON配置失败:`, jsonError);
        console.error(`[解析配置] 配置内容: ${channel.config.substring(0, 100)}${channel.config.length > 100 ? '...' : ''}`);
        return {} as T;
      }
    } else if (typeof channel.config === 'object') {
      // 如果已经是对象，直接使用
      config = channel.config;
      console.log(`[解析配置] 渠道${channel.id}配置已经是对象格式`);
    } else {
      console.error(`[解析配置] 无效的配置格式: ${typeof channel.config}`);
      return {} as T;
    }
    
    console.log(`[解析配置] 渠道${channel.id}配置解析完成`);
    return config as T;
  } catch (e) {
    console.error('解析渠道配置失败:', e);
    return {} as T;
  }
}

/**
 * 通过Resend API发送邮件通知
 */
async function sendResendNotification(
  channel: NotificationChannel,
  subject: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 解析渠道配置
    const config = parseChannelConfig<ResendConfig>(channel);
    
    // 检查必要参数
    if (!config.apiKey) {
      return { success: false, error: 'Resend API密钥不能为空' };
    }
    
    if (!config.from) {
      return { success: false, error: 'Resend发件人不能为空' };
    }
    
    if (!config.to) {
      return { success: false, error: 'Resend收件人不能为空' };
    }
    
    // 提取配置
    const apiKey = config.apiKey;
    const from = config.from;
    const to = config.to.split(',').map(email => email.trim());
    
    // 记录发送的内容
    console.log(`[Resend通知] 准备发送邮件通知`);
    console.log(`[Resend通知] 发送者: ${from}`);
    console.log(`[Resend通知] 接收者: ${to.join(', ')}`);
    console.log(`[Resend通知] 主题: ${subject}`);
    console.log(`[Resend通知] 内容: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    
    // 构建请求数据
    const requestData = {
      from: from,
      to: to,
      subject: subject,
      html: content.replace(/\n/g, '<br>') // 将换行符转换为HTML换行
    };
    
    // 发送API请求
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });
    
    // 解析响应
    const responseData = await response.json();
    
    if (response.ok) {
      console.log(`[Resend通知] 发送成功: ${JSON.stringify(responseData)}`);
      return { success: true };
    } else {
      console.error(`[Resend通知] 发送失败: ${JSON.stringify(responseData)}`);
      return { 
        success: false, 
        error: responseData.message || `发送失败，HTTP状态码: ${response.status}` 
      };
    }
  } catch (error) {
    console.error('发送Resend通知失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * 发送Telegram通知
 */
async function sendTelegramNotification(
  channel: NotificationChannel,
  subject: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 解析配置
    const config = parseChannelConfig<TelegramConfig>(channel);
    
    // 获取Bot令牌和聊天ID
    const botToken = config.botToken;
    const chatId = config.chatId;
    
    // 组合主题和内容
    let message = `${subject}\n\n${content}`;
    
    // 记录发送的内容
    console.log('[Telegram通知] 准备发送通知');
    console.log(`[Telegram通知] 内容: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    // 处理转义的换行符，确保它们会被正确显示为实际的换行
    message = message.replace(/\\n/g, '\n');
    
    // 使用POST请求，避免URL中使用chat_id出现的问题
    const apiEndpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // 准备请求体
    const requestBody = {
      chat_id: chatId,
      text: message
    };
    
    console.log('[Telegram通知] 开始发送POST请求...');
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseData = await response.json();
    
    if (responseData.ok === true) {
      console.log('[Telegram通知] 发送成功:', responseData.result?.message_id);
      return { success: true };
    } else {
      console.error('[Telegram通知] 发送失败:', responseData);
      return { 
        success: false, 
        error: responseData.description || '发送失败' 
      };
    }
  } catch (error) {
    console.error('发送Telegram通知失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * 验证Telegram令牌是否有效
 */
export async function validateTelegramToken(botToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('验证Telegram令牌失败:', error);
    return false;
  }
}

/**
 * 根据渠道类型发送通知
 */
async function sendNotificationByChannel(
  channel: NotificationChannel,
  subject: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  if (!channel.enabled) {
    return { success: false, error: '通知渠道已禁用' };
  }

  if (channel.type === 'resend') {
    return await sendResendNotification(channel, subject, content);
  } else if (channel.type === 'telegram') {
    return await sendTelegramNotification(channel, subject, content);
  } else {
    return { success: false, error: `不支持的通知渠道类型: ${channel.type}` };
  }
}

/**
 * 发送通知
 */
export async function sendNotification(
  db: D1Database,
  type: 'monitor' | 'agent' | 'system',
  targetId: number | null,
  variables: Record<string, string>,
  channelIds: number[]
): Promise<{ success: boolean; results: Array<{ channelId: number; success: boolean; error?: string }> }> {
  try {
    if (!channelIds || channelIds.length === 0) {
      console.log('没有指定通知渠道，跳过发送');
      return { success: false, results: [] };
    }
    
    console.log(`准备发送${type}通知，目标ID=${targetId}，渠道数量=${channelIds.length}`);
    
    // 获取默认的通知模板
    const templates = await NotificationRepository.getNotificationTemplates(db);
    const defaultTemplate = templates.find(t => t.is_default && t.type === type);
    
    if (!defaultTemplate) {
      console.error(`找不到类型为${type}的默认通知模板`);
      return { success: false, results: [] };
    }
    
    // 替换变量
    const subject = replaceVariables(defaultTemplate.subject, variables);
    const content = replaceVariables(defaultTemplate.content, variables);
    
    // 获取所有通知渠道
    const channels = await Promise.all(
      channelIds.map(id => NotificationRepository.getNotificationChannelById(db, id))
    );
    
    // 过滤掉不存在的渠道
    const validChannels = channels.filter((ch): ch is NotificationChannel => ch !== null);
    
    if (validChannels.length === 0) {
      console.log('没有找到有效的通知渠道');
      return { success: false, results: [] };
    }
    
    // 发送通知并记录结果
    const results = await Promise.all(
      validChannels.map(async (channel) => {
        try {
          // 发送通知
          const sendResult = await sendNotificationByChannel(channel, subject, content);
          
          // 记录通知历史
          await NotificationRepository.createNotificationHistory(db, {
            type,
            target_id: targetId,
            channel_id: channel.id,
            template_id: defaultTemplate.id,
            status: sendResult.success ? 'success' : 'failed',
            content: JSON.stringify({
              subject,
              content,
              variables
            }),
            error: sendResult.error || null
          });
          
          return {
            channelId: channel.id,
            success: sendResult.success,
            error: sendResult.error
          };
        } catch (error) {
          console.error(`通过渠道${channel.id}发送通知失败:`, error);
          
          // 记录错误
          await NotificationRepository.createNotificationHistory(db, {
            type,
            target_id: targetId,
            channel_id: channel.id,
            template_id: defaultTemplate.id,
            status: 'failed',
            content: JSON.stringify({
              subject,
              content,
              variables
            }),
            error: error instanceof Error ? error.message : String(error)
          });
          
          return {
            channelId: channel.id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
    
    // 检查是否至少有一个通知发送成功
    const anySuccess = results.some(r => r.success);
    
    return {
      success: anySuccess,
      results
    };
  } catch (error) {
    console.error('发送通知失败:', error);
    return {
      success: false,
      results: [{
        channelId: -1,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }]
    };
  }
}

/**
 * 判断是否应该发送通知
 */
export async function shouldSendNotification(
  db: D1Database,
  type: 'monitor' | 'agent',
  id: number,
  prevStatus: string,
  currentStatus: string
): Promise<{ shouldSend: boolean; channels: number[] }> {
  try {
    if (!id) {
      console.error('无效的ID');
      return { shouldSend: false, channels: [] };
    }
    
    // 获取此对象的特定设置
    const specificSettings = await NotificationRepository.getSpecificSettings(db, 0, type, id);
    
    let targetSettings = null;
    
    // 检查是否有覆盖全局设置的特定设置
    if (specificSettings && specificSettings.length > 0) {
      const overrideSettings = specificSettings.find(s => s.override_global);
      if (overrideSettings) {
        console.log(`使用覆盖全局的特定${type}设置，ID=${id}`);
        targetSettings = overrideSettings;
      }
    }
    
    // 如果没有特定设置，使用全局设置
    if (!targetSettings) {
      const globalSettings = await NotificationRepository.getGlobalSettings(db, 0);
      
      if (type === 'monitor' && globalSettings.monitorSettings) {
        console.log('使用全局监控设置');
        targetSettings = globalSettings.monitorSettings;
      } else if (type === 'agent' && globalSettings.agentSettings) {
        console.log('使用全局代理设置');
        targetSettings = globalSettings.agentSettings;
      }
    }
    
    // 如果没有设置，不发送通知
    if (!targetSettings) {
      console.log(`没有找到${type}的通知设置`);
      return { shouldSend: false, channels: [] };
    }
    
    // 如果设置被禁用，不发送通知
    if (!targetSettings.enabled) {
      console.log(`${type}的通知设置已禁用`);
      return { shouldSend: false, channels: [] };
    }
    
    // 解析渠道列表
    let channels: number[] = [];
    try {
      channels = JSON.parse(targetSettings.channels || '[]');
    } catch (e) {
      console.error('解析通知渠道列表失败:', e);
    }
    
    if (channels.length === 0) {
      console.log('没有配置通知渠道');
      return { shouldSend: false, channels: [] };
    }
    
    let shouldSend = false;
    
    // 根据类型和状态变化判断是否应该发送通知
    if (type === 'monitor') {
      // 从正常到故障的变化，且配置了on_down
      if (prevStatus !== 'down' && currentStatus === 'down' && targetSettings.on_down) {
        console.log('监控状态从正常变为故障，满足发送通知条件');
        shouldSend = true;
      }
      // 从故障到正常的变化，且配置了on_recovery
      else if (prevStatus === 'down' && currentStatus === 'up' && targetSettings.on_recovery) {
        console.log('监控状态从故障恢复正常，满足发送通知条件');
        shouldSend = true;
      }
    } else if (type === 'agent') {
      // 从在线到离线的变化，且配置了on_offline
      if (prevStatus !== 'offline' && currentStatus === 'offline' && targetSettings.on_offline) {
        console.log('代理状态从在线变为离线，满足发送通知条件');
        shouldSend = true;
      }
      // 从离线到在线的变化，且配置了on_recovery
      else if (prevStatus === 'offline' && currentStatus === 'online' && targetSettings.on_recovery) {
        console.log('代理状态从离线恢复在线，满足发送通知条件');
        shouldSend = true;
      }
      // 其他代理相关的阈值通知逻辑...
    }
    
    return { shouldSend, channels };
  } catch (error) {
    console.error('判断是否应发送通知失败:', error);
    return { shouldSend: false, channels: [] };
  }
}

/**
 * 发送测试邮件
 */
export async function sendTestEmail(
  channel: {
    id: string | number;
    name: string;
    type: string;
    config: any;
    enabled: boolean;
  },
  subject: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const channelObj: NotificationChannel = {
      id: typeof channel.id === 'string' ? parseInt(channel.id) : channel.id,
      name: channel.name,
      type: channel.type,
      config: typeof channel.config === 'string' ? channel.config : JSON.stringify(channel.config),
      enabled: channel.enabled,
      created_by: 0,
      created_at: '',
      updated_at: ''
    };
    
    return await sendNotificationByChannel(channelObj, subject, content);
  } catch (error) {
    console.error('发送测试邮件失败:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
} 