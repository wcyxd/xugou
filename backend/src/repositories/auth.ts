import { Bindings } from '../models/db';

// 用户类型定义
interface User {
  id: number;
  username: string;
  password: string;
  email?: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 认证相关的数据库操作
 */

// 根据用户名获取用户
export async function getUserByUsername(db: Bindings['DB'], username: string): Promise<User | null> {
  return await db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).bind(username).first<User | null>();
}

// 创建新用户
export async function createUser(
  db: Bindings['DB'],
  username: string,
  hashedPassword: string,
  email: string | null,
  role: string = 'user'
): Promise<{id: number, username: string, role: string}> {
  const now = new Date().toISOString();
  
  // 创建新用户
  const result = await db.prepare(
    'INSERT INTO users (username, password, email, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    username, 
    hashedPassword, 
    email, 
    role, 
    now, 
    now
  ).run();
  
  if (!result.success) {
    throw new Error('数据库插入失败');
  }
  
  // 获取新创建的用户ID
  return await db.prepare(
    'SELECT id, username, role FROM users WHERE username = ?'
  ).bind(username).first<{id: number, username: string, role: string}>();
}

// 获取用户信息（不包含密码）
export async function getUserById(
  db: Bindings['DB'], 
  userId: number
): Promise<{id: number, username: string, email?: string, role: string} | null> {
  return await db.prepare(
    'SELECT id, username, email, role FROM users WHERE id = ?'
  ).bind(userId).first<{id: number, username: string, email?: string, role: string} | null>();
} 