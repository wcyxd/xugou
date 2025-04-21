/**
 * 通知工具函数
 * 现在通知的主要业务逻辑已移至 NotificationService
 * 为保持向后兼容，保留导出但从服务层重新导出相关方法
 */

import * as NotificationService from '../services/NotificationService';

// 重新导出主要函数
export const shouldSendNotification = NotificationService.shouldSendNotification;
export const sendNotification = NotificationService.sendNotification;
export const validateTelegramToken = NotificationService.validateTelegramToken;
export const sendTestEmail = NotificationService.sendTestEmail; 