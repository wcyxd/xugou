import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/authStore';
import { navigateAndReset } from '../../navigation/navigationUtils';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

// 引入语言切换函数
import { changeLanguage } from '../../i18n/i18n';

// 引入认证服务
import authService from '../../api/auth';

// 引入app.json获取版本号
import appJson from '../../../app.json';

// 浏览器环境专用直接退出函数
const browserDirectLogout = () => {
  console.log('执行浏览器环境专用退出函数');
  
  try {
    // @ts-ignore
    if (typeof window !== 'undefined') {
      console.log('browserDirectLogout: 检测到浏览器环境');
      
      // 清除认证状态
      const authStore = useAuthStore.getState();
      authStore.setAuthenticated(false);
      authStore.setUser(null);
      console.log('browserDirectLogout: 认证状态已重置');
      
      // 清除localStorage
      try {
        // @ts-ignore
        if (window.localStorage) {
          // @ts-ignore
          window.localStorage.removeItem('auth_token');
          // @ts-ignore
          window.localStorage.removeItem('user');
          console.log('browserDirectLogout: localStorage已清除');
        }
      } catch (e) {
        console.error('browserDirectLogout: 清除localStorage失败', e);
      }
      
      // 清除AsyncStorage (可能不适用于浏览器，但为安全起见)
      try {
        AsyncStorage.removeItem('auth_token');
        AsyncStorage.removeItem('user');
        console.log('browserDirectLogout: AsyncStorage已清除');
      } catch (e) {
        console.error('browserDirectLogout: 清除AsyncStorage失败', e);
      }
      
      // 立即重定向到登录页
      console.log('browserDirectLogout: 立即重定向到登录页');
      // @ts-ignore
      window.location.href = '/login';
      
      return true;
    }
  } catch (e) {
    console.error('browserDirectLogout: 浏览器环境退出失败', e);
  }
  
  return false;
};

// 应用设置类型
interface AppSettings {
  language: string;
  notifications: {
    monitorAlerts: boolean;
    agentAlerts: boolean;
  };
}

