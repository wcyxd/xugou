import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import agentService, { Agent } from '../../api/agents';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

// 资源历史记录
interface ResourceHistory {
  id: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}

// 路由参数类型
type AgentDetailRouteProp = RouteProp<{ AgentDetail: { agentId: string } }, 'AgentDetail'>;

const AgentDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<AgentDetailRouteProp>();
  const { agentId } = route.params;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [resourceHistory, setResourceHistory] = useState<ResourceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 加载客户端详情
  const fetchData = async () => {
    try {
      console.log('AgentDetailScreen: 正在获取客户端数据...');
      setError(null);
      
      const agentResponse = await agentService.getAgentById(agentId);
      
      if (!agentResponse.success || !agentResponse.agent) {
        throw new Error(agentResponse.message || t('common.error.fetch', '获取数据失败'));
      }
      
      const agentData = agentResponse.agent;
      
      // 计算资源使用百分比（如果后端未计算）
      if (agentData.memory_total && agentData.memory_used && agentData.memory_usage === undefined) {
        agentData.memory_usage = (agentData.memory_used / agentData.memory_total) * 100;
      }
      
      if (agentData.disk_total && agentData.disk_used && agentData.disk_usage === undefined) {
        agentData.disk_usage = (agentData.disk_used / agentData.disk_total) * 100;
      }
      
      setAgent(agentData);
      
      // 后续可以添加获取历史资源数据的API调用
      // 暂时不获取resourceHistory数据，因为API似乎还没有提供
    } catch (error) {
      console.error('获取客户端详情失败', error);
      setError(error instanceof Error ? error.message : t('agents.fetchDetailFailed', '获取客户端详情失败'));
      Alert.alert(t('common.error', '错误'), t('agents.fetchDetailFailed', '获取客户端详情失败'));
    } finally {
      setLoading(false);
    }
  };
  
  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  // 删除客户端
  const handleDelete = () => {
    Alert.alert(
      t('agents.deleteTitle', '删除客户端'),
      t('agents.deleteConfirmation', '您确定要删除此客户端吗？此操作不可撤销。'),
      [
        {
          text: t('common.cancel', '取消'),
          style: 'cancel'
        },
        {
          text: t('common.delete', '删除'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await agentService.deleteAgent(agentId);
              
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert(t('common.error', '错误'), result.message || t('agents.deleteFailed', '删除客户端失败'));
              }
            } catch (error) {
              console.error('删除客户端失败', error);
              Alert.alert(t('common.error', '错误'), t('agents.deleteFailed', '删除客户端失败'));
            }
          }
        }
      ]
    );
  };
  
  // 获取状态颜色
  const getStatusColor = (status: string) => {
    return status === 'active' ? '#30c85e' : '#888';
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    return status === 'active' 
      ? t('agents.status_active', '在线') 
      : t('agents.status_inactive', '离线');
  };
  
  // 获取资源颜色
  const getResourceColor = (usage: number) => {
    if (usage > 80) return '#f76363';
    if (usage > 60) return '#ffb224';
    return '#30c85e';
  };
  
  // 格式化网络流量单位
  const formatNetworkSpeed = (value?: number): string => {
    if (value === undefined) return t('common.unknown', '未知');
    
    // 当值小于 1024 KB/s 时，显示 KB/s
    if (value < 1024) {
      return `${value.toFixed(1)} KB/s`;
    } 
    // 当值大于等于 1024 KB/s 时，显示 MB/s
    else {
      const valueMB = value / 1024;
      return `${valueMB.toFixed(1)} MB/s`;
    }
  };
  
  // 计算内存使用百分比
  const calculateMemoryUsage = (agent: Agent): number => {
    if (agent.memory_usage !== undefined) {
      return agent.memory_usage;
    }
    
    if (agent.memory_total && agent.memory_used) {
      return (agent.memory_used / agent.memory_total) * 100;
    }
    
    return 0;
  };
  
  // 计算磁盘使用百分比
  const calculateDiskUsage = (agent: Agent): number => {
    if (agent.disk_usage !== undefined) {
      return agent.disk_usage;
    }
    
    if (agent.disk_total && agent.disk_used) {
      return (agent.disk_used / agent.disk_total) * 100;
    }
    
    return 0;
  };
  
  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.unknown', '未知');
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // 格式化时间差
  const timeSince = (dateString?: string) => {
    if (!dateString) return t('common.unknown', '未知');
    
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 86400; // days
    if (interval > 1) {
      return Math.floor(interval) + t('common.time.daysAgo', '天前');
    }
    
    interval = seconds / 3600; // hours
    if (interval > 1) {
      return Math.floor(interval) + t('common.time.hoursAgo', '小时前');
    }
    
    interval = seconds / 60; // minutes
    if (interval > 1) {
      return Math.floor(interval) + t('common.time.minutesAgo', '分钟前');
    }
    
    return Math.floor(seconds) + t('common.time.secondsAgo', '秒前');
  };
  
  // 格式化内存/磁盘大小
  const formatSize = (sizeInMB?: number) => {
    if (!sizeInMB) return t('common.unknown', '未知');
    
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(0)} MB`;
    } else {
      const sizeInGB = sizeInMB / 1024;
      return `${sizeInGB.toFixed(1)} GB`;
    }
  };
  
  // 组件挂载时加载数据
  useEffect(() => {
    fetchData();
    
    // 设置定时器，每分钟刷新一次数据
    const intervalId = setInterval(() => {
      console.log('AgentDetailScreen: 自动刷新数据...');
      fetchData();
    }, 60000); // 60000ms = 1分钟
    
    // 组件卸载时清除定时器
    return () => clearInterval(intervalId);
  }, [agentId]);
  
  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      </SafeAreaWrapper>
    );
  }
  
  if (error && !agent) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#f76363" />
          <Text style={styles.errorText}>
            {error || t('agents.notFound', '找不到客户端信息')}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>{t('common.goBack', '返回')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }
  
  if (!agent) {
    return (
      <SafeAreaWrapper>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#f76363" />
          <Text style={styles.errorText}>
            {t('agents.notFound', '找不到客户端信息')}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>{t('common.goBack', '返回')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }
  
  return (
    <SafeAreaWrapper>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 头部信息 */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(agent.status) }]} />
            <View>
              <Text style={styles.title}>{agent.name}</Text>
              <Text style={styles.hostname}>{agent.hostname}</Text>
            </View>
          </View>
          <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(agent.status) }]}>
            {getStatusText(agent.status)}
          </Text>
        </View>
        
        {/* 基本信息卡片 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('agents.basicInfo', '基本信息')}</Text>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('agents.hostname', '主机名')}:</Text>
            <Text style={styles.detailValue}>{agent.hostname || t('common.unknown', '未知')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('agents.ipAddress', 'IP地址')}:</Text>
            {agent.ip_addresses ? (
              <View>
                {(() => {
                  try {
                    const ipArray = JSON.parse(String(agent.ip_addresses));
                    return Array.isArray(ipArray) ? 
                      ipArray.map((ip: string, index: number) => (
                        <Text key={index} style={styles.detailValue}>{ip}</Text>
                      ))
                      : <Text style={styles.detailValue}>{String(agent.ip_addresses)}</Text>;
                  } catch (e) {
                    return <Text style={styles.detailValue}>{String(agent.ip_addresses)}</Text>;
                  }
                })()}
              </View>
            ) : (
              <Text style={styles.detailValue}>{t('common.unknown', 'unknown')}</Text>
            )}
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('agents.os', '操作系统')}:</Text>
            <Text style={styles.detailValue}>{agent.operating_system || agent.os || t('common.unknown', '未知')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('agents.version', '版本')}:</Text>
            <Text style={styles.detailValue}>{agent.version || t('common.unknown', '未知')}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('agents.lastSeen', '最后在线')}:</Text>
            <Text style={styles.detailValue}>{timeSince(agent.last_seen || agent.updated_at)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('agents.created', '安装时间')}:</Text>
            <Text style={styles.detailValue}>{formatDate(agent.created_at)}</Text>
          </View>
        </View>
        
        {/* 资源使用情况 */}
        {agent.status === 'active' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('agents.resources', '资源使用情况')}</Text>
            
            <View style={styles.resourceItem}>
              <View style={styles.resourceHeader}>
                <Text style={styles.resourceLabel}>CPU</Text>
                <Text style={[
                  styles.resourceValue, 
                  { color: getResourceColor(agent.cpu_usage || 0) }
                ]}>
                  {agent.cpu_usage?.toFixed(1) || 0}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${agent.cpu_usage || 0}%`,
                      backgroundColor: getResourceColor(agent.cpu_usage || 0)
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.resourceItem}>
              <View style={styles.resourceHeader}>
                <Text style={styles.resourceLabel}>{t('agents.memory', '内存')}</Text>
                <Text style={[
                  styles.resourceValue, 
                  { color: getResourceColor(calculateMemoryUsage(agent)) }
                ]}>
                  {calculateMemoryUsage(agent).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${calculateMemoryUsage(agent)}%`,
                      backgroundColor: getResourceColor(calculateMemoryUsage(agent))
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.resourceItem}>
              <View style={styles.resourceHeader}>
                <Text style={styles.resourceLabel}>{t('agents.disk', '磁盘')}</Text>
                <Text style={[
                  styles.resourceValue, 
                  { color: getResourceColor(calculateDiskUsage(agent)) }
                ]}>
                  {calculateDiskUsage(agent).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${calculateDiskUsage(agent)}%`,
                      backgroundColor: getResourceColor(calculateDiskUsage(agent))
                    }
                  ]} 
                />
              </View>
            </View>
            
            {agent.network_rx !== undefined && agent.network_tx !== undefined && (
              <View style={styles.networkContainer}>
                <View style={styles.networkItem}>
                  <Ionicons name="arrow-down-outline" size={16} color="#30c85e" />
                  <Text style={styles.networkLabel}>{t('agents.networkRx', '下载')}</Text>
                  <Text style={styles.networkValue}>{formatNetworkSpeed(agent.network_rx)}</Text>
                </View>
                <View style={styles.networkItem}>
                  <Ionicons name="arrow-up-outline" size={16} color="#0066cc" />
                  <Text style={styles.networkLabel}>{t('agents.networkTx', '上传')}</Text>
                  <Text style={styles.networkValue}>{formatNetworkSpeed(agent.network_tx)}</Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* 操作按钮 */}
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>
              {t('common.delete', '删除')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  hostname: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 90,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  resourceItem: {
    marginBottom: 16,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resourceLabel: {
    fontSize: 14,
    color: '#666',
  },
  resourceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  networkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  networkValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'white',
    marginLeft: 8,
  },
  dangerButton: {
    backgroundColor: '#f76363',
  },
});

export default AgentDetailScreen; 