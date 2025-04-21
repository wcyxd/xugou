import { Bindings } from '../models/db';

// 用户类型定义
interface User {
  id: number;
  username: string;
  password: string;
  email: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

// 不含密码的用户信息
type UserWithoutPassword = Omit<User, 'password'>;

/**
 * 用户管理相关的数据库操作
 */

// 获取所有用户（不包括密码）
export async function getAllUsers(db: Bindings['DB']) {
  return await db.prepare(
    'SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY id'
  ).all<UserWithoutPassword>();
}

// 根据ID获取用户（不包括密码）
export async function getUserById(db: Bindings['DB'], id: number) {
  return await db.prepare(
    'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?'
  ).bind(id).first<UserWithoutPassword>();
}

// 根据ID获取完整用户信息（包括密码）
export async function getFullUserById(db: Bindings['DB'], id: number) {
  return await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first<User>();
}

// 根据用户名检查用户是否存在
export async function checkUserExists(db: Bindings['DB'], username: string, excludeId?: number) {
  let query = 'SELECT id FROM users WHERE username = ?';
  let params: any[] = [username];
  
  if (excludeId !== undefined) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  
  return await db.prepare(query).bind(...params).first<{id: number} | null>();
}

// 创建新用户
export async function createUser(
  db: Bindings['DB'],
  username: string,
  hashedPassword: string,
  email: string | null,
  role: string
) {
  const now = new Date().toISOString();
  
  const result = await db.prepare(
    `INSERT INTO users (username, password, email, role, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    username,
    hashedPassword,
    email,
    role,
    now,
    now
  ).run();
  
  if (!result.success) {
    throw new Error('创建用户失败');
  }
  
  return await db.prepare(
    'SELECT id, username, email, role, created_at, updated_at FROM users WHERE rowid = last_insert_rowid()'
  ).first<UserWithoutPassword>();
}

// 更新用户信息
export async function updateUser(
  db: Bindings['DB'],
  id: number,
  updates: {
    username?: string;
    email?: string | null;
    role?: string;
    password?: string;
  }
) {
  const now = new Date().toISOString();
  
  // 准备更新数据
  const fieldsToUpdate = [];
  const values = [];
  
  if (updates.username !== undefined) {
    fieldsToUpdate.push('username = ?');
    values.push(updates.username);
  }
  
  if (updates.email !== undefined) {
    fieldsToUpdate.push('email = ?');
    values.push(updates.email);
  }
  
  if (updates.role !== undefined) {
    fieldsToUpdate.push('role = ?');
    values.push(updates.role);
  }
  
  if (updates.password !== undefined) {
    fieldsToUpdate.push('password = ?');
    values.push(updates.password);
  }
  
  fieldsToUpdate.push('updated_at = ?');
  values.push(now);
  
  // 添加ID作为条件
  values.push(id);
  
  // 如果没有要更新的字段，返回错误
  if (fieldsToUpdate.length <= 1) {
    throw new Error('没有提供要更新的字段');
  }
  
  // 执行更新
  const result = await db.prepare(
    `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`
  ).bind(...values).run();
  
  if (!result.success) {
    throw new Error('更新用户失败');
  }
  
  return await getUserById(db, id);
}

// 更新用户密码
export async function updateUserPassword(
  db: Bindings['DB'],
  id: number,
  hashedPassword: string
) {
  const now = new Date().toISOString();
  
  const result = await db.prepare(
    'UPDATE users SET password = ?, updated_at = ? WHERE id = ?'
  ).bind(
    hashedPassword,
    now,
    id
  ).run();
  
  if (!result.success) {
    throw new Error('更新密码失败');
  }
  
  return { success: true, message: '密码已更新' };
}

// 删除用户
export async function deleteUser(db: Bindings['DB'], id: number) {
  const result = await db.prepare(
    'DELETE FROM users WHERE id = ?'
  ).bind(id).run();
  
  if (!result.success) {
    throw new Error('删除用户失败');
  }
  
  return { success: true, message: '用户已删除' };
} 