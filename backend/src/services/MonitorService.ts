import { Bindings } from '../models/db';
import { Monitor, MonitorStatusHistory, MonitorCheck } from '../models/monitor';
import * as MonitorRepository from '../repositories/monitor';
import * as NotificationService from './NotificationService';

/**
 * 执行系统维护任务 - 清理旧记录
 */
export async function cleanupOldRecords(db: Bindings['DB']) {
  return await MonitorRepository.cleanupOldRecords(db);
}

/**
 * 获取所有需要检查的监控
 */
export async function getMonitorsToCheck(db: Bindings['DB']) {
  return await MonitorRepository.getMonitorsToCheck(db);
}

/**
 * 检查单个监控的状态
 * @param db 数据库连接
 * @param monitor 监控配置
 * @returns 监控检查结果
 */
export async function checkMonitor(db: Bindings['DB'], monitor: Monitor) {
  try {
    console.log(`开始检查监控项: ${monitor.name} (${monitor.url})`);
    
    // 记录监控之前的状态
    const previousStatus = monitor.status;
    
    const startTime = Date.now();
    let response;
    let error = null;
    
    // 解析 headers
    let customHeaders = {};
    try {
      customHeaders = JSON.parse(monitor.headers || '{}');
    } catch (e) {
      console.warn(`监控 ${monitor.id} 的 headers 解析失败: ${e}`);
    }
    
    try {
      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (monitor.timeout || 30) * 1000);
      
      // 发送请求
      response = await fetch(monitor.url, {
        method: monitor.method || 'GET',
        headers: customHeaders,
        body: monitor.method !== 'GET' && monitor.method !== 'HEAD' ? monitor.body || undefined : undefined,
        signal: controller.signal
      });
      
      // 清除超时
      clearTimeout(timeoutId);
      
    } catch (e) {
      // 处理请求错误
      error = e instanceof Error ? e.message : String(e);
      console.error(`监控 ${monitor.name} (${monitor.url}) 请求失败: ${error}`);
      
      // 记录错误状态
      await MonitorRepository.recordMonitorError(db, monitor.id, error);
      
      return {
        success: false,
        status: 'down',
        previous_status: previousStatus,
        error,
        responseTime: Date.now() - startTime,
        statusCode: null
      };
    }
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    // 检查状态码是否符合预期
    let isExpectedStatus = false;
    const expectedStatus = monitor.expected_status || 200;
    
    // 处理范围状态码：如果预期状态码为个位数（1-5），则视为范围检查
    if (expectedStatus >= 1 && expectedStatus <= 5) {
      // 例如，当预期状态码为2时，匹配所有2xx状态码
      const statusCodeFirstDigit = Math.floor(response.status / 100);
      isExpectedStatus = statusCodeFirstDigit === expectedStatus;
    } else {
      // 精确匹配状态码
      isExpectedStatus = response.status === expectedStatus;
    }
    
    const status = isExpectedStatus ? 'up' : 'down';
    
    // 记录状态历史
    await MonitorRepository.insertMonitorStatusHistory(db, monitor.id, status);
    
    // 记录检查详情
    await MonitorRepository.insertMonitorCheck(
      db, 
      monitor.id, 
      status, 
      responseTime, 
      response.status, 
      isExpectedStatus ? null : `状态码不符合预期: ${response.status}, 预期: ${getExpectedStatusDisplay(expectedStatus)}`
    );
    
    // 更新监控状态
    await MonitorRepository.updateMonitorStatus(db, monitor.id, status, responseTime);
    
    return {
      success: true,
      status,
      previous_status: previousStatus,
      responseTime,
      statusCode: response.status,
      error: isExpectedStatus ? null : `状态码不符合预期: ${response.status}, 预期: ${getExpectedStatusDisplay(expectedStatus)}`
    };
  } catch (error) {
    console.error(`检查监控出错 (${monitor.name}):`, error);
    return { 
      success: false, 
      status: 'error', 
      previous_status: monitor.status,
      error: error instanceof Error ? error.message : String(error),
      responseTime: 0,
      statusCode: null
    };
  }
}

/**
 * 获取单个监控的详细信息
 */
