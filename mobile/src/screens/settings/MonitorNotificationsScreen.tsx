import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

// 引入API服务
import { getNotificationConfig, saveNotificationSettings } from '../../api/notifications';
import monitorService from '../../api/monitors';

// 类型定义
interface NotificationChannel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: any;
}

interface MonitorNotificationSettings {
  enabled: boolean;
  onDown: boolean;
  onRecovery: boolean;
  onResponseTimeThreshold: boolean;
  responseTimeThreshold: number;
  onConsecutiveFailure: boolean;
  consecutiveFailureThreshold: number;
  channels: string[];
  overrideGlobal?: boolean;
}

// 通知设置类型
interface NotificationSettings {
  monitors: {
    enabled: boolean;
    onDown: boolean;
    onRecovery: boolean;
    onResponseTimeThreshold: boolean;
    responseTimeThreshold: number;
    onConsecutiveFailure: boolean;
    consecutiveFailureThreshold: number;
    channels: string[];
  };
  agents: {
    enabled: boolean;
    onOffline: boolean;
    onRecovery: boolean;
    onCpuThreshold: boolean;
    cpuThreshold: number;
    onMemoryThreshold: boolean;
    memoryThreshold: number;
    onDiskThreshold: boolean;
    diskThreshold: number;
    channels: string[];
  };
  specificMonitors: Record<string, MonitorNotificationSettings>;
  specificAgents: Record<string, any>;
}

interface Monitor {
  id: string;
  name: string;
  url: string;
  type?: string;
  method: string;
  interval: number;
  timeout: number;
  retries: number;
  status: string;
  uptime: number;
  response_time: number;
  active?: boolean;
  last_checked?: string;
  created_at: string;
  updated_at: string;
}

// 模拟数据用于开发测试
const mockSettings: NotificationSettings = {
  monitors: {
    enabled: true,
    onDown: true,
    onRecovery: false,
    onResponseTimeThreshold: true,
    responseTimeThreshold: 1000,
    onConsecutiveFailure: false,
    consecutiveFailureThreshold: 3,
    channels: ['1', '2'],
  },
  agents: {
    enabled: false,
    onOffline: false,
    onRecovery: false,
    onCpuThreshold: false,
    cpuThreshold: 80,
    onMemoryThreshold: false,
    memoryThreshold: 80,
    onDiskThreshold: false,
    diskThreshold: 90,
    channels: [],
  },
  specificMonitors: {},
  specificAgents: {},
};

const mockChannels: NotificationChannel[] = [
  { id: '1', name: '系统通知', type: 'app', enabled: true, config: {} },
  { id: '2', name: '邮件通知', type: 'email', enabled: true, config: { email: 'admin@example.com' } },
  { id: '3', name: '微信通知', type: 'wechat', enabled: true, config: {} }
];

