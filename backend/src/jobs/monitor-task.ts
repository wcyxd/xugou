import { Hono } from 'hono';
import { Bindings } from '../models/db';
import { Monitor } from '../models/monitor';
import { cleanupOldRecords, getMonitorsToCheck, checkSingleMonitor as monitorServiceCheck } from '../services';
import { shouldSendNotification, sendNotification } from '../utils/notification';

const monitorTask = new Hono<{ Bindings: Bindings }>();

// 监控检查的主要函数
async function checkMonitors(c: any) {
  try {
    console.log('开始执行监控检查...');
    
    // 清理30天以前的历史记录
    await cleanupOldRecords(c.env.DB);
    
    // 获取当前时间
    const now = new Date();
    
    // 查询需要检查的监控
    const monitors = await getMonitorsToCheck(c.env.DB);
    
    console.log(`找到 ${monitors?.results?.length || 0} 个需要检查的监控`);
    
    if (!monitors.results || monitors.results.length === 0) {
      return { success: true, message: '没有需要检查的监控', checked: 0 };
    }
    
    // 检查每个监控
    const results = await Promise.all(monitors.results.map(async (monitorItem: any) => {
      // 确保正确的类型转换
      const monitor = monitorItem as Monitor;
      const checkResult = await checkSingleMonitor(c, monitor);
      
      // 处理通知
      await handleMonitorNotification(c, monitor, checkResult);
      
      return checkResult;
    }));
    
    return { 
      success: true, 
      message: '监控检查完成', 
      checked: results.length,
      results: results
    };
  } catch (error) {
    console.error('监控检查出错:', error);
    return { success: false, message: '监控检查出错', error: String(error) };
  }
}

// 检查单个监控的函数
async function checkSingleMonitor(c: any, monitor: Monitor) {
  // 使用服务层的检查函数
  return await monitorServiceCheck(c.env.DB, monitor);
}

// 处理监控通知
async function handleMonitorNotification(c: any, monitor: Monitor, checkResult: any) {
  try {
    console.log(`======= 通知检查开始 =======`);
    console.log(`监控: ${monitor.name} (ID: ${monitor.id})`);
    console.log(`上一状态: ${checkResult.previous_status}, 当前状态: ${checkResult.status}`);
    
    // 如果监控状态没有变化，不需要继续处理
    if (checkResult.status === checkResult.previous_status) {
      console.log(`状态未变化，不发送通知`);
      return;
    }
    
    console.log(`状态已变化: ${checkResult.previous_status} -> ${checkResult.status}`);
    
    // 检查是否需要发送通知
    console.log(`检查通知设置...`);
    const notificationCheck = await shouldSendNotification(
      c.env.DB,
      'monitor',
      monitor.id,
      checkResult.previous_status,
      checkResult.status
    );
    
    console.log(`通知判断结果: shouldSend=${notificationCheck.shouldSend}, channels=${JSON.stringify(notificationCheck.channels)}`);
    
    if (!notificationCheck.shouldSend || notificationCheck.channels.length === 0) {
      console.log(`监控 ${monitor.name} (ID: ${monitor.id}) 状态变更，但不需要发送通知`);
      return;
    }
    
    console.log(`监控 ${monitor.name} (ID: ${monitor.id}) 状态变更，正在发送通知...`);
    console.log(`通知渠道: ${JSON.stringify(notificationCheck.channels)}`);
    
    // 准备通知变量
    const variables = {
      name: monitor.name,
      status: checkResult.status,
      previous_status: checkResult.previous_status || '未知',
      time: new Date().toLocaleString('zh-CN'),
      url: monitor.url,
      response_time: `${checkResult.responseTime}ms`,
      status_code: checkResult.statusCode ? checkResult.statusCode.toString() : '无',
      expected_status_code: monitor.expected_status.toString(),
      error: checkResult.error || '无',
      details: `URL: ${monitor.url}\n响应时间: ${checkResult.responseTime}ms\n状态码: ${checkResult.statusCode || '无'}\n错误信息: ${checkResult.error || '无'}`
    };
    
    console.log(`通知变量: ${JSON.stringify(variables)}`);
    
    // 发送通知
    console.log(`开始发送通知...`);
    const notificationResult = await sendNotification(
      c.env.DB,
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
    console.log(`======= 通知检查结束 =======`);
  } catch (error) {
    console.error(`处理监控通知时出错 (${monitor.name}, ID: ${monitor.id}):`, error);
  }
}

// 定义触发器路由 - 通过HTTP请求触发监控检查
monitorTask.get('/api/trigger-check', async (c) => {
  const result = await checkMonitors(c);
  return c.json(result);
});

// 在 Cloudflare Workers 中设置定时触发器
export default {
  async scheduled(event: any, env: any, ctx: any) {
    const c = { env };
    await checkMonitors(c);
  },
  fetch: monitorTask.fetch
}; 