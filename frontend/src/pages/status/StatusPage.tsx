import { useState, useEffect, useRef } from 'react';
import { Box, Flex, Heading, Text, Card, Grid, Badge, Theme } from '@radix-ui/themes';
import { getStatusPageData, StatusAgent } from '../../api/status';
import { Monitor } from '../../api/monitors';
import ClientResourceSection from '../../components/ClientResourceSection';
import MonitorCard from '../../components/MonitorCard';
import { useTranslation } from 'react-i18next';

// 定义一个样式常量用于卡片
const cardStyles = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
} as const;

// 卡片悬停样式
const cardHoverStyles = {
  transform: 'translateY(-2px)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
} as const;

const StatusPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<{monitors: Monitor[], agents: StatusAgent[]}>({
    monitors: [],
    agents: []
  });
  const [loading, setLoading] = useState(false);
  const [pageTitle, setPageTitle] = useState<string>(t('statusPage.title'));
  const [pageDescription, setPageDescription] = useState<string>(t('statusPage.allOperational'));
  const [error, setError] = useState<string | null>(null);
  const requestInProgressRef = useRef(false); // 新增：跟踪请求是否正在进行中
  const fetchControllerRef = useRef<AbortController | null>(null); // 新增：用于取消重复请求

  // 从API获取数据
  useEffect(() => {
    // 创建数据获取函数
    const fetchData = async () => {
      // 如果已经有请求在进行中，取消它
      if (requestInProgressRef.current && fetchControllerRef.current) {
        console.log(t('statusPage.cancelPreviousRequest'));
        fetchControllerRef.current.abort();
      }
      
      // 标记新请求开始
      requestInProgressRef.current = true;
      fetchControllerRef.current = new AbortController();
      const signal = fetchControllerRef.current.signal;
      
      try {
        setLoading(true);
        console.log(t('statusPage.fetchingData'));
        const response = await getStatusPageData();
        console.log(t('statusPage.dataResponse'), response);
        
        // 如果请求被取消，则退出
        if (signal.aborted) {
          console.log(t('statusPage.requestCancelled'));
          return;
        }
        
        if (response.success && response.data) {
          const statusData = response.data;
          console.log(t('statusPage.processingData'), statusData);
          
          // 设置页面标题和描述
          setPageTitle(statusData.title || t('statusPage.title'));
          setPageDescription(statusData.description || t('statusPage.allOperational'));
          
          setData({
            monitors: statusData.monitors || [],
            agents: statusData.agents || []
          });
        } else {
          console.error(t('statusPage.fetchError'), response.message);
          setError(response.message || t('statusPage.fetchError'));
        }
      } catch (err: any) {
        // 忽略被中止的请求错误
        if (err.name !== 'AbortError') {
          console.error(t('statusPage.fetchError'), err);
          setError(t('statusPage.fetchError'));
        }
      } finally {
        // 标记请求结束
        requestInProgressRef.current = false;
        fetchControllerRef.current = null;
        setLoading(false);
      }
    };
    
    // 执行初始数据获取
    fetchData();
    
    // 设置定时刷新，每分钟更新数据
    const intervalId = setInterval(() => {
      console.log(t('statusPage.autoRefresh'));
      fetchData();
    }, 60000); // 60000ms = 1分钟
    
    // 组件卸载时清除定时器和取消请求
    return () => {
      console.log(t('statusPage.componentUnmount'));
      clearInterval(intervalId);
      
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, [t]); // 依赖于 t 函数

  // 错误显示
  if (error) {
    return (
      <Theme appearance="light">
        <Box>
          <div className="page-container">
            <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
              <Text size="3" style={{ color: 'var(--red-9)' }}>{error}</Text>
            </Flex>
          </div>
        </Box>
      </Theme>
    );
  }

  if (loading) {
    return (
      <Theme appearance="light">
        <Box>
          <div className="page-container">
            <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
              <Text size="3">{t('common.loading')}</Text>
            </Flex>
          </div>
        </Box>
      </Theme>
    );
  }

  return (
    <Theme appearance="light">
      <Box>
        <div className="page-container">
          {/* 状态页标题区域 */}
          <Flex direction="column" align="center" justify="center" py="9" gap="5">
            <Heading size="9" align="center">{pageTitle}</Heading>
            <Text size="5" align="center" style={{ maxWidth: '800px' }}>
              {pageDescription}
            </Text>
            <Flex gap="2" mt="2">
              <Badge size="2">{t('statusPage.lastUpdated')}: {t('statusPage.justNow')}</Badge>
            </Flex>
          </Flex>
          
          {/* API服务状态 */}
          {data.monitors.length > 0 && (
            <Box py="6">
              <Heading size="5" mb="4">{t('statusPage.apiServices')}</Heading>
              <Grid columns={{ initial: '1', md: '2' }} gap="4">
                {data.monitors.map(monitor => (
                  <MonitorCard key={monitor.id} monitor={monitor} />
                ))}
              </Grid>
            </Box>
          )}
          
          {/* 客户端监控状态 */}
          {data.agents.length > 0 && (
            <Box py="6">
              <Heading size="5" mb="4">{t('statusPage.agentStatus')}</Heading>
              <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="4">
                {data.agents.map(agent => (
                  <Card 
                    key={agent.id} 
                    style={cardStyles}
                    className="agent-card"
                    onMouseEnter={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      Object.assign(target.style, cardHoverStyles);
                    }}
                    onMouseLeave={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      target.style.transform = '';
                      target.style.boxShadow = cardStyles.boxShadow as string;
                    }}
                  >
                    {/* 状态指示器 */}
                    <Box style={{ 
                      position: 'absolute', 
                      top: '0', 
                      left: '0', 
                      width: '4px', 
                      height: '100%', 
                      background: agent.status === 'active' 
                        ? 'linear-gradient(to bottom, var(--green-9), var(--cyan-9))' 
                        : 'linear-gradient(to bottom, var(--red-9), var(--amber-9))' 
                    }} />
                    
                    <Box p="4" pl="5">
                      <Flex justify="between" align="start" mb="3">
                        <Box>
                          <Heading as="h3" size="3" mb="1">{agent.name}</Heading>
                          <Text as="div" size="2" color="gray">
                            {agent.hostname}
                          </Text>
                        </Box>
                        <Badge 
                          color={agent.status === 'active' ? 'green' : 'red'}
                          style={{
                            padding: '0 8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Box 
                            style={{
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              backgroundColor: agent.status === 'active' ? 'var(--green-9)' : 'var(--red-9)',
                              animation: agent.status === 'active' ? 'pulse 2s infinite' : 'none'
                            }}
                          />
                          {agent.status === 'active' ? t('agent.status.online') : t('agent.status.offline')}
                        </Badge>
                      </Flex>
                      
                      {/* 系统资源使用情况 */}
                      <Box mt="3">
                        {/* 数据调试信息 */}
                        {(() => { console.log(t('statusPage.displayResourceData'), agent.name, agent.cpu, agent.memory); return null; })()}
                        {(agent.cpu !== undefined && agent.memory !== undefined) ? (
                          <ClientResourceSection 
                            cpuUsage={agent.cpu || 0}
                            memoryUsage={agent.memory || 0}
                            diskUsage={agent.disk || 0}
                            networkRx={agent.network_rx || 0}
                            networkTx={agent.network_tx || 0}
                          />
                        ) : (
                          <Box style={{ padding: '8px', backgroundColor: 'var(--gray-2)', borderRadius: '8px' }}>
                            <Heading size="2" mb="2">{t('agent.systemInfo')}</Heading>
                            <Grid columns="2" gap="2">
                              <Text size="2" style={{ color: 'var(--gray-9)' }}>{t('agent.os')}:</Text>
                              <Text size="2">{agent.os || t('common.unknown')}</Text>
                              
                              <Text size="2" style={{ color: 'var(--gray-9)' }}>{t('agent.version')}:</Text>
                              <Text size="2">{agent.version || t('common.unknown')}</Text>
                              
                              <Text size="2" style={{ color: 'var(--gray-9)' }}>{t('agent.hostname')}:</Text>
                              <Text size="2">{agent.hostname || t('common.unknown')}</Text>
                            </Grid>
                          </Box>
                        )}
                      </Box>
                      
                      {/* 最后活动时间 */}
                      {agent.updated_at && (
                        <Text size="2" color="gray">
                          {t('agent.lastUpdated')}: {new Date(agent.updated_at).toLocaleString()}
                        </Text>
                      )}
                    </Box>
                  </Card>
                ))}
              </Grid>
            </Box>
          )}
        </div>
      </Box>
    </Theme>
  );
};

export default StatusPage; 