/**
 * 迁移脚本: 从0.0.3版本迁移到0.0.4版本
 * 主要变更: 确保 agents 表中有 ip_addresses 字段
 */

import { Bindings } from '../models/db';

/**
 * 检查表中是否存在特定字段
 */
async function columnExists(env: Bindings, table: string, column: string): Promise<boolean> {
  try {
    const tableInfo = await env.DB.prepare(
      `PRAGMA table_info(${table})`
    ).all();
    
    return tableInfo.results?.some(
      (col: any) => col.name === column
    ) || false;
  } catch (error) {
    console.error(`检查字段 ${column} 是否存在时出错:`, error);
    return false;
  }
}

export async function migrateFrom003To004(env: Bindings): Promise<{ success: boolean, message: string }> {
  try {
    console.log('开始从v0.0.3迁移到v0.0.4...');
    
    // 检查 agents 表是否存在
    const tableExists = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='agents'`
    ).first<{ name: string }>();
    
    if (!tableExists) {
      console.log('agents 表不存在，跳过迁移');
      return {
        success: true, 
        message: 'agents 表不存在，跳过迁移',
      };
    }
    
    // 检查 ip_addresses 字段是否存在
    const hasIpAddressesColumn = await columnExists(env, 'agents', 'ip_addresses');
    
    if (hasIpAddressesColumn) {
      console.log('ip_addresses 字段已存在，无需迁移');
      return {
        success: true,
        message: 'ip_addresses 字段已存在，无需迁移',
      };
    }
    
    // 执行迁移 - 添加 ip_addresses 字段
    console.log('添加 ip_addresses 字段到 agents 表...');
    await env.DB.exec(`ALTER TABLE agents ADD COLUMN ip_addresses TEXT`);
    
    console.log('迁移完成: ip_addresses 字段已添加到 agents 表');
    
    // 更新现有记录的 ip_addresses 字段
    const agents = await env.DB.prepare('SELECT id, hostname FROM agents WHERE ip_addresses IS NULL').all<{id: number, hostname: string}>();
    
    if (agents.results && agents.results.length > 0) {
      console.log(`更新 ${agents.results.length} 条现有记录的 ip_addresses 字段...`);
      
      for (const agent of agents.results) {
        // 使用主机名作为默认的IP地址值
        const defaultIpValue = agent.hostname ? `${agent.hostname}-ip` : 'unknown-ip';
        
        await env.DB.prepare(
          'UPDATE agents SET ip_addresses = ? WHERE id = ?'
        ).bind(defaultIpValue, agent.id).run();
      }
      
      console.log('现有记录的 ip_addresses 字段已更新');
    }
    
    return {
      success: true,
      message: '从v0.0.3到v0.0.4的迁移成功完成',
    };
  } catch (error) {
    console.error('迁移错误:', error);
    return {
      success: false,
      message: `迁移失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
} 