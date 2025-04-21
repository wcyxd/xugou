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
  Modal,
  TextInput
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

// 引入API服务
import { getNotificationConfig, createNotificationChannel, updateNotificationChannel, deleteNotificationChannel } from '../../api/notifications';

// 类型定义
interface NotificationChannel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: any;
}

const channelTypes = [
  { id: 'app', name: '应用内' },
  { id: 'email', name: '邮件' },
  { id: 'wechat', name: '微信' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'slack', name: 'Slack' },
  { id: 'dingtalk', name: '钉钉' },
  { id: 'webhook', name: 'Webhook' }
];

const NotificationChannelsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 新增/编辑渠道的状态
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<NotificationChannel | null>(null);
  const [channelForm, setChannelForm] = useState({
    id: '',
    name: '',
    type: 'app',
    enabled: true,
    config: {
      email: '',
      webhook_url: '',
      token: '',
      chatId: ''
    }
  });
  
  // 加载通知渠道
  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('开始加载通知渠道...');
        
        // 获取通知配置
        const configResponse = await getNotificationConfig();
        if (configResponse.success && configResponse.data && configResponse.data.channels) {
          setChannels(configResponse.data.channels);
        } else {
          console.error('获取通知渠道失败:', configResponse.message);
          setError(configResponse.message || t('notifications.channelSettings.loadFailed'));
        }
      } catch (error) {
        console.error('加载通知渠道失败', error);
        setError(typeof error === 'string' ? error : t('common.unknownError'));
      } finally {
        setLoading(false);
      }
    };
    
    loadChannels();
  }, [t]);
  
  // 打开添加渠道模态框
  const handleAddChannel = () => {
    setChannelForm({
      id: '',
      name: '',
      type: 'app',
      enabled: true,
      config: {
        email: '',
        webhook_url: '',
        token: '',
        chatId: ''
      }
    });
    setIsAddModalVisible(true);
  };
  
  // 打开编辑渠道模态框
  const handleEditChannel = (channel: NotificationChannel) => {
    setCurrentChannel(channel);
    setChannelForm({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      enabled: channel.enabled,
      config: { ...channel.config }
    });
    setIsEditModalVisible(true);
  };
  
  // 保存渠道
  const handleSaveChannel = async () => {
    try {
      if (!channelForm.name.trim()) {
        Alert.alert(t('common.error'), t('notifications.channelSettings.nameRequired'));
        return;
      }
      
      // 根据渠道类型验证必要的配置
      if (channelForm.type === 'email' && !channelForm.config.email) {
        Alert.alert(t('common.error'), t('notifications.channelSettings.emailRequired'));
        return;
      }
      
      if (channelForm.type === 'webhook' && !channelForm.config.webhook_url) {
        Alert.alert(t('common.error'), t('notifications.channelSettings.webhookUrlRequired'));
        return;
      }
      
      if ((channelForm.type === 'telegram' || channelForm.type === 'slack') && 
          (!channelForm.config.token || !channelForm.config.chatId)) {
        Alert.alert(t('common.error'), t('notifications.channelSettings.tokenAndChatIdRequired'));
        return;
      }
      
      if (isAddModalVisible) {
        // 创建新渠道
        const response = await createNotificationChannel(channelForm);
        if (response.success) {
          Alert.alert(t('common.success'), t('notifications.channelSettings.addSuccess'));
          setIsAddModalVisible(false);
          
          // 刷新渠道列表
          const configResponse = await getNotificationConfig();
          if (configResponse.success && configResponse.data && configResponse.data.channels) {
            setChannels(configResponse.data.channels);
          }
        } else {
          Alert.alert(t('common.error'), response.message || t('notifications.channelSettings.addFailed'));
        }
      } else if (isEditModalVisible && currentChannel) {
        // 更新现有渠道
        const response = await updateNotificationChannel(currentChannel.id, channelForm);
        if (response.success) {
          Alert.alert(t('common.success'), t('notifications.channelSettings.updateSuccess'));
          setIsEditModalVisible(false);
          
          // 刷新渠道列表
          const configResponse = await getNotificationConfig();
          if (configResponse.success && configResponse.data && configResponse.data.channels) {
            setChannels(configResponse.data.channels);
          }
        } else {
          Alert.alert(t('common.error'), response.message || t('notifications.channelSettings.updateFailed'));
        }
      }
    } catch (error) {
      console.error('保存通知渠道失败', error);
      Alert.alert(t('common.error'), t('notifications.channelSettings.saveFailed'));
    }
  };
  
  // 删除渠道
  const handleDeleteChannel = (channel: NotificationChannel) => {
    Alert.alert(
      t('notifications.channelSettings.deleteConfirm'),
      t('notifications.channelSettings.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteNotificationChannel(channel.id);
              if (response.success) {
                Alert.alert(t('common.success'), t('notifications.channelSettings.deleteSuccess'));
                
                // 从列表中移除该渠道
                setChannels(channels.filter(c => c.id !== channel.id));
              } else {
                Alert.alert(t('common.error'), response.message || t('notifications.channelSettings.deleteFailed'));
              }
            } catch (error) {
              console.error('删除通知渠道失败', error);
              Alert.alert(t('common.error'), t('notifications.channelSettings.deleteFailed'));
            }
          }
        }
      ]
    );
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
          <Text style={styles.headerTitle}>{t('notifications.channelSettings.title', '通知渠道')}</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 通知渠道说明 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifications.channelSettings.title', '通知渠道')}</Text>
            <Text style={styles.sectionDescription}>
              {t('notifications.channelSettings.description', '配置不同的通知渠道，用于接收监控和系统的告警通知。')}
            </Text>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddChannel}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.addButtonText}>{t('notifications.channelSettings.add', '添加渠道')}</Text>
            </TouchableOpacity>
          </View>
          
          {/* 渠道列表 */}
          <View style={styles.section}>
            {channels.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={40} color="#999" />
                <Text style={styles.emptyText}>{t('notifications.channelSettings.noChannels', '没有可用的通知渠道')}</Text>
                <Text style={styles.emptySubText}>{t('notifications.channelSettings.addPrompt', '点击上方按钮添加一个渠道')}</Text>
              </View>
            ) : (
              channels.map(channel => (
                <View key={channel.id} style={styles.channelCard}>
                  <View style={styles.channelHeader}>
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>{channel.name}</Text>
                      <View style={styles.channelTypeBadge}>
                        <Text style={styles.channelTypeText}>
                          {t(`notifications.channelSettings.typeOptions.${channel.type}`, 
                             channel.type === 'app' ? '应用内' : 
                             channel.type === 'email' ? '邮件' : 
                             channel.type === 'wechat' ? '微信' : 
                             channel.type === 'telegram' ? 'Telegram' : 
                             channel.type === 'slack' ? 'Slack' : 
                             channel.type === 'dingtalk' ? '钉钉' : 
                             channel.type === 'webhook' ? 'Webhook' : 
                             channel.type)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.channelActions}>
                      <Switch
                        value={channel.enabled}
                        onValueChange={(enabled) => {
                          const updatedChannel = { ...channel, enabled };
                          updateNotificationChannel(channel.id, updatedChannel)
                            .then(response => {
                              if (response.success) {
                                // 更新本地状态
                                setChannels(
                                  channels.map(c => c.id === channel.id ? { ...c, enabled } : c)
                                );
                              } else {
                                Alert.alert(t('common.error'), response.message || t('notifications.channelSettings.updateFailed'));
                              }
                            })
                            .catch(error => {
                              console.error('更新通知渠道状态失败', error);
                              Alert.alert(t('common.error'), t('notifications.channelSettings.updateFailed'));
                            });
                        }}
                        trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                        thumbColor={channel.enabled ? '#0066cc' : '#ccc'}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.channelDetails}>
                    {channel.type === 'email' && channel.config.email && (
                      <Text style={styles.channelConfigText}>
                        <Text style={styles.channelConfigLabel}>{t('notifications.channelSettings.email')}:</Text> {channel.config.email}
                      </Text>
                    )}
                    
                    {channel.type === 'webhook' && channel.config.webhook_url && (
                      <Text style={styles.channelConfigText}>
                        <Text style={styles.channelConfigLabel}>{t('notifications.channelSettings.webhookUrl')}:</Text> {channel.config.webhook_url}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.channelFooter}>
                    <TouchableOpacity 
                      style={styles.channelButton}
                      onPress={() => handleEditChannel(channel)}
                    >
                      <Ionicons name="pencil-outline" size={16} color="#0066cc" />
                      <Text style={styles.channelButtonText}>{t('common.edit', '编辑')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.channelButton, styles.deleteButton]}
                      onPress={() => handleDeleteChannel(channel)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ff3b30" />
                      <Text style={[styles.channelButtonText, styles.deleteButtonText]}>{t('common.delete', '删除')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
          
          {/* 底部安全区域 */}
          <View style={styles.safeArea} />
        </ScrollView>
        
        {/* 添加渠道模态框 */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isAddModalVisible || isEditModalVisible}
          onRequestClose={() => {
            setIsAddModalVisible(false);
            setIsEditModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isAddModalVisible 
                    ? t('notifications.channelSettings.add', '添加渠道') 
                    : t('notifications.channelSettings.edit', '编辑渠道')}
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setIsAddModalVisible(false);
                    setIsEditModalVisible(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {/* 渠道名称 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('notifications.channelSettings.name', '渠道名称')}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={channelForm.name}
                    onChangeText={(text) => setChannelForm({ ...channelForm, name: text })}
                    placeholder={t('notifications.channelSettings.namePlaceholder', '请输入渠道名称')}
                  />
                </View>
                
                {/* 渠道类型 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('notifications.channelSettings.channelType', '渠道类型')}</Text>
                  <View style={styles.typeSelector}>
                    {channelTypes.map(type => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.typeButton,
                          channelForm.type === type.id && styles.typeButtonSelected
                        ]}
                        onPress={() => setChannelForm({ ...channelForm, type: type.id })}
                      >
                        <Text 
                          style={[
                            styles.typeButtonText,
                            channelForm.type === type.id && styles.typeButtonTextSelected
                          ]}
                        >
                          {t(`notifications.channelSettings.typeOptions.${type.id}`, type.name)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* 渠道配置 - 根据类型显示不同的配置选项 */}
                {channelForm.type === 'email' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{t('notifications.channelSettings.email', '邮箱地址')}</Text>
                    <TextInput
                      style={styles.formInput}
                      value={channelForm.config.email}
                      onChangeText={(text) => setChannelForm({
                        ...channelForm,
                        config: { ...channelForm.config, email: text }
                      })}
                      placeholder="example@example.com"
                      keyboardType="email-address"
                    />
                  </View>
                )}
                
                {channelForm.type === 'webhook' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{t('notifications.channelSettings.webhookUrl', 'Webhook URL')}</Text>
                    <TextInput
                      style={styles.formInput}
                      value={channelForm.config.webhook_url}
                      onChangeText={(text) => setChannelForm({
                        ...channelForm,
                        config: { ...channelForm.config, webhook_url: text }
                      })}
                      placeholder="https://example.com/webhook"
                    />
                  </View>
                )}
                
                {(channelForm.type === 'telegram' || channelForm.type === 'slack') && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>{t('notifications.channelSettings.token', 'Token')}</Text>
                      <TextInput
                        style={styles.formInput}
                        value={channelForm.config.token}
                        onChangeText={(text) => setChannelForm({
                          ...channelForm,
                          config: { ...channelForm.config, token: text }
                        })}
                        placeholder="bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      />
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>{t('notifications.channelSettings.chatId', 'Chat ID')}</Text>
                      <TextInput
                        style={styles.formInput}
                        value={channelForm.config.chatId}
                        onChangeText={(text) => setChannelForm({
                          ...channelForm,
                          config: { ...channelForm.config, chatId: text }
                        })}
                        placeholder="-1001234567890"
                      />
                    </View>
                  </>
                )}
                
                {/* 渠道状态 */}
                <View style={styles.formGroup}>
                  <View style={styles.enabledContainer}>
                    <Text style={styles.formLabel}>{t('notifications.channelSettings.enabled', '启用状态')}</Text>
                    <Switch
                      value={channelForm.enabled}
                      onValueChange={(enabled) => setChannelForm({ ...channelForm, enabled })}
                      trackColor={{ false: '#f0f0f0', true: '#bde0ff' }}
                      thumbColor={channelForm.enabled ? '#0066cc' : '#ccc'}
                    />
                  </View>
                </View>
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setIsAddModalVisible(false);
                    setIsEditModalVisible(false);
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel', '取消')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalSaveButton}
                  onPress={handleSaveChannel}
                >
                  <Text style={styles.modalSaveButtonText}>{t('common.save', '保存')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  channelCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  channelTypeBadge: {
    backgroundColor: '#e1f5fe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  channelTypeText: {
    fontSize: 11,
    color: '#0066cc',
  },
  channelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelDetails: {
    marginBottom: 12,
  },
  channelConfigText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  channelConfigLabel: {
    fontWeight: '500',
  },
  channelFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f0f7ff',
    marginRight: 8,
  },
  channelButtonText: {
    fontSize: 13,
    color: '#0066cc',
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#fff0f0',
  },
  deleteButtonText: {
    color: '#ff3b30',
  },
  safeArea: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  typeButtonSelected: {
    backgroundColor: '#e1f5fe',
    borderColor: '#0066cc',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#0066cc',
    fontWeight: '500',
  },
  enabledContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#0066cc',
    borderRadius: 6,
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NotificationChannelsScreen; 