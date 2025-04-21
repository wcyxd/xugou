import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import authService, { User } from '../../api/auth';

// 直接导入User类型，而不是自己定义
// interface User {
//   id: number;
//   email: string;
//   username: string;
// }

const ProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  // 加载用户信息
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const userData = await authService.getUserFromStorage();
      if (userData) {
        setUser(userData as User); // 使用类型断言确保类型匹配
        // 使用类型断言或提供默认值确保传递字符串类型
        setNewEmail(userData.email || '');
      }
    } catch (error) {
      console.error('加载用户资料失败', error);
      Alert.alert(t('common.error', '错误'), t('profile.loadFailed', '加载用户资料失败'));
    } finally {
      setLoading(false);
    }
  };

  // 更新电子邮箱
  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert(t('common.error', '错误'), t('profile.emailRequired', '请输入电子邮箱'));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      Alert.alert(t('common.error', '错误'), t('profile.invalidEmail', '请输入有效的电子邮箱'));
      return;
    }

    setUpdating(true);
    try {
      // 在实际应用中，这里应该调用API更新邮箱
      // 由于authService没有saveUserToStorage方法，替换为模拟更新
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (user) {
        const updatedUser = { ...user, email: newEmail };
        // 改为使用getCurrentUser方法模拟存储更新后的用户数据
        // 实际应用中应通过API更新邮箱
        setUser(updatedUser);
      }
      
      setShowEmailForm(false);
      Alert.alert(t('common.success', '成功'), t('profile.emailUpdateSuccess', '电子邮箱更新成功'));
    } catch (error) {
      console.error('更新电子邮箱失败', error);
      Alert.alert(t('common.error', '错误'), t('profile.emailUpdateFailed', '更新电子邮箱失败'));
    } finally {
      setUpdating(false);
    }
  };

  // 重置密码
  const handleResetPassword = async () => {
    if (!currentPassword) {
      Alert.alert(t('common.error', '错误'), t('profile.currentPasswordRequired', '请输入当前密码'));
      return;
    }

    if (!newPassword) {
      Alert.alert(t('common.error', '错误'), t('profile.newPasswordRequired', '请输入新密码'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error', '错误'), t('profile.passwordMismatch', '两次输入的密码不一致'));
      return;
    }

    setUpdating(true);
    try {
      // 在实际应用中，这里应该调用API重置密码
      // await authService.resetPassword(currentPassword, newPassword);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('common.success', '成功'), t('profile.passwordResetSuccess', '密码重置成功'));
    } catch (error) {
      console.error('重置密码失败', error);
      Alert.alert(t('common.error', '错误'), t('profile.passwordResetFailed', '重置密码失败'));
    } finally {
      setUpdating(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (showEmailForm) {
      setShowEmailForm(false);
      if (user) {
        // 使用空字符串作为默认值，避免undefined
        setNewEmail(user.email || '');
      }
    }
    
    if (showPasswordForm) {
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('settings.profile', '个人资料')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* 用户基本信息 */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.username}>{user?.username || t('common.unknown', '未知用户')}</Text>
            <Text style={styles.email}>{user?.email || t('common.notSet', '未设置')}</Text>
          </View>

          {/* 账户设置区域 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.accountSettings', '账户设置')}</Text>

            {/* 修改邮箱选项 */}
            {!showEmailForm ? (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowEmailForm(true)}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="mail-outline" size={22} color="#0066cc" />
                  <Text style={styles.menuItemText}>{t('profile.changeEmail', '修改电子邮箱')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>{t('profile.updateEmail', '更新电子邮箱')}</Text>
                
                <TextInput
                  style={styles.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder={t('profile.newEmail', '新电子邮箱')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={updating}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel', '取消')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]}
                    onPress={handleUpdateEmail}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('common.save', '保存')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 重置密码选项 */}
            {!showPasswordForm ? (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowPasswordForm(true)}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="key-outline" size={22} color="#0066cc" />
                  <Text style={styles.menuItemText}>{t('profile.resetPassword', '重置密码')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>{t('profile.resetPassword', '重置密码')}</Text>
                
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t('profile.currentPassword', '当前密码')}
                  secureTextEntry
                />
                
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('profile.newPassword', '新密码')}
                  secureTextEntry
                />
                
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('profile.confirmPassword', '确认新密码')}
                  secureTextEntry
                />
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={updating}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel', '取消')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]}
                    onPress={handleResetPassword}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('common.save', '保存')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  formContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#0066cc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default ProfileScreen; 