// 默认设置
const defaultSettings: AppSettings = {
  language: 'zh',
  notifications: {
    monitorAlerts: true,
    agentAlerts: true
  }
};

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  // 加载设置
  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('app_settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
      
      // 获取当前用户信息
      const user = await authService.getUserFromStorage();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.username || '用户');
      }
      
      // 获取应用版本
      if (appJson && appJson.expo) {
        setAppVersion(appJson.expo.version || '1.0.0');
      }
    } catch (error) {
      console.error('加载设置失败', error);
    }
  };
  
  // 保存设置
  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('保存设置失败', error);
      Alert.alert(t('common.error', '错误'), t('settings.saveFailed', '保存设置失败'));
    }
  };
  
  // 切换语言
  const handleLanguageChange = async (language: string) => {
    try {
      await changeLanguage(language);
      const newSettings = { ...settings, language };
      saveSettings(newSettings);
      setLanguageModalVisible(false);
    } catch (error) {
      console.error('切换语言失败', error);
      Alert.alert(t('common.error', '错误'), t('settings.languageChangeFailed', '切换语言失败'));
    }
  };
  
  // 打开监控告警设置页面
  const handleOpenMonitorNotifications = () => {
    navigation.navigate('MonitorNotifications');
  };
  
  // 打开客户端告警设置页面
  const handleOpenAgentNotifications = () => {
    navigation.navigate('AgentNotifications');
  };
  
  // 退出登录
  const handleLogout = () => {
    console.log('退出按钮处理函数被调用');
    
    // 先尝试浏览器环境的直接退出
    if (browserDirectLogout()) {
      console.log('浏览器环境直接退出成功，无需进一步操作');
      return;
    }
    
    // 非浏览器环境使用标准确认退出流程
    Alert.alert(
      t('auth.logoutTitle', '退出登录'),
      t('auth.logoutConfirmation', '您确定要退出登录吗？'),
      [
        {
          text: t('common.cancel', '取消'),
          style: 'cancel',
          onPress: () => console.log('用户取消退出登录')
        },
        {
          text: t('auth.logout', '退出登录'),
          style: 'destructive',
          onPress: () => {
            console.log('用户确认退出，执行退出逻辑');
            
            // 1. 直接设置认证状态为未认证
            console.log('1. 直接设置认证状态为未认证');
            const authStore = useAuthStore.getState();
            authStore.setAuthenticated(false);
            authStore.setUser(null);
            
            // 2. 清除AsyncStorage中的认证数据
            console.log('2. 清除AsyncStorage中的认证数据');
            Promise.all([
              AsyncStorage.removeItem('auth_token'),
              AsyncStorage.removeItem('user')
            ]).then(() => {
              console.log('所有存储数据已清除');
            }).catch(e => {
              console.error('清除存储数据时出错', e);
            });
            
            // 3. 使用多种方式尝试导航
            console.log('3. 多种方式尝试导航');
            
            // 方式1: 使用navigation对象
            try {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              console.log('方式1导航成功');
            } catch (e) {
              console.error('方式1导航失败', e);
              
              // 方式2: 使用全局navigateAndReset函数
              try {
                navigateAndReset('Login');
                console.log('方式2导航成功');
              } catch (e2) {
                console.error('方式2导航失败', e2);
              }
            }
          }
        }
      ]
    );
  };
  
  // 打开语言选择器
  const handleOpenLanguageSelector = () => {
    setLanguageModalVisible(true);
  };
  
  // 组件挂载时加载设置
  useEffect(() => {
    loadSettings();
  }, []);
  
  // 渲染菜单项
  const renderMenuItem = (
    icon: string, 
    title: string, 
    onPress?: () => void, 
    value?: string | React.ReactNode,
    showArrow: boolean = true
  ) => {
    return (
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.menuItemContent}>
          <View style={styles.menuItemIcon}>
            <Ionicons name={icon as any} size={22} color="#0066cc" />
          </View>
          <Text style={styles.menuItemText}>{title}</Text>
        </View>
        <View style={styles.menuItemRight}>
          {value && (
            typeof value === 'string' ? 
              <Text style={styles.menuItemValue}>{value}</Text> :
              value
          )}
          {showArrow && onPress && (
            <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.arrowIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaWrapper>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 用户资料部分 */}
        <View style={styles.profileContainer}>
          <View style={styles.profileLeft}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : 'U'}</Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileButtonText}>{t('settings.editProfile', '编辑资料')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* 设置部分 */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('settings.generalTitle', '通用设置')}</Text>
          
          {/* 语言选择 */}
          {renderMenuItem(
            'language-outline',
            t('settings.language', '语言'),
            handleOpenLanguageSelector,
            t(`languages.${settings.language}`, settings.language === 'zh' ? '中文' : 'English')
          )}
          
          {/* 全局设置 */}
          {renderMenuItem(
            'options-outline',
            t('settings.globalSettings', '全局设置'),
            () => navigation.navigate('GlobalSettings')
          )}
        </View>
        
        {/* 通知部分 */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('settings.notificationsTitle', '通知设置')}</Text>
          
          {/* 监控告警通知 */}
          {renderMenuItem(
            'notifications-outline',
            t('settings.monitorNotifications', '监控告警'),
            handleOpenMonitorNotifications
          )}
          
          {/* 客户端告警通知 */}
          {renderMenuItem(
            'server-outline',
            t('settings.agentNotifications', '客户端告警'),
            handleOpenAgentNotifications
          )}
          
          {/* 通知渠道 */}
          {renderMenuItem(
            'mail-outline',
            t('settings.notificationChannels', '通知渠道'),
            () => navigation.navigate('NotificationChannels')
          )}
        </View>
        
        {/* 关于部分 */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('settings.aboutTitle', '关于')}</Text>
          
          {/* 应用版本 */}
          {renderMenuItem(
            'information-circle-outline',
            t('settings.appVersion', '应用版本'),
            undefined,
            appVersion,
            false
          )}
        </View>
        
        {/* 退出登录按钮 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#f76363" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>{t('auth.logout', '退出登录')}</Text>
        </TouchableOpacity>
        
        {/* 版本信息 */}
        <Text style={styles.versionText}>Version {appVersion}</Text>
        
        {/* 语言选择弹窗 */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={languageModalVisible}
          onRequestClose={() => {
            setLanguageModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('settings.selectLanguage', '选择语言')}</Text>
                <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  settings.language === 'zh' && styles.selectedLanguage
                ]}
                onPress={() => handleLanguageChange('zh')}
              >
                <Text style={styles.languageText}>中文</Text>
                {settings.language === 'zh' && (
                  <Ionicons name="checkmark" size={20} color="#0066cc" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  settings.language === 'en' && styles.selectedLanguage
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={styles.languageText}>English</Text>
                {settings.language === 'en' && (
                  <Ionicons name="checkmark" size={20} color="#0066cc" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4f9',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066cc',
    textAlign: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f4f9',
    height: 36,
    justifyContent: 'center',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
    flex: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f0f4f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#888',
    marginRight: 4,
  },
  arrowIcon: {
    marginLeft: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f76363',
  },
  versionText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLanguage: {
    backgroundColor: 'rgba(0, 102, 204, 0.05)',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
});

export default SettingsScreen; 