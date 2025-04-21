import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Flex, Heading, Text, Button, Card, Badge, Tabs, Grid, Avatar } from '@radix-ui/themes';
import { ArrowLeftIcon, Pencil1Icon, Cross2Icon, ReloadIcon, ClockIcon, InfoCircledIcon, LapTimerIcon, DesktopIcon, GlobeIcon, Link2Icon } from '@radix-ui/react-icons';
import * as Toast from '@radix-ui/react-toast';
import { getAgent, Agent, deleteAgent } from '../../api/agents';
import ClientResourceSection from '../../components/ClientResourceSection';
import { useTranslation } from 'react-i18next';

// 定义客户端状态颜色映射
const statusColors: Record<string, "red" | "green" | "yellow" | "gray"> = {
  active: "green",
  inactive: "red",
  connecting: "yellow",
  unknown: "gray"
};

// 客户端详情包含系统资源信息的扩展接口
interface AgentWithResources extends Agent {
  uptime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  networkRx?: number;
  networkTx?: number;
}

const AgentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<AgentWithResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { t } = useTranslation();

  const fetchAgentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AgentDetail: 正在获取客户端数据...');
      const agentResponse = await getAgent(Number(id));
      
      if (!agentResponse.success || !agentResponse.agent) {
        throw new Error(agentResponse.message || t('common.error.fetch'));
      }
      
      const agentData = agentResponse.agent;
      
      // 计算资源使用百分比
      const cpuUsage = agentData.cpu_usage || 0;
      const memoryUsage = agentData.memory_total && agentData.memory_used ? 
        Math.round((agentData.memory_used / agentData.memory_total) * 100) : 0;
      const diskUsage = agentData.disk_total && agentData.disk_used ? 
        Math.round((agentData.disk_used / agentData.disk_total) * 100) : 0;
      
      // 扩展客户端信息
      const agentWithDetails: AgentWithResources = {
        ...agentData,
        uptime: 0, // 没有真正的 uptime 数据，这里简化处理
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkRx: agentData.network_rx || 0, // 保持原始 KB/s 单位
        networkTx: agentData.network_tx || 0  // 保持原始 KB/s 单位
      };
      
      setAgent(agentWithDetails);
      setLoading(false);
    } catch (err) {
      console.error('AgentDetail: 获取客户端数据失败:', err);
      setError(err instanceof Error ? err.message : t('common.error.fetch'));
      setLoading(false);
    }
  };

  useEffect(() => {
    // 确保id是有效的数字
    if (id && !isNaN(Number(id))) {
      fetchAgentData();
      
      // 设置定时器，每分钟刷新一次数据
      const intervalId = setInterval(() => {
        console.log('AgentDetail: 自动刷新数据...');
        fetchAgentData();
      }, 60000); // 60000ms = 1分钟
      
      // 组件卸载时清除定时器
      return () => clearInterval(intervalId);
    } else if (id) {
      // 如果id存在但不是有效数字
      console.error(`无效的客户端ID: ${id}`);
      setError(t('agents.notFoundId', { id }));
      setLoading(false);
    }
  }, [id, t]);

  const handleRefresh = () => {
    fetchAgentData();
  };

  const formatUptime = (agent: AgentWithResources) => {
    // 如果有最后活动时间，计算从创建到最后活动的时间差
    if (agent.updated_at) {
      const lastSeenDate = new Date(agent.updated_at);
      const createdDate = new Date(agent.created_at);
      const diffMs = lastSeenDate.getTime() - createdDate.getTime();
      
      // 转换为天、小时、分钟
      const diffSec = Math.floor(diffMs / 1000);
      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      
      let result = '';
      if (days > 0) result += `${days}天 `;
      if (hours > 0 || days > 0) result += `${hours}小时 `;
      result += `${minutes}分钟`;
      
      return result;
    }
    
    // 如果没有活动时间记录，显示0小时
    return '0小时';
  };

  // 使用agent.updated_at代替last_seen作为上次活动时间
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return t('common.notFound');
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  const handleDelete = async () => {
    if (!confirm(t('agent.deleteConfirm'))) {
      return;
    }
    
    try {
      setDeleteLoading(true);
      // 显示正在删除的Toast消息
      setToastMessage(t('agent.deleting'));
      setToastType('success');
      setToastOpen(true);
      
      const response = await deleteAgent(Number(id));
      
      if (response.success) {
        // 显示删除成功的Toast消息
        setToastMessage(t('agent.deleteSuccess'));
        setToastType('success');
        setToastOpen(true);
        
        // 延长延迟时间，确保Toast消息有足够时间显示
        setTimeout(() => {
          navigate('/agents');
        }, 3000);
      } else {
        setToastMessage(response.message || t('agent.deleteError'));
        setToastType('error');
        setToastOpen(true);
      }
    } catch (error) {
      console.error('删除客户端失败:', error);
      setToastMessage(t('agent.deleteError'));
      setToastType('error');
      setToastOpen(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Flex className="loading-container">
          <Text>{t('agents.loadingDetail')}</Text>
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Flex className="error-container">
          <Card>
            <Flex direction="column" align="center" gap="4">
              <Heading size="6">{t('common.loadingError')}</Heading>
              <Text>{error}</Text>
              <Button onClick={() => navigate('/agents')}>{t('common.backToList')}</Button>
            </Flex>
          </Card>
        </Flex>
      </Box>
    );
  }

  if (!agent) {
    return (
      <Box>
        <Flex justify="center" align="center" style={{ minHeight: '60vh' }}>
          <Card>
            <Flex direction="column" align="center" gap="4">
              <Heading size="6">{t('agents.notFound')}</Heading>
              <Text>{t('agents.notFoundId', { id })}</Text>
              <Button onClick={() => navigate('/agents')}>{t('common.backToList')}</Button>
            </Flex>
          </Card>
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      <div className="page-container detail-page">
        <Flex justify="between" align="center" className="detail-header">
          <Flex align="center" gap="2">
            <Button variant="soft" size="1" onClick={() => navigate('/agents')}>
              <ArrowLeftIcon />
            </Button>
            <Heading size="6">{t('agent.details')}</Heading>
            <Badge color={statusColors[agent.status || 'inactive']}>
              {agent.status === 'active' ? t('agent.status.online') : t('agent.status.offline')}
            </Badge>
          </Flex>
          <Flex gap="2">
            <Button variant="soft" onClick={handleRefresh} disabled={loading}>
              <ReloadIcon />
              {t('common.refresh')}
            </Button>
            <Button variant="soft" onClick={() => navigate(`/agents/edit/${id}`)}>
              <Pencil1Icon />
              {t('agent.edit')}
            </Button>
            <Button 
              variant="soft" 
              color="red" 
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              <Cross2Icon />
              {deleteLoading ? t('common.deleting') : t('agent.delete')}
            </Button>
          </Flex>
        </Flex>

        <div className="detail-content">
          <Card mb="4">
            <Flex align="center" gap="4" mb="4">
              <Avatar size="5" fallback={agent.name.charAt(0)} color="indigo" />
              <Box>
                <Heading size="5">{agent.name}</Heading>
                <Text color="gray" size="2">
                  {agent.hostname ? agent.hostname : ''}
                  {agent.hostname && agent.ip_addresses ? (() => {
                    try {
                      const ipArray = JSON.parse(String(agent.ip_addresses));
                      return ipArray.length > 0 ? ` (${ipArray[0]})` : '';
                    } catch (e) {
                      return ` (${String(agent.ip_addresses)})`;
                    }
                  })() : ''}
                </Text>
              </Box>
            </Flex>

            <Grid columns={{ initial: '1', md: '2' }} gap="4">
              <Flex align="center" gap="2">
                <LapTimerIcon />
                <Text as="div" size="2" weight="bold">{t('agent.uptime')}:</Text>
                <Text as="div" size="2">{formatUptime(agent)}</Text>
              </Flex>
              
              <Flex align="center" gap="2">
                <ClockIcon />
                <Text as="div" size="2" weight="bold">{t('agent.lastUpdated')}:</Text>
                <Text as="div" size="2">{formatDateTime(agent.updated_at)}</Text>
              </Flex>
            </Grid>
          </Card>

          <Tabs.Root defaultValue="system">
            <Tabs.List>
              <Tabs.Trigger value="system">{t('agents.system')}</Tabs.Trigger>
            </Tabs.List>

            <Box pt="3">
              <Tabs.Content value="system">
                <Grid columns={{ initial: '1', md: '2' }} gap="4">
                  {/* 系统信息卡片 */}
                  <Card>
                    <Flex direction="column" gap="3">
                      <Heading size="3">{t('agent.systemInfo')}</Heading>
                      
                      <Box>
                        <Flex align="center" gap="2">
                          <DesktopIcon />
                          <Text as="div" size="2" weight="bold">{t('agent.os')}:</Text>
                          <Text as="div" size="2">{agent.os || t('common.notFound')}</Text>
                        </Flex>
                      </Box>
                      
                      <Box>
                        <Flex align="center" gap="2">
                          <InfoCircledIcon />
                          <Text as="div" size="2" weight="bold">{t('agent.version')}:</Text>
                          <Text as="div" size="2">{agent.version || t('common.notFound')}</Text>
                        </Flex>
                      </Box>
                      
                      <Box>
                        <Flex align="center" gap="2">
                          <GlobeIcon />
                          <Text as="div" size="2" weight="bold">{t('agent.hostname')}:</Text>
                          <Text as="div" size="2">{agent.hostname || t('common.notFound')}</Text>
                        </Flex>
                      </Box>
                      
                      <Box>
                        <Flex align="center" gap="2">
                          <Link2Icon />
                          <Text as="div" size="2" weight="bold">{t('agent.ipAddress')}:</Text>
                          {agent.ip_addresses ? (
                            (() => {
                              try {
                                const ipArray = JSON.parse(String(agent.ip_addresses));
                                if (Array.isArray(ipArray) && ipArray.length > 0) {
                                  return <Text as="div" size="2">{ipArray[0]}{ipArray.length > 1 ? ` (+${ipArray.length - 1})` : ''}</Text>;
                                } else {
                                  return <Text as="div" size="2">{String(agent.ip_addresses)}</Text>;
                                }
                              } catch (e) {
                                return <Text as="div" size="2">{String(agent.ip_addresses)}</Text>;
                              }
                            })()
                          ) : (
                            <Text as="div" size="2" color="gray">{t('common.unknown')}</Text>
                          )}
                        </Flex>
                      </Box>
                      
                      {/* 如果存在多个IP地址，展示完整列表 */}
                      {agent.ip_addresses && (() => {
                        try {
                          const ipArray = JSON.parse(String(agent.ip_addresses));
                          if (Array.isArray(ipArray) && ipArray.length > 1) {
                            return (
                              <Box pl="6" mt="1">
                                <Flex direction="column" gap="1">
                                  {ipArray.slice(1).map((ip, index) => (
                                    <Text key={index} size="2" color="gray">{ip}</Text>
                                  ))}
                                </Flex>
                              </Box>
                            );
                          }
                          return null;
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </Flex>
                  </Card>

                  {/* 系统资源信息卡片 */}
                  <Card>
                    <Flex direction="column" gap="4">
                      <Heading size="3">{t('agent.systemResources')}</Heading>
                      
                      <ClientResourceSection 
                        cpuUsage={agent.cpuUsage || 0}
                        memoryUsage={agent.memoryUsage || 0}
                        diskUsage={agent.diskUsage || 0}
                        networkRx={agent.networkRx || 0}
                        networkTx={agent.networkTx || 0}
                      />
                    </Flex>
                  </Card>
                </Grid>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </div>
        
        <Toast.Provider swipeDirection="right">
          <Toast.Root 
            className={`ToastRoot`} 
            open={toastOpen} 
            onOpenChange={setToastOpen}
            duration={3000}
            style={{ 
              backgroundColor: toastType === 'success' ? 'var(--green-9)' : 'var(--red-9)', 
              borderRadius: '8px',
              zIndex: 9999 
            }}
          >
            <Toast.Title className="ToastTitle">
              {toastType === 'success' ? t('common.success') : t('common.error')}
            </Toast.Title>
            <Toast.Description className="ToastDescription">
              {toastMessage}
            </Toast.Description>
            <Toast.Close className="ToastClose">
              <Cross2Icon />
            </Toast.Close>
          </Toast.Root>
          <Toast.Viewport className="ToastViewport" />
        </Toast.Provider>
      </div>
    </Box>
  );
};

export default AgentDetail; 