import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import monitorService, { Monitor } from '../../api/monitors';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';

const MonitorsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [filteredMonitors, setFilteredMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all'); // all, up, down
  
  const fetchMonitors = async () => {
    try {
      setLoading(true);
      const data = await monitorService.getMonitors();
      setMonitors(data);
      applyFilter(data, filter);
    } catch (error) {
      console.error('获取监控列表失败', error);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilter = (data: Monitor[], filterType: string) => {
    let result = [...data];
    
    switch (filterType) {
      case 'up':
        result = data.filter(m => m.status === 'up');
        break;
      case 'down':
        result = data.filter(m => m.status === 'down');
        break;
      default:
        break;
    }
    
    setFilteredMonitors(result);
  };
  
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    applyFilter(monitors, newFilter);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMonitors();
    setRefreshing(false);
  };
  
  useEffect(() => {
    fetchMonitors();
  }, []);
  
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
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'up':
        return t('monitors.statusDetails.up', '正常');
      case 'down':
        return t('monitors.statusDetails.down', '故障');
      case 'pending':
        return t('monitors.statusDetails.pending', '等待');
      default:
        return status;
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return 'checkmark-circle';
      case 'down':
        return 'alert-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };
  
  const renderMonitorItem = ({ item }: { item: Monitor }) => (
    <TouchableOpacity
      style={styles.monitorItem}
      onPress={() => navigation.navigate('MonitorDetail', { monitorId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.monitorContent}>
        {/* 顶部信息区 */}
        <View style={styles.monitorHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.monitorName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            <View style={styles.statusIconWrapper}>
              <Ionicons 
                name={getStatusIcon(item.status)} 
                size={16} 
                color={getStatusColor(item.status)} 
              />
              <Text style={[styles.statusLabel, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{item.type?.toUpperCase() || 'HTTP'}</Text>
          </View>
        </View>
        
        {/* URL区域 */}
        <View style={styles.urlContainer}>
          <Ionicons name="link" size={14} color="#666" style={styles.urlIcon} />
          <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="tail">
            {item.url || '-'}
          </Text>
        </View>
        
        {/* 分隔线 */}
        <View style={styles.divider} />
        
        {/* 详细信息区 */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.uptime}%</Text>
            <Text style={styles.statLabel}>{t('monitors.uptime', '正常率')}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.response_time}</Text>
            <Text style={styles.statLabel}>{t('monitors.response_time', '响应时间(ms)')}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.method || '-'}</Text>
            <Text style={styles.statLabel}>{t('monitors.method', '请求方法')}</Text>
          </View>
        </View>
        
        {/* 最后检查时间 */}
        <View style={styles.footerContainer}>
          <Ionicons name="time-outline" size={14} color="#888" />
          <Text style={styles.lastCheckText}>
            {t('monitors.last_check', '最后检查')}: {formatDate(item.last_checked)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const keyExtractor = (item: Monitor) => item.id.toString();
  
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
                {t('monitors.filters.all', '全部')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'up' && styles.filterButtonActive]}
              onPress={() => handleFilterChange('up')}
            >
              <View style={[styles.statusIndicator, { backgroundColor: '#30c85e' }]} />
              <Text style={[styles.filterText, filter === 'up' && styles.filterTextActive]}>
                {t('monitors.statusDetails.up', '正常')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'down' && styles.filterButtonActive]}
              onPress={() => handleFilterChange('down')}
            >
              <View style={[styles.statusIndicator, { backgroundColor: '#f76363' }]} />
              <Text style={[styles.filterText, filter === 'down' && styles.filterTextActive]}>
                {t('monitors.statusDetails.down', '故障')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateMonitor')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {filteredMonitors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {t('monitors.noMonitorsFound', '没有找到监控项')}
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateMonitor')}
            >
              <Text style={styles.createButtonText}>
                {t('monitors.createFirst', '创建第一个监控')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredMonitors}
            renderItem={renderMonitorItem}
            keyExtractor={keyExtractor}
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
    backgroundColor: '#f7f9fc',
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
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f5f7fa',
  },
  filterButtonActive: {
    backgroundColor: '#e0f0ff',
  },
  filterText: {
    fontSize: 13,
    color: '#555',
  },
  filterTextActive: {
    color: '#0066cc',
    fontWeight: '600',
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
  monitorItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  monitorContent: {
    flex: 1,
    padding: 16,
  },
  monitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  monitorName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  typeTag: {
    backgroundColor: '#f0f4f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5a6c85',
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  urlIcon: {
    marginRight: 6,
  },
  urlText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eeeeee',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  lastCheckText: {
    fontSize: 12,
    color: '#888',
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
});

export default MonitorsScreen; 