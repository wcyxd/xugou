import { Hono } from 'hono';
import { Bindings } from '../models/db';
import { 
  getStatusPageConfig, 
  saveStatusPageConfig, 
  getStatusPagePublicData
} from '../services/StatusService';

// 状态页配置接口
interface StatusPageConfig {
  title: string;
  description: string;
  logoUrl: string;
  customCss: string;
  monitors: number[]; // 已选择的监控项ID
  agents: number[]; // 已选择的客户端ID
}

// 创建API路由
const app = new Hono<{ Bindings: Bindings }>();


// 创建管理员路由组
const adminRoutes = new Hono<{ Bindings: Bindings }>();

// 获取状态页配置(管理员)
adminRoutes.get('/config', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.id;
  
  try {
    const config = await getStatusPageConfig(c.env, userId);
    return c.json(config);
  } catch (error) {
    console.error('获取状态页配置失败:', error);
    return c.json({ error: '获取状态页配置失败' }, 500);
  }
});

// 保存状态页配置
adminRoutes.post('/config', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.id;
  const data = await c.req.json() as StatusPageConfig;
  
  console.log('接收到的配置数据:', JSON.stringify(data));
  
  if (!data) {
    console.log('无效的请求数据');
    return c.json({ error: '无效的请求数据' }, 400);
  }
  
  try {
    const result = await saveStatusPageConfig(c.env, userId, data);
    return c.json(result);
  } catch (error) {
    console.error('保存状态页配置失败:', error);
    return c.json({ error: '保存状态页配置失败' }, 500);
  }
});

// 公共路由
// 获取状态页数据（公开访问）
app.get('/data', async (c) => {
  try {
    const result = await getStatusPagePublicData(c.env);
    return c.json(result);
  } catch (error) {
    console.error('获取状态页数据失败:', error);
    return c.json({ success: false, message: '获取状态页数据失败', error: String(error) }, 500);
  }
});

// 使用路由组
app.route('/', adminRoutes);

export default app; 