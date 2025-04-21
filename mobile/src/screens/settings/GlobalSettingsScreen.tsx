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

// 类型定义
interface NotificationChannel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: any;
}

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
  system?: {
    enabled: boolean;
    channels: string[];
  };
  // 保留这两个字段以符合API期望的类型定义，但在UI中不显示相关设置
  specificMonitors: Record<string, any>;
  specificAgents: Record<string, any>;
}

const GlobalSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 加载通知配置
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading global notification settings...');
        
        // Get notification config
        const configResponse = await getNotificationConfig();
        if (configResponse.success && configResponse.data) {
          setSettings(configResponse.data.settings);
          setChannels(configResponse.data.channels || []);
        } else {
          console.error('Failed to get notification config:', configResponse.message);
          setError(configResponse.message || t('notifications.loadFailed'));
        }
      } catch (error) {
        console.error('Failed to load data', error);
        setError(typeof error === 'string' ? error : t('common.unknownError'));
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
      console.log('Saving global notification settings...');
      
      const response = await saveNotificationSettings(settings);
      
      if (response.success) {
        Alert.alert(
          t('common.success'),
          t('notifications.save.success'),
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert(
          t('common.error'),
          response.message || t('notifications.save.error'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(t('common.error'), t('notifications.save.error'));
    } finally {
      setSaving(false);
    }
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
  
  if (error || !settings) {
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
          <Text style={styles.headerTitle}>{t('notifications.settings.title', '通知设置')}</Text>
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
          {/* Global notification settings description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifications.globalSettingsConfig.global', '全局设置')}</Text>
            <Text style={styles.sectionDescription}>
              {t('notifications.globalSettingsConfig.globalDescription', '配置系统级别的全局通知设置，这些设置将作为默认值应用于所有监控和客户端。')}
            </Text>
            
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={24} color="#0066cc" />
              <Text style={styles.infoText}>
                {t('notifications.globalSettingsConfig.globalInfo', '在此页面配置全局默认通知设置，包括监控告警和客户端告警的基本配置。您可以在各自的设置页面中配置特定监控或客户端的通知。')}
              </Text>
            </View>
          </View>
          
          {/* Global monitor alert settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.notificationsMonitor', '全局监控告警通知')}</Text>
            <Text style={styles.sectionDescription}>
              {t('notifications.monitors.description', '配置适用于所有API监控的全局默认告警通知设置。')}
            </Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemContent}>
                <Text style={styles.settingItemText}>{t('notifications.monitorAlertEnabled', '启用监控告警')}</Text>
                <Text style={styles.settingItemDescription}>{t('notifications.monitors.enabledDescription', '开启后将接收所有监控的告警通知。')}</Text>
              </View>
              <Switch
                value={Boolean(settings.monitors.enabled)}
                onValueChange={(value) => {
                  setSettings({
                    ...settings,
                    monitors: {
                      ...settings.monitors,
                      enabled: value
                    }
                  });
                }}
                trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                thumbColor={settings.monitors.enabled ? '#0066cc' : '#ccc'}
              />
            </View>
            
            {Boolean(settings.monitors.enabled) && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.monitors.onDown', '故障时通知')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.monitors.onDownDescription', '当监控检测到故障时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.monitors.onDown)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        monitors: {
                          ...settings.monitors,
                          onDown: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.monitors.onDown ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.monitors.onRecovery', '恢复时通知')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.monitors.onRecoveryDescription', '当监控从故障状态恢复时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.monitors.onRecovery)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        monitors: {
                          ...settings.monitors,
                          onRecovery: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.monitors.onRecovery ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                <View style={styles.channelsSection}>
                  <Text style={styles.channelsSectionTitle}>{t('notifications.specificSettings.channels', '通知渠道')}</Text>
                  
                  {channels.length === 0 ? (
                    <Text style={styles.noChannelsText}>{t('notifications.channels.noChannels', '没有可用的通知渠道')}</Text>
                  ) : (
                    channels.map(channel => (
                      <View key={channel.id} style={styles.channelItem}>
                        <View style={styles.channelItemContent}>
                          <Text style={styles.channelItemName}>{channel.name}</Text>
                          <Text style={styles.channelItemType}>({t(`notifications.channels.type.${channel.type}`, channel.type === 'app' ? '应用内' : channel.type === 'email' ? '邮件' : channel.type === 'wechat' ? '微信' : channel.type)})</Text>
                        </View>
                        <Switch
                          value={settings.monitors.channels?.includes(channel.id)}
                          onValueChange={(checked) => {
                            const updatedChannels = checked 
                              ? [...(settings.monitors.channels || []), channel.id]
                              : (settings.monitors.channels || []).filter(id => id !== channel.id);
                            
                            setSettings({
                              ...settings,
                              monitors: {
                                ...settings.monitors,
                                channels: updatedChannels
                              }
                            });
                          }}
                          trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                          thumbColor={settings.monitors.channels?.includes(channel.id) ? '#0066cc' : '#ccc'}
                        />
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
          
          {/* Global agent alert settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.notificationsAgent', '全局客户端告警通知')}</Text>
            <Text style={styles.sectionDescription}>
              {t('notifications.agents.description', '配置适用于所有客户端的全局默认告警通知设置。')}
            </Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemContent}>
                <Text style={styles.settingItemText}>{t('notifications.agentAlertEnabled', '启用客户端告警')}</Text>
                <Text style={styles.settingItemDescription}>{t('notifications.agents.enabledDescription', '开启后将接收所有客户端的告警通知。')}</Text>
              </View>
              <Switch
                value={Boolean(settings.agents.enabled)}
                onValueChange={(value) => {
                  setSettings({
                    ...settings,
                    agents: {
                      ...settings.agents,
                      enabled: value
                    }
                  });
                }}
                trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                thumbColor={settings.agents.enabled ? '#0066cc' : '#ccc'}
              />
            </View>
            
            {Boolean(settings.agents.enabled) && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.agents.onOffline', '离线时通知')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.agents.onOfflineDescription', '当客户端离线时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.agents.onOffline)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        agents: {
                          ...settings.agents,
                          onOffline: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.agents.onOffline ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.agents.onRecovery', '恢复时通知')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.agents.onRecoveryDescription', '当客户端从离线状态恢复时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.agents.onRecovery)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        agents: {
                          ...settings.agents,
                          onRecovery: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.agents.onRecovery ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                {/* CPU阈值 */}
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.agents.onCpuThreshold', 'CPU阈值告警')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.agents.onCpuThresholdDescription', '当CPU使用率超过阈值时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.agents.onCpuThreshold)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        agents: {
                          ...settings.agents,
                          onCpuThreshold: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.agents.onCpuThreshold ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                {Boolean(settings.agents.onCpuThreshold) && (
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>{t('notifications.agents.cpuThreshold', 'CPU阈值')}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.thresholdInput}
                        value={String(settings.agents.cpuThreshold || 90)}
                        onChangeText={(text) => {
                          // 确保输入为数字且在合理范围内
                          const value = parseInt(text);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            setSettings({
                              ...settings,
                              agents: {
                                ...settings.agents,
                                cpuThreshold: value
                              }
                            });
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.unitText}>%</Text>
                    </View>
                    <Text style={styles.thresholdDescription}>{t('notifications.agents.cpuThresholdDescription', '输入1到100之间的值，当CPU使用率超过此阈值时将触发告警')}</Text>
                  </View>
                )}
                
                {/* 内存阈值 */}
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.agents.onMemoryThreshold', '内存阈值告警')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.agents.onMemoryThresholdDescription', '当内存使用率超过阈值时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.agents.onMemoryThreshold)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        agents: {
                          ...settings.agents,
                          onMemoryThreshold: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.agents.onMemoryThreshold ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                {Boolean(settings.agents.onMemoryThreshold) && (
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>{t('notifications.agents.memoryThreshold', '内存阈值')}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.thresholdInput}
                        value={String(settings.agents.memoryThreshold || 85)}
                        onChangeText={(text) => {
                          // 确保输入为数字且在合理范围内
                          const value = parseInt(text);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            setSettings({
                              ...settings,
                              agents: {
                                ...settings.agents,
                                memoryThreshold: value
                              }
                            });
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.unitText}>%</Text>
                    </View>
                    <Text style={styles.thresholdDescription}>{t('notifications.agents.memoryThresholdDescription', '输入1到100之间的值，当内存使用率超过此阈值时将触发告警')}</Text>
                  </View>
                )}
                
                {/* 磁盘阈值 */}
                <View style={styles.settingItem}>
                  <View style={styles.settingItemContent}>
                    <Text style={styles.settingItemText}>{t('notifications.agents.onDiskThreshold', '磁盘阈值告警')}</Text>
                    <Text style={styles.settingItemDescription}>{t('notifications.agents.onDiskThresholdDescription', '当磁盘使用率超过阈值时发送通知。')}</Text>
                  </View>
                  <Switch
                    value={Boolean(settings.agents.onDiskThreshold)}
                    onValueChange={(value) => {
                      setSettings({
                        ...settings,
                        agents: {
                          ...settings.agents,
                          onDiskThreshold: value
                        }
                      });
                    }}
                    trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                    thumbColor={settings.agents.onDiskThreshold ? '#0066cc' : '#ccc'}
                  />
                </View>
                
                {Boolean(settings.agents.onDiskThreshold) && (
                  <View style={styles.thresholdContainer}>
                    <Text style={styles.thresholdLabel}>{t('notifications.agents.diskThreshold', '磁盘阈值')}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.thresholdInput}
                        value={String(settings.agents.diskThreshold || 90)}
                        onChangeText={(text) => {
                          // 确保输入为数字且在合理范围内
                          const value = parseInt(text);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            setSettings({
                              ...settings,
                              agents: {
                                ...settings.agents,
                                diskThreshold: value
                              }
                            });
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                      <Text style={styles.unitText}>%</Text>
                    </View>
                    <Text style={styles.thresholdDescription}>{t('notifications.agents.diskThresholdDescription', '输入1到100之间的值，当磁盘使用率超过此阈值时将触发告警')}</Text>
                  </View>
                )}
                
                <View style={styles.channelsSection}>
                  <Text style={styles.channelsSectionTitle}>{t('notifications.specificSettings.channels', '通知渠道')}</Text>
                  
                  {channels.length === 0 ? (
                    <Text style={styles.noChannelsText}>{t('notifications.channels.noChannels', '没有可用的通知渠道')}</Text>
                  ) : (
                    channels.map(channel => (
                      <View key={channel.id} style={styles.channelItem}>
                        <View style={styles.channelItemContent}>
                          <Text style={styles.channelItemName}>{channel.name}</Text>
                          <Text style={styles.channelItemType}>({t(`notifications.channels.type.${channel.type}`, channel.type === 'app' ? '应用内' : channel.type === 'email' ? '邮件' : channel.type === 'wechat' ? '微信' : channel.type)})</Text>
                        </View>
                        <Switch
                          value={settings.agents.channels?.includes(channel.id)}
                          onValueChange={(checked) => {
                            const updatedChannels = checked 
                              ? [...(settings.agents.channels || []), channel.id]
                              : (settings.agents.channels || []).filter(id => id !== channel.id);
                            
                            setSettings({
                              ...settings,
                              agents: {
                                ...settings.agents,
                                channels: updatedChannels
                              }
                            });
                          }}
                          trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                          thumbColor={settings.agents.channels?.includes(channel.id) ? '#0066cc' : '#ccc'}
                        />
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
          
          {/* 特定监控通知设置入口 */}
          <TouchableOpacity 
            style={styles.navigationCard}
            onPress={() => navigation.navigate('MonitorNotificationsScreen')}
          >
            <View style={styles.navigationCardContent}>
              <Ionicons name="options-outline" size={24} color="#0066cc" />
              <View style={styles.navigationCardTextContainer}>
                <Text style={styles.navigationCardTitle}>{t('notifications.monitorSettings.title', '监控项目通知')}</Text>
                <Text style={styles.navigationCardDescription}>{t('notifications.monitorSettings.description', '配置具体监控项目的通知规则')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          {/* 代理通知设置 */}
          <View style={styles.section}>
            {/* ... existing code ... */}
          </View>
          
          {/* 特定代理通知设置入口 */}
          <TouchableOpacity 
            style={styles.navigationCard}
            onPress={() => navigation.navigate('AgentNotificationsScreen')}
          >
            <View style={styles.navigationCardContent}>
              <Ionicons name="desktop-outline" size={24} color="#0066cc" />
              <View style={styles.navigationCardTextContainer}>
                <Text style={styles.navigationCardTitle}>{t('notifications.agentSettings.title', '代理通知设置')}</Text>
                <Text style={styles.navigationCardDescription}>{t('notifications.agentSettings.description', '配置具体代理的通知规则')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          {/* 通知渠道设置入口 */}
          <TouchableOpacity 
            style={styles.navigationCard}
            onPress={() => navigation.navigate('NotificationChannelsScreen')}
          >
            <View style={styles.navigationCardContent}>
              <Ionicons name="notifications-outline" size={24} color="#0066cc" />
              <View style={styles.navigationCardTextContainer}>
                <Text style={styles.navigationCardTitle}>{t('notifications.channelSettings.title', '通知渠道')}</Text>
                <Text style={styles.navigationCardDescription}>{t('notifications.channelSettings.description', '管理不同的通知渠道和配置')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0066cc',
    marginLeft: 10,
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
  safeArea: {
    height: 20,
  },
  thresholdContainer: {
    marginBottom: 16,
    marginTop: 8,
    paddingLeft: 12,
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  thresholdDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thresholdInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 70,
    textAlign: 'right',
  },
  unitText: {
    fontSize: 14,
    marginLeft: 6,
    color: '#333',
  },
  navigationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  navigationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navigationCardTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  navigationCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  navigationCardDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});

export default GlobalSettingsScreen; 