export async function getMonitorDetails(db: Bindings['DB'], id: number) {
  const monitor = await MonitorRepository.getMonitorById(db, id);
  if (!monitor) {
    return null;
  }

  // 获取历史状态数据
  const historyResult = await MonitorRepository.getMonitorStatusHistory(db, id);
  
  // 获取最近的检查历史记录
  const checksResult = await MonitorRepository.getMonitorChecks(db, id, 5);
  
  return {
    ...monitor,
    history: historyResult.results || [],
    checks: checksResult.results || []
  };
}

/**
 * 检查单个监控
 * @param db 数据库连接
 * @param monitor 监控对象
 * @returns 检查结果
 */
export async function checkSingleMonitor(db: Bindings['DB'], monitor: Monitor) {
  return checkMonitor(db, monitor);
}

/**
 * 获取所有监控（根据用户角色过滤）
 * @param db 数据库连接
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns 监控列表和操作结果
 */
export async function getAllMonitors(db: Bindings['DB'], userId: number, userRole: string) {
  try {
    // 根据用户角色过滤监控
    let result;
    if (userRole === 'admin') {
      result = await db.prepare(
        'SELECT * FROM monitors ORDER BY created_at DESC'
      ).all<Monitor>();
    } else {
      result = await db.prepare(
        'SELECT * FROM monitors WHERE created_by = ? ORDER BY created_at DESC'
      ).bind(userId).all<Monitor>();
    }
    
    // 获取所有监控的历史状态数据
    if (result.results && result.results.length > 0) {
      const monitorsWithHistory = await Promise.all(result.results.map(async (monitor) => {
        const historyResult = await db.prepare(
          `SELECT * FROM monitor_status_history 
           WHERE monitor_id = ? 
           ORDER BY timestamp ASC`
        ).bind(monitor.id).all<MonitorStatusHistory>();
        
        return {
          ...monitor,
          history: historyResult.results || []
        };
      }));
      
      return { 
        success: true, 
        monitors: monitorsWithHistory,
        status: 200 
      };
    }
    
    return { 
      success: true, 
      monitors: result.results || [],
      status: 200 
    };
  } catch (error) {
    console.error('获取监控列表错误:', error);
    return { 
      success: false, 
      message: '获取监控列表失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 获取单个监控详情
 * @param db 数据库连接
 * @param id 监控ID
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns 监控详情和操作结果
 */
export async function getMonitorById(db: Bindings['DB'], id: number, userId: number, userRole: string) {
  try {
    const monitor = await MonitorRepository.getMonitorById(db, id);
    
    if (!monitor) {
      return { success: false, message: '监控不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && monitor.created_by !== userId) {
      return { success: false, message: '无权访问此监控', status: 403 };
    }
    
    // 获取历史状态数据
    const historyResult = await MonitorRepository.getMonitorStatusHistory(db, id);
    
    // 获取最近的检查历史记录
    const checksResult = await MonitorRepository.getMonitorChecks(db, id, 5);
    
    return { 
      success: true, 
      monitor: {
        ...monitor,
        history: historyResult.results || [],
        checks: checksResult.results || []
      },
      status: 200
    };
  } catch (error) {
    console.error('获取监控详情错误:', error);
    return { 
      success: false, 
      message: '获取监控详情失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 创建新监控
 * @param db 数据库连接
 * @param data 监控数据
 * @param userId 用户ID
 * @returns 创建结果
 */
export async function createMonitor(db: Bindings['DB'], data: any, userId: number) {
  try {
    // 验证必填字段
    if (!data.name || !data.url || !data.method) {
      return { success: false, message: '缺少必填字段', status: 400 };
    }
    
    // 创建新监控
    const newMonitor = await MonitorRepository.createMonitor(
      db,
      data.name,
      data.url,
      data.method,
      data.interval || 60,
      data.timeout || 30,
      data.expectedStatus || 200,
      data.headers ? JSON.stringify(data.headers) : '{}',
      data.body || '',
      userId
    );
    
    return { 
      success: true, 
      monitor: newMonitor,
      status: 201
    };
  } catch (error) {
    console.error('创建监控错误:', error);
    return { 
      success: false, 
      message: '创建监控失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 更新监控信息
 * @param db 数据库连接
 * @param id 监控ID
 * @param data 更新数据
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns 更新结果
 */
export async function updateMonitor(
  db: Bindings['DB'],
  id: number,
  data: any,
  userId: number,
  userRole: string
) {
  try {
    // 检查监控是否存在
    const monitor = await MonitorRepository.getMonitorById(db, id);
    
    if (!monitor) {
      return { success: false, message: '监控不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && monitor.created_by !== userId) {
      return { success: false, message: '无权修改此监控', status: 403 };
    }
    
    // 准备更新数据
    const updateData: Partial<Monitor> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.method !== undefined) updateData.method = data.method;
    if (data.interval !== undefined) updateData.interval = data.interval;
    if (data.timeout !== undefined) updateData.timeout = data.timeout;
    if (data.expectedStatus !== undefined) updateData.expected_status = data.expectedStatus;
    if (data.headers !== undefined) updateData.headers = JSON.stringify(data.headers);
    if (data.body !== undefined) updateData.body = data.body;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.uptime !== undefined) updateData.uptime = data.uptime;
    if (data.responseTime !== undefined) updateData.response_time = data.responseTime;
    if (data.lastChecked !== undefined) updateData.last_checked = data.lastChecked;
    
    // 执行更新
    const updatedMonitor = await MonitorRepository.updateMonitorConfig(db, id, updateData);
    
    if (typeof updatedMonitor === 'object' && 'message' in updatedMonitor) {
      return { 
        success: true, 
        message: updatedMonitor.message,
        monitor: monitor,
        status: 200
      };
    }
    
    return { 
      success: true, 
      monitor: updatedMonitor,
      status: 200
    };
  } catch (error) {
    console.error('更新监控错误:', error);
    return { 
      success: false, 
      message: '更新监控失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 删除监控
 * @param db 数据库连接
 * @param id 监控ID
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns 删除结果
 */
export async function deleteMonitor(
  db: Bindings['DB'],
  id: number,
  userId: number,
  userRole: string
) {
  try {
    // 检查监控是否存在
    const monitor = await MonitorRepository.getMonitorById(db, id);
    
    if (!monitor) {
      return { success: false, message: '监控不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && monitor.created_by !== userId) {
      return { success: false, message: '无权删除此监控', status: 403 };
    }
    
    // 执行删除
    const result = await MonitorRepository.deleteMonitor(db, id);
    
    if (!result.success) {
      throw new Error('删除监控失败');
    }
    
    return { 
      success: true, 
      message: '监控已删除',
      status: 200
    };
  } catch (error) {
    console.error('删除监控错误:', error);
    return { 
      success: false, 
      message: '删除监控失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 获取监控状态历史
 * @param db 数据库连接
 * @param id 监控ID
 * @param userId 用户ID
 * @param userRole 用户角色
 * @returns 状态历史
 */
export async function getMonitorStatusHistoryById(
  db: Bindings['DB'],
  id: number,
  userId: number,
  userRole: string
) {
  try {
    // 检查监控是否存在
    const monitor = await MonitorRepository.getMonitorById(db, id);
    
    if (!monitor) {
      return { success: false, message: '监控不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && monitor.created_by !== userId) {
      return { success: false, message: '无权访问此监控历史', status: 403 };
    }
    
    // 获取历史状态
    const historyResult = await MonitorRepository.getMonitorStatusHistory(db, id);
    
    return { 
      success: true, 
      history: historyResult.results || [],
      status: 200
    };
  } catch (error) {
    console.error('获取监控历史错误:', error);
    return { 
      success: false, 
      message: '获取监控历史失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 获取监控检查记录
 * @param db 数据库连接
 * @param id 监控ID
 * @param userId 用户ID
 * @param userRole 用户角色
 * @param limit 限制数量
 * @returns 检查记录
 */
export async function getMonitorChecksById(
  db: Bindings['DB'],
  id: number,
  userId: number,
  userRole: string,
  limit: number = 10
) {
  try {
    // 检查监控是否存在
    const monitor = await MonitorRepository.getMonitorById(db, id);
    
    if (!monitor) {
      return { success: false, message: '监控不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && monitor.created_by !== userId) {
      return { success: false, message: '无权访问此监控检查记录', status: 403 };
    }
    
    // 获取检查记录
    const checksResult = await MonitorRepository.getMonitorChecks(db, id, limit);
    
    return { 
      success: true, 
      checks: checksResult.results || [],
      status: 200
    };
  } catch (error) {
    console.error('获取监控检查记录错误:', error);
    return { 
      success: false, 
      message: '获取监控检查记录失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 手动检查监控并处理通知
 * @param db 数据库连接
 * @param id 监控ID
 * @param userId 用户ID
 * @param userRole 用户角色
 * @param env 环境变量
 * @returns 检查结果
 */
export async function manualCheckMonitor(
  db: Bindings['DB'],
  id: number,
  userId: number,
  userRole: string,
  env: any
) {
  try {
    // 检查监控是否存在
    const monitor = await MonitorRepository.getMonitorById(db, id);
    
    if (!monitor) {
      return { success: false, message: '监控不存在', status: 404 };
    }
    
    // 检查权限
    if (userRole !== 'admin' && monitor.created_by !== userId) {
      return { success: false, message: '无权访问此监控', status: 403 };
    }
    
    // 使用抽象出来的通用检查监控函数进行检查
    const result = await checkSingleMonitor(db, monitor);
    
    // 处理通知逻辑
    try {
      // 判断是否需要发送通知
      if (result.previous_status !== result.status) {
        console.log(`状态已变化: ${result.previous_status} -> ${result.status}`);
        
        // 检查是否需要发送通知
        console.log(`检查通知设置...`);
        const notificationCheck = await NotificationService.shouldSendNotification(
          db,
          'monitor',
          monitor.id,
          result.previous_status,
          result.status
        );
        
        console.log(`通知判断结果: shouldSend=${notificationCheck.shouldSend}, channels=${JSON.stringify(notificationCheck.channels)}`);
        
        if (notificationCheck.shouldSend && notificationCheck.channels.length > 0) {
          console.log(`监控 ${monitor.name} (ID: ${monitor.id}) 状态变更，正在发送通知...`);
          
          // 准备通知变量
          const variables = {
            name: monitor.name,
            status: result.status,
            previous_status: result.previous_status || '未知',
            time: new Date().toLocaleString('zh-CN'),
            response_time: `${result.responseTime}ms`,
            url: monitor.url,
            status_code: result.statusCode ? result.statusCode.toString() : '无',
            expected_status_code: monitor.expected_status.toString(),
            error: result.error || '无',
            details: `URL: ${monitor.url}\n响应时间: ${result.responseTime}ms\n状态码: ${result.statusCode || '无'}\n错误信息: ${result.error || '无'}`
          };
          
          console.log(`通知变量: ${JSON.stringify(variables)}`);
          
          // 发送通知
          console.log(`开始发送通知...`);
          const notificationResult = await NotificationService.sendNotification(
            db,
            'monitor',
            monitor.id,
            variables,
            notificationCheck.channels
          );
          
          console.log(`通知发送结果: ${JSON.stringify(notificationResult)}`);
          
          if (notificationResult.success) {
            console.log(`监控 ${monitor.name} (ID: ${monitor.id}) 通知发送成功`);
          } else {
            console.error(`监控 ${monitor.name} (ID: ${monitor.id}) 通知发送失败`);
          }
        } else {
          console.log(`监控 ${monitor.name} (ID: ${monitor.id}) 状态变更，但不需要发送通知`);
        }
      } else {
        console.log(`监控 ${monitor.name} (ID: ${monitor.id}) 状态未变更，不发送通知`);
      }
    } catch (notificationError) {
      console.error('处理通知时出错:', notificationError);
      // 通知处理错误不影响主流程返回
    }
    
    return { 
      success: true,
      message: '监控检查完成',
      result,
      status: 200
    };
  } catch (error) {
    console.error('手动检查监控错误:', error);
    return { 
      success: false, 
      message: '手动检查监控失败',
      error: error instanceof Error ? error.message : String(error),
      status: 500
    };
  }
}

/**
 * 获取预期状态码的显示文本
 * @param expectedStatus 预期状态码
 * @returns 显示文本
 */
function getExpectedStatusDisplay(expectedStatus: number): string {
  if (expectedStatus >= 1 && expectedStatus <= 5) {
    return `${expectedStatus}xx`;
  }
  return String(expectedStatus);
} 