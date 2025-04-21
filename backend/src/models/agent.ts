// 客户端类型定义
export interface Agent {
  id: number;
  name: string;
  token: string;
  created_by: number;
  status: string;
  created_at: string;
  updated_at: string;
  hostname: string | null;
  ip_addresses: string | null; // 存储多个IP地址的JSON字符串
  os: string | null;
  version: string | null;
  
  // 资源指标字段
  cpu_usage: number | null;
  memory_total: number | null;
  memory_used: number | null;
  disk_total: number | null;
  disk_used: number | null;
  network_rx: number | null;
  network_tx: number | null;
} 