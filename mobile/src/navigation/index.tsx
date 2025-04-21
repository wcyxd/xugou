import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Platform, Text, Animated, Easing } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigationRef } from './navigationUtils';
import ApiUrlSettings from '../components/ApiUrlSettings';

// Screens - 只引用已实现的屏幕
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MonitorsScreen from '../screens/monitors/MonitorsScreen';
import MonitorDetailScreen from '../screens/monitors/MonitorDetailScreen';
import CreateMonitorScreen from '../screens/monitors/CreateMonitorScreen';
import AgentsScreen from '../screens/agents/AgentsScreen';
import AgentDetailScreen from '../screens/agents/AgentDetailScreen';
import CreateAgentScreen from '../screens/agents/CreateAgentScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import MonitorNotificationsScreen from '../screens/settings/MonitorNotificationsScreen';
import AgentNotificationsScreen from '../screens/settings/AgentNotificationsScreen';
import GlobalSettingsScreen from '../screens/settings/GlobalSettingsScreen';
import NotificationChannelsScreen from '../screens/settings/NotificationChannelsScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// Auth context
import { useAuthStore } from '../store/authStore';

// 监控导航栈
const MonitorsStack = createNativeStackNavigator();
const MonitorsNavigator = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <MonitorsStack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <MonitorsStack.Screen
        name="MonitorsList"
        component={MonitorsScreen}
      />
      <MonitorsStack.Screen
        name="MonitorDetail"
        component={MonitorDetailScreen}
      />
      <MonitorsStack.Screen
        name="CreateMonitor"
        component={CreateMonitorScreen}
      />
    </MonitorsStack.Navigator>
  );
};

// 客户端导航栈
const AgentsStack = createNativeStackNavigator();
const AgentsNavigator = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <AgentsStack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <AgentsStack.Screen
        name="AgentsList"
        component={AgentsScreen}
      />
      <AgentsStack.Screen
        name="AgentDetail"
        component={AgentDetailScreen}
      />
      <AgentsStack.Screen
        name="CreateAgent"
        component={CreateAgentScreen}
      />
    </AgentsStack.Navigator>
  );
};

// 定义TabIcon组件的Props类型
interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  focused: boolean;
}

// TabIcon组件 - 带动画效果的图标
const TabIcon: React.FC<TabIconProps> = ({ name, color, size, focused }) => {
  // 创建动画值
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // 当focused状态变化时触发动画
  useEffect(() => {
    if (focused) {
      // 放大并轻微旋转动画
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.bounce
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.elastic(1)
        })
      ]).start();
    } else {
      // 恢复原始大小
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [focused, scaleAnim, rotateAnim]);
  
  // 计算旋转角度
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg']
  });

  // 处理图标名称
  const iconName = focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap;
  
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: 50, 
      height: 30,
    }}>
      <Animated.View style={{ 
        transform: [
          { scale: scaleAnim },
          { rotate: rotate }
        ]
      }}>
        <Ionicons name={iconName} size={size || 24} color={color} />
      </Animated.View>
    </View>
  );
};

// 主页标签栏
const MainTab = createBottomTabNavigator();
const MainTabNavigator = () => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  
  const isDark = colorScheme === 'dark';
  
  // 优化底部标签栏样式
  const tabBarStyle = {
    height: 64,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#2c2c2e' : '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  };
  
  return (
    <MainTab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        tabBarShowLabel: true,
        headerShown: false,
        tabBarStyle: tabBarStyle,
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: isDark ? '#8e8e93' : '#8e8e93',
        tabBarIconStyle: {
          marginTop: 0
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 0,
          marginTop: 2
        }
      }}
    >
      <MainTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('navigation.dashboard', '仪表盘'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={"grid" as keyof typeof Ionicons.glyphMap} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <MainTab.Screen
        name="Monitors"
        component={MonitorsNavigator}
        options={{
          tabBarLabel: t('navigation.monitors', '监控'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={"pulse" as keyof typeof Ionicons.glyphMap} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <MainTab.Screen
        name="Agents"
        component={AgentsNavigator}
        options={{
          tabBarLabel: t('navigation.agents', '客户端'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={"hardware-chip" as keyof typeof Ionicons.glyphMap} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('navigation.settings', '设置'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={"settings" as keyof typeof Ionicons.glyphMap} color={color} size={size} focused={focused} />
          ),
        }}
      />
    </MainTab.Navigator>
  );
};

// 根导航
const RootStack = createNativeStackNavigator();
const RootNavigator = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const { isAuthenticated, checkAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const prevAuthState = React.useRef(false);
  
  // 初始检查认证状态
  React.useEffect(() => {
    const checkAuth = async () => {
      await checkAuthenticated();
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // 监听认证状态变化
  React.useEffect(() => {
    // 如果状态从认证变为未认证
    if (prevAuthState.current && !isAuthenticated && !isLoading) {
      console.log('认证状态从true变为false，手动处理导航');
      
      setTimeout(() => {
        if (navigationRef.isReady()) {
          try {
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Login' }]
            });
            console.log('导航手动重置成功');
          } catch (e) {
            console.error('导航手动重置失败', e);
          }
        } else {
          console.log('导航容器未就绪，无法执行手动重置');
        }
      }, 300);
    }
    
    // 记录当前状态，用于下次比较
    prevAuthState.current = isAuthenticated;
  }, [isAuthenticated, isLoading]);
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              headerShown: false
            }}
          />
          <RootStack.Screen 
            name="GlobalSettings" 
            component={GlobalSettingsScreen}
            options={{
              headerShown: false
            }}
          />
          <RootStack.Screen 
            name="NotificationChannels" 
            component={NotificationChannelsScreen}
            options={{
              headerShown: false
            }}
          />
          <RootStack.Screen 
            name="MonitorNotifications" 
            component={MonitorNotificationsScreen}
            options={{
              headerShown: false
            }}
          />
          <RootStack.Screen 
            name="AgentNotifications" 
            component={AgentNotificationsScreen}
            options={{
              headerShown: false
            }}
          />
        </>
      ) : (
        <>
          <RootStack.Screen name="Login" component={LoginScreen} />
        </>
      )}
    </RootStack.Navigator>
  );
};

// 导航容器
const AppNavigator = ({ initialApiConfigured }: { initialApiConfigured: boolean | null }) => {
  const colorScheme = useColorScheme();
  const [apiUrlSettingsVisible, setApiUrlSettingsVisible] = React.useState(!initialApiConfigured);
  
  // 设置完成回调函数
  const handleApiSetupComplete = React.useCallback(() => {
    // 添加延迟以确保所有状态已正确保存
    setTimeout(() => {
      setApiUrlSettingsVisible(false);
    }, 300);
  }, []);
  
  // 使用 useMemo 优化渲染内容
  const navigationContent = React.useMemo(() => {
    if (apiUrlSettingsVisible) {
      return (
        <ApiUrlSettings 
          mode="fullscreen"
          onComplete={handleApiSetupComplete}
          saveConfigured={true}
        />
      );
    }
    return <RootNavigator />;
  }, [apiUrlSettingsVisible, handleApiSetupComplete]);
  
  return (
    <NavigationContainer ref={navigationRef}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {navigationContent}
      </SafeAreaProvider>
    </NavigationContainer>
  );
};

export default AppNavigator; 