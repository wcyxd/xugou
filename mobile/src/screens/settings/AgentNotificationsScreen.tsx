import React, { useState, useEffect, useMemo } from 'react';
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
import agentService from '../../api/agents';

// 类型定义
interface NotificationChannel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: any;
}

interface AgentNotificationSettings {
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
  overrideGlobal?: boolean;
}

interface NotificationSettings {
  monitors: any;
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
  specificMonitors: Record<string, any>;
  specificAgents: Record<string, AgentNotificationSettings>;
}

interface Agent {
  id: string;
  name: string;
  hostname?: string;
  ip_addresses?: string; // JSON 字符串，存储 IP 地址列表
  status?: string;
  os?: string;
  cpu?: {
    usage: number;
    cores: number;
    model: string;
  };
  memory?: {
    total: number;
    used: number;
  };
  disk?: {
    total: number;
    used: number;
  };
  version?: string;
  created_at?: string;
  updated_at?: string;
}

// 定义模拟数据
const mockSettings: NotificationSettings = {
  monitors: {
    enabled: true,
    onDown: true,
    onRecovery: true,
    channels: ['1', '2']
  },
  specificMonitors: {},
  agents: {
    enabled: true,
    onOffline: true,
    onRecovery: true,
    onCpuThreshold: true,
    cpuThreshold: 90,
    onMemoryThreshold: true,
    memoryThreshold: 85,
    onDiskThreshold: true,
    diskThreshold: 90,
    channels: ['1', '2']
  },
  specificAgents: {
    "1": {
      enabled: true,
      onOffline: true,
      onRecovery: false,
      onCpuThreshold: true,
      cpuThreshold: 95,
      onMemoryThreshold: false,
      memoryThreshold: 85,
      onDiskThreshold: false,
      diskThreshold: 90,
      channels: ['1'],
      overrideGlobal: true
    }
  }
};

const AgentNotificationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 将静态数据转换为使用国际化字符串
  const localizedMockChannels = useMemo(() => [
    { id: '1', name: t('notifications.channelSettings.typeOptions.app', '应用内'), type: 'app', enabled: true, config: {} },
    { id: '2', name: t('notifications.channelSettings.typeOptions.email', '邮件'), type: 'email', enabled: true, config: { email: 'admin@example.com' } },
    { id: '3', name: t('notifications.channelSettings.typeOptions.wechat', '微信'), type: 'wechat', enabled: true, config: {} }
  ], [t]);
  
  const localizedMockAgents = useMemo(() => [
    {
      id: '1',
      name: t('agents.title', '应用服务器'),
      hostname: 'app-server-01',
      ip_addresses: '192.168.1.10',
      status: 'active',
      os: 'Linux',
      cpu: { usage: 32.5, cores: 4, model: 'Intel i7' },
      memory: { total: 16384, used: 8192 },
      disk: { total: 512000, used: 256000 },
      version: '1.2.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: t('dashboard.title', '数据库服务器'),
      hostname: 'db-server-01',
      ip_addresses: '192.168.1.20',
      status: 'active',
      os: 'Ubuntu',
      cpu: { usage: 65.2, cores: 8, model: 'AMD Ryzen' },
      memory: { total: 32768, used: 24576 },
      disk: { total: 1024000, used: 512000 },
      version: '1.2.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ], [t]);
  
  // Load notification config and agent list
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading agent notification settings...');
        
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
            } else if (configResponse.data.agents) {
              console.log('Found agents field, using top-level object as settings');
              notificationSettings = configResponse.data;
              // Try to get channels from other properties
              channelList = configResponse.data.channels || [];
            } else {
              console.warn('Unrecognized data structure, will try to use the entire data object');
              notificationSettings = configResponse.data;
              channelList = localizedMockChannels;
            }
            
            console.log('Processed settings object contains fields:', Object.keys(notificationSettings || {}).join(', '));
            
            // Check if necessary fields exist and fix data
            if (!notificationSettings || !notificationSettings.agents || typeof notificationSettings.agents !== 'object') {
              console.warn('agents field is missing or incorrect format, using mock data');
              notificationSettings = notificationSettings || {};
              notificationSettings.agents = mockSettings.agents;
            }
            
            if (!notificationSettings.specificAgents) {
              console.warn('specificAgents field is missing, using empty object');
              notificationSettings.specificAgents = {};
            }
            
            if (!notificationSettings.monitors) {
              console.warn('monitors field is missing, using mock data');
              notificationSettings.monitors = mockSettings.monitors;
            }
            
            if (!notificationSettings.specificMonitors) {
              console.warn('specificMonitors field is missing, using empty object');
              notificationSettings.specificMonitors = {};
            }
            
            // Data validation and repair
            if (!Array.isArray(notificationSettings.agents.channels)) {
              console.warn('agents.channels is not an array, fixing to empty array');
              notificationSettings.agents.channels = [];
            }
            
            setSettings(notificationSettings);
            setChannels(channelList.length > 0 ? channelList : localizedMockChannels);
          } else {
            console.warn('Failed to get notification config, using mock data', configResponse.message);
            setSettings(mockSettings);
            setChannels(localizedMockChannels);
            if (configResponse.message) {
              console.error('Error details:', configResponse.message);
            }
          }
        } catch (configError) {
          console.error('Exception getting notification config, using mock data', configError);
          setSettings(mockSettings);
          setChannels(localizedMockChannels);
        }
        
        // Get agents list
        try {
          console.log('Requesting agents list...');
          const agentsResponse = await agentService.getAllAgents();
          console.log('Agents list response status:', agentsResponse.success);
          
          if (agentsResponse.success && agentsResponse.agents && agentsResponse.agents.length > 0) {
            console.log('Successfully got agents list, count:', agentsResponse.agents.length);
            setAgents(agentsResponse.agents);
          } else {
            console.warn('Using mock agents data:', agentsResponse.message || 'No agents available');
            setAgents(localizedMockAgents);
          }
        } catch (agentsError) {
          console.error('Exception getting agents list, using mock data', agentsError);
          setAgents(localizedMockAgents);
        }
        
        console.log('Data loading complete');
        
      } catch (error) {
        console.error('Failed to load data', error);
        setError(typeof error === 'string' ? error : t('common.unknownError'));
        
        // Ensure mock data is displayed even if there's an error
        setSettings(settings || mockSettings);
        setChannels(channels.length > 0 ? channels : localizedMockChannels);
        setAgents(agents.length > 0 ? agents : localizedMockAgents);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [t, localizedMockChannels, localizedMockAgents]);
  
  // Save settings
  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      console.log('Starting to save agent notification settings...');
      
      // Log settings to be saved
      console.log('Current global agent settings:', JSON.stringify(settings.agents));
      console.log('Current specific agent settings count:', Object.keys(settings.specificAgents || {}).length);
      
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
      console.error('Save failed:', error);
      Alert.alert(t('common.error'), t('notifications.save.error'));
    } finally {
      setSaving(false);
    }
  };
  
  // Global agent setting change
  const handleAgentSettingChange = (key: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      agents: {
        ...settings.agents,
        [key]: value
      }
    });
  };
  
  // Specific agent setting update
  const handleSpecificAgentSettingChange = (agentId: string, key: string, value: any) => {
    if (!settings) return;
    
    const currentSettings = settings.specificAgents[agentId] || {
      enabled: false,
      onOffline: false,
      onRecovery: false,
      onCpuThreshold: false,
      cpuThreshold: 90,
      onMemoryThreshold: false,
      memoryThreshold: 85,
      onDiskThreshold: false,
      diskThreshold: 90,
      channels: [],
      overrideGlobal: true
    };
    
    // Update settings
    let updatedSettings = {
      ...currentSettings,
      [key]: value,
      overrideGlobal: true
    };
    
    // If notification is enabled, also set overrideGlobal to true
    if (key === 'enabled' && value === true) {
      updatedSettings.overrideGlobal = true;
    }
    
    setSettings({
      ...settings,
      specificAgents: {
        ...settings.specificAgents,
        [agentId]: updatedSettings
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
          <Text style={styles.headerTitle}>{t('notifications.specificAgentSettings.title', '特定客户端通知设置')}</Text>
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
          {/* Specific client notification settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifications.specificSettings.title', 'Specific Client Notification Settings')}</Text>
            <Text style={styles.sectionDescription}>
              {t('notifications.specificSettings.description', 'Configure separate notification settings for each specific client.')}
            </Text>
            
            {agents.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={40} color="#999" />
                <Text style={styles.emptyStateText}>{t('notifications.specificSettings.noAgents', 'No agents available')}</Text>
              </View>
            ) : (
              agents.map(agent => (
                <View key={agent.id} style={styles.specificSettingItem}>
                  <View style={styles.specificSettingHeader}>
                    <View style={styles.specificSettingTitleContainer}>
                      <Text style={styles.specificSettingTitle}>{agent.name}</Text>
                      <Text style={styles.specificSettingDescription}>
                        {agent.hostname || t('common.unknown', 'Unknown')}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: agent.status === 'active' ? '#4caf50' : '#f44336' }
                    ]}>
                      <Text style={styles.statusText}>
                        {agent.status === 'active' ? t('agents.status.active', 'Online') : t('agents.status.inactive', 'Offline')}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.specificSettings}>
                    <View style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Text style={styles.settingItemText}>{t('notifications.settings.enabled', 'Enable Notification')}</Text>
                      </View>
                      <Switch
                        value={Boolean(settings.specificAgents[agent.id]?.enabled)}
                        onValueChange={(value) => handleSpecificAgentSettingChange(agent.id, 'enabled', value)}
                        trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                        thumbColor={settings.specificAgents[agent.id]?.enabled ? '#0066cc' : '#ccc'}
                      />
                    </View>
                    
                    {Boolean(settings.specificAgents[agent.id]?.enabled) && (
                      <>
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onOffline', 'Notify when client is offline')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificAgents[agent.id]?.onOffline)}
                            onValueChange={(value) => handleSpecificAgentSettingChange(agent.id, 'onOffline', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificAgents[agent.id]?.onOffline ? '#0066cc' : '#ccc'}
                          />
                        </View>
                        
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onRecovery', 'Notify when client recovers online')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificAgents[agent.id]?.onRecovery)}
                            onValueChange={(value) => handleSpecificAgentSettingChange(agent.id, 'onRecovery', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificAgents[agent.id]?.onRecovery ? '#0066cc' : '#ccc'}
                          />
                        </View>
                        
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onCpuThreshold', 'CPU Usage Alert')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificAgents[agent.id]?.onCpuThreshold)}
                            onValueChange={(value) => handleSpecificAgentSettingChange(agent.id, 'onCpuThreshold', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificAgents[agent.id]?.onCpuThreshold ? '#0066cc' : '#ccc'}
                          />
                        </View>
                        
                        {Boolean(settings.specificAgents[agent.id]?.onCpuThreshold) && (
                          <View style={styles.thresholdContainer}>
                            <Text style={styles.thresholdLabel}>{t('notifications.threshold.label', 'Threshold')}</Text>
                            <TextInput
                              style={styles.thresholdInput}
                              value={String(settings.specificAgents[agent.id]?.cpuThreshold || '')}
                              onChangeText={(text) => handleSpecificAgentSettingChange(agent.id, 'cpuThreshold', parseInt(text) || 0)}
                              keyboardType="numeric"
                              maxLength={3}
                            />
                            <Text style={styles.thresholdUnit}>{t('notifications.threshold.percent', '%')}</Text>
                          </View>
                        )}
                        
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onMemoryThreshold', 'Memory Usage Alert')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificAgents[agent.id]?.onMemoryThreshold)}
                            onValueChange={(value) => handleSpecificAgentSettingChange(agent.id, 'onMemoryThreshold', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificAgents[agent.id]?.onMemoryThreshold ? '#0066cc' : '#ccc'}
                          />
                        </View>
                        
                        {Boolean(settings.specificAgents[agent.id]?.onMemoryThreshold) && (
                          <View style={styles.thresholdContainer}>
                            <Text style={styles.thresholdLabel}>{t('notifications.threshold.label', 'Threshold')}</Text>
                            <TextInput
                              style={styles.thresholdInput}
                              value={String(settings.specificAgents[agent.id]?.memoryThreshold || '')}
                              onChangeText={(text) => handleSpecificAgentSettingChange(agent.id, 'memoryThreshold', parseInt(text) || 0)}
                              keyboardType="numeric"
                              maxLength={3}
                            />
                            <Text style={styles.thresholdUnit}>{t('notifications.threshold.percent', '%')}</Text>
                          </View>
                        )}
                        
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <Text style={styles.settingItemText}>{t('notifications.events.onDiskThreshold', 'Disk Usage Alert')}</Text>
                          </View>
                          <Switch
                            value={Boolean(settings.specificAgents[agent.id]?.onDiskThreshold)}
                            onValueChange={(value) => handleSpecificAgentSettingChange(agent.id, 'onDiskThreshold', value)}
                            trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                            thumbColor={settings.specificAgents[agent.id]?.onDiskThreshold ? '#0066cc' : '#ccc'}
                          />
                        </View>
                        
                        {Boolean(settings.specificAgents[agent.id]?.onDiskThreshold) && (
                          <View style={styles.thresholdContainer}>
                            <Text style={styles.thresholdLabel}>{t('notifications.threshold.label', 'Threshold')}</Text>
                            <TextInput
                              style={styles.thresholdInput}
                              value={String(settings.specificAgents[agent.id]?.diskThreshold || '')}
                              onChangeText={(text) => handleSpecificAgentSettingChange(agent.id, 'diskThreshold', parseInt(text) || 0)}
                              keyboardType="numeric"
                              maxLength={3}
                            />
                            <Text style={styles.thresholdUnit}>{t('notifications.threshold.percent', '%')}</Text>
                          </View>
                        )}
                        
                        {/* Notification channel settings */}
                        <View style={styles.channelsContainer}>
                          <Text style={styles.channelsTitle}>{t('notifications.specificSettings.channels', 'Notification Channels')}</Text>
                          
                          {channels.length === 0 ? (
                            <Text style={styles.noChannelsText}>{t('notifications.channels.noChannels', 'No notification channels available')}</Text>
                          ) : (
                            channels.map(channel => (
                              <View key={channel.id} style={styles.channelItem}>
                                <View style={styles.channelItemContent}>
                                  <Text style={styles.channelItemName}>{channel.name}</Text>
                                  <Text style={styles.channelItemType}>({t(`notifications.channels.type.${channel.type}`, channel.type)})</Text>
                                </View>
                                <Switch
                                  value={settings.specificAgents[agent.id]?.channels?.includes(channel.id)}
                                  onValueChange={(checked) => {
                                    const currentChannels = settings.specificAgents[agent.id]?.channels || [];
                                    const updatedChannels = checked 
                                      ? [...currentChannels, channel.id]
                                      : currentChannels.filter(id => id !== channel.id);
                                    
                                    handleSpecificAgentSettingChange(agent.id, 'channels', updatedChannels);
                                  }}
                                  trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                                  thumbColor={settings.specificAgents[agent.id]?.channels?.includes(channel.id) ? '#0066cc' : '#ccc'}
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
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 32,
    marginBottom: 16,
  },
  thresholdLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  thresholdInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
    textAlign: 'center',
  },
  thresholdUnit: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
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
  agentItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  agentInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  overrideSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overrideSwitchText: {
    fontSize: 13,
    color: '#333',
    marginRight: 8,
  },
  specificSettings: {
    marginTop: 16,
    paddingLeft: 12,
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
  },
  specificSettingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specificSettingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  specificSettingDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  overrideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overrideText: {
    fontSize: 13,
    color: '#333',
    marginRight: 8,
  },
  channelsContainer: {
    marginTop: 16,
  },
  channelsTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
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
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default AgentNotificationsScreen; 