import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  StyleSheet, 
  View, 
  Text,
  TouchableOpacity,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// 导入API服务
import monitorService, { Monitor } from '../../api/monitors';
import agentService, { Agent } from '../../api/agents';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取监控列表
      const monitorsData = await monitorService.getMonitors();
      setMonitors(monitorsData);
      
      // 获取客户端列表
      const agentsData = await agentService.getAgents();
      setAgents(agentsData);
    } catch (error) {
      console.error('获取仪表盘数据失败', error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // 计算统计信息
  const totalMonitors = monitors.length;
  const activeMonitors = monitors.filter(m => m.active !== undefined ? m.active : true).length;
  const downMonitors = monitors.filter(m => m.status === 'down').length;
  
  const totalAgents = agents.length;
  const onlineAgents = agents.filter(a => a.status === 'active' || a.status === 'online').length;
  const offlineAgents = agents.filter(a => a.status !== 'active' && a.status !== 'online').length;
  
  // 计算平均可用率，兼容可能缺少uptime属性的情况
  const avgUptime = monitors.length > 0
    ? monitors.reduce((acc, m) => acc + (m.uptime !== undefined ? m.uptime : 0), 0) / monitors.length
    : 0;
  
  // 计算平均响应时间，兼容可能缺少response_time属性的情况
  const avgResponseTime = monitors.length > 0
    ? Math.round(monitors.reduce((acc, m) => {
        const responseTime = m.response_time !== undefined ? m.response_time : 
                            (m.responseTime !== undefined ? m.responseTime : 0);
        return acc + responseTime;
      }, 0) / monitors.length)
    : 0;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return '#30c85e';
      case 'down':
        return '#f76363';
      case 'pending':
        return '#ffb224';
      default:
        return '#888';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'active':
      case 'online':
        return 'checkmark-circle';
      case 'down':
        return 'alert-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };
  
  // 获取当前日期格式化字符串
  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return now.toLocaleDateString(undefined, options);
  };
  
  if (loading && !refreshing) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>{t('common.loading', '加载中...')}</Text>
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
        <View style={styles.content}>
          {/* 顶部欢迎区域 */}
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeText}>{t('dashboard.welcome', '欢迎回来')}</Text>
              <Text style={styles.dateText}>{getCurrentDate()}</Text>
            </View>
            <View style={styles.refreshButton}>
              <TouchableOpacity onPress={onRefresh}>
                <Ionicons name="refresh" size={22} color="#0066cc" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 摘要卡片 */}
          <View style={styles.summaryContainer}>
            {/* 监控统计卡片 */}
            <View style={styles.statisticsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="desktop-outline" size={20} color="#0066cc" />
                <Text style={styles.cardHeaderTitle}>{t('dashboard.monitorStats', '监控统计')}</Text>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItemLarge}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="globe-outline" size={20} color="#0066cc" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValueLarge}>{totalMonitors}</Text>
                    <Text style={styles.statLabelSmall}>{t('dashboard.totalMonitors', '总监控')}</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconSmall, { backgroundColor: '#e6f7ee' }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#30c85e" />
                    </View>
                    <Text style={styles.statValue}>{activeMonitors}</Text>
                    <Text style={styles.statLabel}>{t('dashboard.activeMonitors', '活跃')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconSmall, { backgroundColor: '#ffe8e8' }]}>
                      <Ionicons name="alert-circle" size={16} color="#f76363" />
                    </View>
                    <Text style={[styles.statValue, { color: '#f76363' }]}>{downMonitors}</Text>
                    <Text style={styles.statLabel}>{t('dashboard.downMonitors', '故障')}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* 客户端统计卡片 */}
            <View style={styles.statisticsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="server-outline" size={20} color="#0066cc" />
                <Text style={styles.cardHeaderTitle}>{t('dashboard.agentStats', '客户端统计')}</Text>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItemLarge}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="hardware-chip-outline" size={20} color="#0066cc" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValueLarge}>{totalAgents}</Text>
                    <Text style={styles.statLabelSmall}>{t('dashboard.totalAgents', '总客户端')}</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconSmall, { backgroundColor: '#e6f7ee' }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#30c85e" />
                    </View>
                    <Text style={[styles.statValue, { color: '#30c85e' }]}>{onlineAgents}</Text>
                    <Text style={styles.statLabel}>{t('dashboard.onlineAgents', '在线')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconSmall, { backgroundColor: '#fff4e5' }]}>
                      <Ionicons 
                        name={"alert-circle" as any} 
                        size={16} 
                        color="#ff9933" 
                      />
                    </View>
                    <Text style={[styles.statValue, { color: '#ff9933' }]}>{offlineAgents}</Text>
                    <Text style={styles.statLabel}>{t('dashboard.offlineAgents', '离线')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
          
          {/* 监控状态 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="eye-outline" size={20} color="#0066cc" />
              <Text style={styles.cardHeaderTitle}>{t('navigation.monitors', '监控状态')}</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Monitors')}
              >
                <Text style={styles.viewAllButtonText}>{t('common.viewAll', '查看全部')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#0066cc" />
              </TouchableOpacity>
            </View>
            
            {monitors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={36} color="#ccc" />
                <Text style={styles.emptyText}>{t('common.notFound', '没有找到数据')}</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {monitors.slice(0, 5).map((monitor) => (
                  <TouchableOpacity 
                    key={monitor.id} 
                    style={styles.itemContainer}
                    onPress={() => navigation.navigate('MonitorDetail', { monitorId: monitor.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[styles.statusIconContainer, { backgroundColor: `${getStatusColor(monitor.status)}20` }]}>
                        <Ionicons name={getStatusIcon(monitor.status)} size={18} color={getStatusColor(monitor.status)} />
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={styles.itemName} numberOfLines={1}>{monitor.name}</Text>
                        <Text style={styles.itemDetail} numberOfLines={1}>{monitor.url || '-'}</Text>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemStatus, { color: getStatusColor(monitor.status) }]}>
                        {t(`monitors.status_${monitor.status}`, monitor.status === 'up' ? '正常' : '故障')}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* 客户端状态 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="server-outline" size={20} color="#0066cc" />
              <Text style={styles.cardHeaderTitle}>{t('navigation.agents', '客户端状态')}</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Agents')}
              >
                <Text style={styles.viewAllButtonText}>{t('common.viewAll', '查看全部')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#0066cc" />
              </TouchableOpacity>
            </View>
            
            {agents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={36} color="#ccc" />
                <Text style={styles.emptyText}>{t('common.notFound', '没有找到数据')}</Text>
              </View>
            ) : (
              <View style={styles.itemList}>
                {agents.slice(0, 5).map((agent) => (
                  <TouchableOpacity 
                    key={agent.id} 
                    style={styles.itemContainer}
                    onPress={() => navigation.navigate('AgentDetail', { agentId: agent.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      <View style={[
                        styles.statusIconContainer, 
                        { backgroundColor: agent.status === 'active' ? '#e6f7ee' : '#f5f5f5' }
                      ]}>
                        <Ionicons 
                          name={agent.status === 'active' ? 'checkmark-circle' as any : 'alert-circle'} 
                          size={18} 
                          color={agent.status === 'active' ? '#30c85e' : '#888'} 
                        />
                      </View>
                      <View style={styles.itemTextContainer}>
                        <Text style={styles.itemName} numberOfLines={1}>{agent.name}</Text>
                        <Text style={styles.itemDetail} numberOfLines={1}>
                          {agent.hostname || t('agents.unknownHost', '未知主机')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[
                        styles.itemStatus, 
                        { color: agent.status === 'active' ? '#30c85e' : '#888' }
                      ]}>
                        {t(`agents.status_${agent.status}`, agent.status === 'active' ? '在线' : '离线')}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  content: {
    padding: 16,
  },
  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statisticsCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  statsContainer: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statItemLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f4f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabelSmall: {
    fontSize: 12,
    color: '#666',
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
  },
  statIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  card: {
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f4f9',
    borderRadius: 12,
  },
  viewAllButtonText: {
    fontSize: 12,
    color: '#0066cc',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  itemList: {
    marginTop: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 12,
    color: '#888',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
});

export default DashboardScreen; 