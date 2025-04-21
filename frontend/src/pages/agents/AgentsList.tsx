import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, Heading, Text, Button, Card, Table, Badge, IconButton, Dialog, Grid, Tabs } from '@radix-ui/themes';
import { PlusIcon, Cross2Icon, Pencil1Icon, InfoCircledIcon, ReloadIcon, LayoutIcon, ViewGridIcon } from '@radix-ui/react-icons';
import { getAllAgents, deleteAgent, Agent } from '../../api/agents';
import AgentCard from '../../components/AgentCard';
import { useTranslation } from 'react-i18next';

// 定义客户端状态颜色映射
const statusColors: Record<string, "red" | "green" | "yellow" | "gray"> = {
  active: "green",
  inactive: "red",
  connecting: "yellow",
  unknown: "gray"
};

interface ClientWithStatus extends Agent {
  status?: 'active' | 'inactive' | 'connecting';
}

const AgentsList = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<ClientWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card'); // 默认使用卡片视图
  const { t } = useTranslation();

  // 获取客户端数据
  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 获取所有客户端
      const response = await getAllAgents();
      
      if (!response.success || !response.agents) {
        throw new Error(response.message || t('common.error.fetch'));
      }
      
      // 处理客户端数据
      const clientsWithStatus: ClientWithStatus[] = response.agents.map((agent: Agent) => {
        // 直接使用服务器端返回的状态
        let status: 'active' | 'inactive' | 'connecting' = 'inactive';
        
        if (agent.status === 'active') {
          status = 'active';
        } else if (agent.status === 'connecting') {
          status = 'connecting';
        }
        
        return {
          ...agent,
          status
        };
      });
      
      setAgents(clientsWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error.fetch'));
      console.error('获取客户端列表错误:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    
    // 设置定时器，每分钟刷新一次数据
    const intervalId = setInterval(() => {
      console.log('AgentsList: 自动刷新数据...');
      fetchAgents();
    }, 60000); // 60000ms = 1分钟
    
    // 组件卸载时清除定时器
    return () => clearInterval(intervalId);
  }, [t]);

  // 刷新客户端列表
  const handleRefresh = () => {
    fetchAgents();
  };

  // 打开删除确认对话框
  const handleDeleteClick = (agentId: number) => {
    setSelectedAgentId(agentId);
    setDeleteDialogOpen(true);
  };

  // 确认删除客户端
  const handleDeleteConfirm = async () => {
    if (selectedAgentId) {
      setLoading(true);
      try {
        const response = await deleteAgent(selectedAgentId);
        
        if (response.success) {
          // 删除成功，刷新客户端列表
          fetchAgents();
        } else {
          setError(response.message || t('common.error.delete'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error.delete'));
        console.error('删除客户端错误:', err);
      } finally {
        setDeleteDialogOpen(false);
        setSelectedAgentId(null);
        setLoading(false);
      }
    }
  };

  // 展示卡片视图
  const renderCardView = () => {
    return (
      <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
        {agents.map(agent => (
          <Box key={agent.id} style={{ position: 'relative' }}>
            <AgentCard agent={agent} />
            <Flex 
              style={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px',
                zIndex: 1
              }}
              gap="2"
            >
              <IconButton variant="ghost" size="1" onClick={() => navigate(`/agents/${agent.id}`)} title={t('agent.details')}>
                <InfoCircledIcon />
              </IconButton>
              <IconButton variant="ghost" size="1" onClick={() => navigate(`/agents/edit/${agent.id}`)} title={t('agent.edit')}>
                <Pencil1Icon />
              </IconButton>
              <IconButton variant="ghost" size="1" color="red" onClick={() => handleDeleteClick(agent.id)} title={t('agent.delete')}>
                <Cross2Icon />
              </IconButton>
            </Flex>
          </Box>
        ))}
      </Grid>
    );
  };

  // 展示表格视图
  const renderTableView = () => {
    return (
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>{t('agents.table.name')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('agents.table.host')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('agents.table.ip')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('agents.table.status')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('agents.table.os')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('agents.table.version')}</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>{t('agents.table.actions')}</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {agents.map(agent => (
            <Table.Row key={agent.id}>
              <Table.Cell>
                <Text weight="medium">{agent.name}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{agent.hostname || t('common.notFound')}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{agent.ip_addresses ? (() => {
                  try {
                    const ipArray = JSON.parse(String(agent.ip_addresses));
                    return Array.isArray(ipArray) && ipArray.length > 0 
                      ? ipArray.join(', ') 
                      : String(agent.ip_addresses);
                  } catch (e) {
                    return String(agent.ip_addresses);
                  }
                })() : t('common.notFound')}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge 
                  color={statusColors[agent.status || 'unknown']}
                >
                  {agent.status === 'active' 
                    ? t('agent.status.online') 
                    : agent.status === 'connecting' 
                      ? t('agent.status.connecting') 
                      : t('agent.status.offline')
                  }
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text>{agent.os || t('common.notFound')}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text>{agent.version || t('common.notFound')}</Text>
              </Table.Cell>
              <Table.Cell>
                <Flex gap="2">
                  <IconButton variant="soft" onClick={() => navigate(`/agents/${agent.id}`)}>
                    <InfoCircledIcon />
                  </IconButton>
                  <IconButton variant="soft" onClick={() => navigate(`/agents/edit/${agent.id}`)}>
                    <Pencil1Icon />
                  </IconButton>
                  <IconButton variant="soft" color="red" onClick={() => handleDeleteClick(agent.id)}>
                    <Cross2Icon />
                  </IconButton>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    );
  };

  // 加载中显示
  if (loading) {
    return (
      <Box className="page-container detail-page">
        <Flex justify="center" align="center" p="4">
          <Text>{t('common.loading')}</Text>
        </Flex>
      </Box>
    );
  }

  // 错误显示
  if (error) {
    return (
      <Box className="page-container detail-page">
        <Card mb="4">
          <Flex p="3" style={{ backgroundColor: 'var(--red-3)' }}>
            <Text style={{ color: 'var(--red-9)' }}>{error}</Text>
          </Flex>
        </Card>
        <Button variant="soft" onClick={() => window.location.reload()} mt="2">
          {t('common.retry')}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <div className="page-container detail-page">
        <Flex justify="between" align="center" className="detail-header">
          <Heading size="6">{t('agents.pageTitle')}</Heading>
          <Flex gap="3">
            <Tabs.Root defaultValue="card">
              <Tabs.List>
                <Tabs.Trigger value="card" onClick={() => setViewMode('card')} title={t('agents.cardView')}>
                  <ViewGridIcon />
                </Tabs.Trigger>
                <Tabs.Trigger value="table" onClick={() => setViewMode('table')} title={t('agents.tableView')}>
                  <LayoutIcon />
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            <Button onClick={handleRefresh} disabled={loading}>
              <ReloadIcon />
              {t('common.refresh')}
            </Button>
            <Button onClick={() => {
              console.log('点击添加客户端按钮(空列表)，准备导航到/agents/create');
              try {
                navigate('/agents/create');
              } catch (err) {
                console.error('导航到添加客户端页面失败:', err);
              }
            }}>
              <PlusIcon />
              {t('agents.create')}
            </Button>
          </Flex>
        </Flex>

        <div className="detail-content">
          {agents.length === 0 ? (
            <Card>
              <Flex direction="column" align="center" justify="center" p="6" gap="3">
                <Text>{t('agents.noAgents')}</Text>
                <Button onClick={() => navigate('/agents/create')}>
                  <PlusIcon />
                  {t('agents.create')}
                </Button>
              </Flex>
            </Card>
          ) : viewMode === 'table' ? (
            // 表格视图
            renderTableView()
          ) : (
            // 卡片视图
            renderCardView()
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Content>
          <Dialog.Title>{t('common.deleteConfirmation')}</Dialog.Title>
          <Dialog.Description>
            {t('common.deleteConfirmMessage')}
          </Dialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                {t('common.cancel')}
              </Button>
            </Dialog.Close>
            <Button color="red" onClick={handleDeleteConfirm}>
              {t('common.delete')}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default AgentsList; 