const mockMonitors: Monitor[] = [
  {
    id: '1',
    name: '网站监控',
    url: 'https://example.com',
    type: 'http',
    method: 'GET',
    interval: 1,
    timeout: 5,
    retries: 2,
    status: 'up',
    uptime: 99.8,
    response_time: 320,
    active: true,
    last_checked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'API 服务',
    url: 'https://api.example.com/health',
    type: 'http',
    method: 'GET',
    interval: 5,
    timeout: 10,
    retries: 3,
    status: 'down',
    uptime: 95.4,
    response_time: 500,
    active: true,
    last_checked: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MonitorNotificationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    monitors: {
      enabled: false,
      onDown: false,
      onRecovery: false,
      onResponseTimeThreshold: false,
      responseTimeThreshold: 1000,
      onConsecutiveFailure: false,
      consecutiveFailureThreshold: 3,
      channels: [],
    },
    agents: {
      enabled: false,
      onOffline: false,
      onRecovery: false,
      onCpuThreshold: false,
      cpuThreshold: 80,
      onMemoryThreshold: false,
      memoryThreshold: 80,
      onDiskThreshold: false,
      diskThreshold: 90,
      channels: [],
    },
    specificMonitors: {},
    specificAgents: {},
  });
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 加载通知配置和监控列表
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading monitor notification settings...');
        
        // Get notification config
        let notificationSettings = null;
        let channelList = [];
        
        try {
          console.log('Requesting notification config...');
          const configResponse = await getNotificationConfig();
          console.log('Notification config response status:', configResponse.success);
          
          if (configResponse.success && configResponse.data) {
            console.log('Notification config response data format:', typeof configResponse.data);
            
            // Check data structure and process
            if (configResponse.data.settings) {
              console.log('Found settings field, using standard format');
              notificationSettings = configResponse.data.settings;
              channelList = configResponse.data.channels || [];
            } else if (configResponse.data.monitors) {
              console.log('Found monitors field, using top-level object as settings');
              notificationSettings = configResponse.data;
              // Try to get channels from other properties
              channelList = configResponse.data.channels || [];
            } else {
              console.warn('Unrecognized data structure, will try to use the entire data object');
              notificationSettings = configResponse.data;
              channelList = mockChannels;
            }
            
            console.log('Processed settings object contains fields:', Object.keys(notificationSettings || {}).join(', '));
            
            // Check if necessary fields exist and fix data
            if (!notificationSettings || !notificationSettings.monitors || typeof notificationSettings.monitors !== 'object') {
              console.warn('monitors field is missing or incorrect format, using mock data');
              notificationSettings = notificationSettings || {};
              notificationSettings.monitors = mockSettings.monitors;
            }
            
            if (!notificationSettings.specificMonitors) {
              console.warn('specificMonitors field is missing, using empty object');
              notificationSettings.specificMonitors = {};
            }
            
            if (!notificationSettings.agents) {
              console.warn('agents field is missing, using mock data');
              notificationSettings.agents = mockSettings.agents;
            }
            
            if (!notificationSettings.specificAgents) {
              console.warn('specificAgents field is missing, using empty object');
              notificationSettings.specificAgents = {};
            }
            
            // Data validation and repair
            if (!Array.isArray(notificationSettings.monitors.channels)) {
              console.warn('monitors.channels is not an array, fixing to empty array');
              notificationSettings.monitors.channels = [];
            }
            
            setSettings(notificationSettings);
            setChannels(channelList.length > 0 ? channelList : mockChannels);
          } else {
            console.warn('Failed to get notification config, using mock data', configResponse.message);
            setSettings(mockSettings);
            setChannels(mockChannels);
            if (configResponse.message) {
              console.error('Error details:', configResponse.message);
            }
          }
        } catch (configError) {
          console.error('Exception getting notification config, using mock data', configError);
          setSettings(mockSettings);
          setChannels(mockChannels);
        }
        
        // Get monitors list
        try {
          console.log('Requesting monitors list...');
          const monitorsResponse = await monitorService.getAllMonitors();
          console.log('Monitors list response status:', monitorsResponse.success);
          
          if (monitorsResponse.success && monitorsResponse.monitors && monitorsResponse.monitors.length > 0) {
            console.log('Successfully got monitors list, count:', monitorsResponse.monitors.length);
            setMonitors(monitorsResponse.monitors);
          } else {
            console.warn('Using mock monitors data:', monitorsResponse.message || 'No monitors available');
            setMonitors(mockMonitors);
          }
        } catch (monitorsError) {
          console.error('Exception getting monitors list, using mock data', monitorsError);
          setMonitors(mockMonitors);
        }
        
        console.log('Data loading complete');
        
      } catch (error) {
        console.error('Failed to load data', error);
        setError(typeof error === 'string' ? error : t('common.unknownError'));
        
        // Ensure mock data is displayed even if there's an error
        setSettings(settings || mockSettings);
        setChannels(channels.length > 0 ? channels : mockChannels);
        setMonitors(monitors.length > 0 ? monitors : mockMonitors);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [t]);
  
  // 保存设置
  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      console.log('Starting to save monitor notification settings...');
      
      // Log settings to be saved
      console.log('Current global monitor settings:', JSON.stringify(settings.monitors));
      console.log('Current specific monitor settings count:', Object.keys(settings.specificMonitors || {}).length);
      
      const response = await saveNotificationSettings(settings);
      console.log('Save response result:', JSON.stringify(response));
      
      if (response.success) {
        console.log('Save successful!');
        Alert.alert(
          t('common.success'),
          t('notifications.save.success'),
          [{ text: t('common.ok'), onPress: () => console.log('Save success dialog closed') }]
        );
      } else {
        console.error('Save failed:', response.message);
        Alert.alert(
          t('common.error'),
          response.message || t('notifications.save.error'),
          [{ text: t('common.ok'), onPress: () => console.log('Save failure dialog closed') }]
        );
      }
    } catch (error) {
      console.error('Exception saving settings:', error);
      Alert.alert(t('common.error'), t('notifications.save.error'));
    } finally {
      setSaving(false);
    }
  };
  
  // 全局监控设置变更
  const handleMonitorSettingChange = (key: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      monitors: {
        ...settings.monitors,
        [key]: value
      }
    });
  };
  
  // 特定监控的设置更新
  const handleSpecificMonitorSettingChange = (monitorId: string, key: string, value: any) => {
    if (!settings) return;
    
    const currentSettings = settings.specificMonitors[monitorId] || {
      enabled: false,
      onDown: false,
      onRecovery: false,
      onResponseTimeThreshold: false,
      responseTimeThreshold: 1000,
      onConsecutiveFailure: false,
      consecutiveFailureThreshold: 3,
      channels: [],
      overrideGlobal: true
    };
    
    // 更新设置
    let updatedSettings = {
      ...currentSettings,
      [key]: value,
      overrideGlobal: true
    };
    
    // 如果是启用通知，同时也设置overrideGlobal为true
    if (key === 'enabled' && value === true) {
      updatedSettings.overrideGlobal = true;
    }
    
    setSettings({
      ...settings,
      specificMonitors: {
        ...settings.specificMonitors,
        [monitorId]: updatedSettings
      }
    });
  };
  
  if (loading) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>{t('common.loading', '加载中')}...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }
  
  if (!settings) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#f76363" />
          <Text style={styles.errorText}>{error || t('notifications.loadFailed', '加载失败')}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>{t('common.goBack', '返回')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }
  
  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#0066cc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notifications.specificSettings.title', '特定监控通知设置')}</Text>
          <TouchableOpacity 
            style={styles.headerSaveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.headerSaveButtonText}>
              {saving ? t('common.saving', '保存中...') : t('common.save', '保存')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Specific monitor notification settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifications.specificSettings.title', '特定监控通知设置')}</Text>
            <Text style={styles.sectionDescription}>
              {t('notifications.specificSettings.description', '为每个具体的监控项目配置单独的通知设置。')}
            </Text>
            
            {monitors.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={40} color="#999" />
                <Text style={styles.emptyStateText}>{t('notifications.specificSettings.noMonitors', '没有可用的监控项目')}</Text>
              </View>
            ) : (
              monitors.map(monitor => (
                <View key={monitor.id} style={styles.specificSettingItem}>
                  <View style={styles.specificSettingHeader}>
                    <View style={styles.specificSettingTitleContainer}>
                      <Text style={styles.specificSettingTitle}>{monitor.name}</Text>
                      <Text style={styles.specificSettingDescription}>
                        {monitor.url}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: monitor.status === 'up' ? '#4caf50' : '#f44336' }
                    ]}>
                      <Text style={styles.statusText}>
                        {monitor.status === 'up' ? t('monitors.status.up', '正常') : t('monitors.status.down', '故障')}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.specificSettings}>
                    <View style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Text style={styles.settingItemText}>{t('notifications.enabled', '启用通知')}</Text>
                      </View>
                      <Switch
                        value={Boolean(settings.specificMonitors[monitor.id]?.enabled)}
                        onValueChange={(value) => handleSpecificMonitorSettingChange(monitor.id, 'enabled', value)}
                        trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                        thumbColor={settings.specificMonitors[monitor.id]?.enabled ? '#0066cc' : '#ccc'}
                      />
                    </View>
                    
                    {Boolean(settings.specificMonitors[monitor.id]?.enabled) && (
                      <>
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onDown', '监控故障时通知')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificMonitors[monitor.id]?.onDown)}
                            onValueChange={(value) => handleSpecificMonitorSettingChange(monitor.id, 'onDown', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificMonitors[monitor.id]?.onDown ? '#0066cc' : '#ccc'}
                          />
                        </View>
                        
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onRecovery', '恢复正常时通知')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificMonitors[monitor.id]?.onRecovery)}
                            onValueChange={(value) => handleSpecificMonitorSettingChange(monitor.id, 'onRecovery', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificMonitors[monitor.id]?.onRecovery ? '#0066cc' : '#ccc'}
                          />
                        </View>

                        {/* Notification channels setting */}
                        <View style={styles.channelsContainer}>
                          <Text style={styles.channelsTitle}>{t('notifications.specificSettings.channels', '通知渠道')}</Text>
                          
                          {channels.length === 0 ? (
                            <Text style={styles.noChannelsText}>{t('notifications.channelSettings.noChannels', '没有可用的通知渠道')}</Text>
                          ) : (
                            channels.map(channel => (
                              <View key={channel.id} style={styles.channelItem}>
                                <View style={styles.channelItemContent}>
                                  <Text style={styles.channelItemName}>{channel.name}</Text>
                                  <Text style={styles.channelItemType}>({t(`notifications.channelSettings.typeOptions.${channel.type}`, channel.type)})</Text>
                                </View>
                                <Switch
                                  value={settings.specificMonitors[monitor.id]?.channels?.includes(channel.id)}
                                  onValueChange={(checked) => {
                                    const currentChannels = settings.specificMonitors[monitor.id]?.channels || [];
                                    const updatedChannels = checked 
                                      ? [...currentChannels, channel.id]
                                      : currentChannels.filter(id => id !== channel.id);
                                    
                                    handleSpecificMonitorSettingChange(monitor.id, 'channels', updatedChannels);
                                  }}
                                  trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                                  thumbColor={settings.specificMonitors[monitor.id]?.channels?.includes(channel.id) ? '#0066cc' : '#ccc'}
                                />
                              </View>
                            ))
                          )}
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
          
          {/* 底部安全区域 */}
          <View style={styles.safeArea} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0066cc',
    borderRadius: 6,
  },
  headerSaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingItemContent: {
    flex: 1,
    paddingRight: 16,
  },
  settingItemText: {
    fontSize: 15,
    color: '#333',
  },
  settingItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  channelsSection: {
    marginTop: 8,
  },
  channelsSectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  noChannelsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelItemName: {
    fontSize: 14,
    color: '#333',
  },
  channelItemType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  noItemsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 16,
  },
  safeArea: {
    height: 20,
  },
  specificSettingItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  specificSettingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  specificSettingTitleContainer: {
    flex: 1,
  },
  specificSettingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  specificSettingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  specificSettings: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  statusBadge: {
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  channelsContainer: {
    marginTop: 16,
  },
  channelsTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
});

export default MonitorNotificationsScreen; 