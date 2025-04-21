import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import agentService, { Agent } from '../../api/agents';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

const AgentsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all'); // all, active, inactive
  
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const data = await agentService.getAgents();
      setAgents(data);
      applyFilter(data, filter);
    } catch (error) {
      console.error('获取客户端列表失败', error);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilter = (data: Agent[], filterType: string) => {
    let result = [...data];
    
    switch (filterType) {
      case 'active':
        result = data.filter(a => a.status === 'active');
        break;
      case 'inactive':
        result = data.filter(a => a.status !== 'active');
        break;
      default:
        break;
    }
    
    setFilteredAgents(result);
  };
  
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    applyFilter(agents, newFilter);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAgents();
    setRefreshing(false);
  };
  
  useEffect(() => {
    fetchAgents();
  }, []);
  
  const getStatusColor = (status: string) => {
    return status === 'active' ? '#30c85e' : '#888';
  };
  
  const getStatusText = (status: string) => {
    return status === 'active' ? t('agents.status_active', '在线') : t('agents.status_inactive', '离线');
  };
  
  const getResourceColor = (usage: number) => {
    if (usage > 80) return '#f76363';
    if (usage > 60) return '#ffb224';
    return '#30c85e';
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('common.unknown', '未知');
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
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
  
  const handleDeleteAgent = (id: string) => {
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
          onPress: () => {
            // 实际项目中这里需要调用API删除
            console.log('删除客户端:', id);
            const numericId = parseInt(id, 10);
            const updatedAgents = agents.filter(a => String(a.id) !== id);
            setAgents(updatedAgents);
            applyFilter(updatedAgents, filter);
          }
        }
      ]
    );
  };
  
  const renderAgentItem = ({ item }: { item: Agent }) => (
    <TouchableOpacity
      style={styles.agentItem}
      onPress={() => navigation.navigate('AgentDetail', { agentId: item.id })}
    >
      <View style={styles.agentHeader}>
        <View style={styles.agentNameContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <View>
            <Text style={styles.agentName}>{item.name}</Text>
            <Text style={styles.hostname}>{item.hostname}</Text>
          </View>
        </View>
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {getStatusText(item.status)}
        </Text>
      </View>
      
      <View style={styles.systemInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="hardware-chip-outline" size={14} color="#666" />
          <Text style={styles.infoText}>{item.os || t('common.unknown', '未知')}</Text>
        </View>
        
        {item.ip_addresses && (
          <View style={styles.infoItem}>
            <Ionicons name="wifi-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{(() => {
              try {
                const ipArray = JSON.parse(String(item.ip_addresses));
                return Array.isArray(ipArray) && ipArray.length > 0 
                  ? ipArray.join(', ') // 显示所有 IP
                  : String(item.ip_addresses);
              } catch (e) {
                return String(item.ip_addresses);
              }
            })()}</Text>
          </View>
        )}
        
        <View style={styles.infoItem}>
          <Ionicons name="code-outline" size={14} color="#666" />
          <Text style={styles.infoText}>{t('agents.version', '版本')} {item.version || t('common.unknown', '未知')}</Text>
        </View>
      </View>
      
      {item.status === 'active' && (
        <View style={styles.resourcesContainer}>
          <View style={styles.resourceItem}>
            <Text style={styles.resourceLabel}>CPU</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${item.cpu_usage || 0}%`,
                    backgroundColor: getResourceColor(item.cpu_usage || 0)
                  }
                ]} 
              />
            </View>
            <Text style={styles.resourceValue}>{item.cpu_usage?.toFixed(1) || 0}%</Text>
          </View>
          
          <View style={styles.resourceItem}>
            <Text style={styles.resourceLabel}>{t('agents.memory', '内存')}</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${(item.memory_used && item.memory_total) ? 
                      (item.memory_used / item.memory_total * 100) : 0}%`,
                    backgroundColor: getResourceColor((item.memory_used && item.memory_total) ? 
                      (item.memory_used / item.memory_total * 100) : 0)
                  }
                ]} 
              />
            </View>
            <Text style={styles.resourceValue}>
              {(item.memory_used && item.memory_total) ? 
                ((item.memory_used / item.memory_total * 100).toFixed(1)) : 0}%
            </Text>
          </View>
          
          <View style={styles.resourceItem}>
            <Text style={styles.resourceLabel}>{t('agents.disk', '磁盘')}</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${(item.disk_used && item.disk_total) ? 
                      (item.disk_used / item.disk_total * 100) : 0}%`,
                    backgroundColor: getResourceColor((item.disk_used && item.disk_total) ? 
                      (item.disk_used / item.disk_total * 100) : 0)
                  }
                ]} 
              />
            </View>
            <Text style={styles.resourceValue}>
              {(item.disk_used && item.disk_total) ? 
                ((item.disk_used / item.disk_total * 100).toFixed(1)) : 0}%
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.agentFooter}>
        <Text style={styles.lastSeen}>
          {t('agents.lastSeen', '最后在线')}: {timeSince(item.updated_at)}
        </Text>
        
        <View style={styles.actionsContainer}>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteAgent(item.id.toString())}
          >
            <Ionicons name="trash-outline" size={16} color="#666" />
            <Text style={styles.actionText}>{t('common.delete', '删除')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  if (loading && !refreshing) {
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
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => handleFilterChange('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                {t('agents.filters.all', '全部')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
              onPress={() => handleFilterChange('active')}
            >
              <View style={[styles.statusIndicator, { backgroundColor: '#30c85e' }]} />
              <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
                {t('agents.status_active', '在线')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'inactive' && styles.filterButtonActive]}
              onPress={() => handleFilterChange('inactive')}
            >
              <View style={[styles.statusIndicator, { backgroundColor: '#888' }]} />
              <Text style={[styles.filterText, filter === 'inactive' && styles.filterTextActive]}>
                {t('agents.status_inactive', '离线')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateAgent')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {filteredAgents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {t('agents.noAgentsFound', '没有找到客户端')}
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateAgent')}
            >
              <Text style={styles.createButtonText}>
                {t('agents.createFirst', '创建第一个客户端')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredAgents}
            renderItem={renderAgentItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#e0f0ff',
  },
  filterText: {
    color: '#666',
  },
  filterTextActive: {
    color: '#0066cc',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  listContainer: {
    padding: 16,
  },
  agentItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  agentNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hostname: {
    fontSize: 12,
    color: '#888',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  systemInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  resourcesContainer: {
    marginBottom: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resourceLabel: {
    fontSize: 12,
    color: '#666',
    width: 40,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    flex: 1,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  resourceValue: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  agentFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  lastSeen: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#0066cc',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AgentsScreen;