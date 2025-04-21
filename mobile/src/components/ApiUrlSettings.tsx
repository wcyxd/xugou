import React, { useState, useCallback } from 'react';
import {
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, saveApiBaseUrl } from '../config/api';

// 组件接口定义
interface ApiUrlSettingsProps {
  // 显示模式: 'fullscreen' 全屏模式用于初始设置, 'modal' 模态框模式用于登录界面
  mode: 'fullscreen' | 'modal';
  // 是否可见（仅用于模态框模式）
  visible?: boolean;
  // 完成回调（成功保存API URL后触发）
  onComplete: () => void;
  // 取消回调（仅用于模态框模式）
  onCancel?: () => void;
  // 是否保存设置标记（默认为true，首次设置需要保存）
  saveConfigured?: boolean;
}

const ApiUrlSettings: React.FC<ApiUrlSettingsProps> = ({
  mode,
  visible = true,
  onComplete,
  onCancel,
  saveConfigured = true
}) => {
  const { t } = useTranslation();
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [saving, setSaving] = useState(false);
  
  // 重置函数
  const resetState = useCallback(() => {
    setApiUrl(API_BASE_URL);
    setSaving(false);
  }, []);
  
  // 保存API URL
  const handleSave = async () => {
    // 防止重复点击
    if (saving) return;
    
    try {
      setSaving(true);
      
      // 先保存API URL
      await saveApiBaseUrl(apiUrl);
      
      // 成功后再保存配置标志
      if (saveConfigured) {
        await AsyncStorage.setItem('api_url_configured', 'true');
      }
      
      // 如果是模态框模式，重置状态
      if (mode === 'modal') {
        resetState();
      }
      
      // 最后才调用完成回调
      onComplete();
    } catch (error) {
      console.error('保存API URL失败:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // 取消操作（仅模态框模式）
  const handleCancel = () => {
    if (onCancel) {
      resetState();
      onCancel();
    }
  };
  
  // 根据模式渲染不同的UI
  const renderContent = () => {
    return (
      <View style={mode === 'fullscreen' ? styles.setupContainer : styles.modalContent}>
        {mode === 'fullscreen' && (
          <>
            <Text style={styles.setupTitle}>{t('setup.welcome')}</Text>
            <Text style={styles.setupSubtitle}>{t('setup.firstTimeSetup')}</Text>
          </>
        )}
        
        {mode === 'modal' && (
          <Text style={styles.modalTitle}>{t('settings.apiSettings')}</Text>
        )}
        
        <Text style={mode === 'fullscreen' ? styles.setupLabel : styles.modalLabel}>
          {t('settings.apiBaseUrl')}
        </Text>
        
        <TextInput
          style={mode === 'fullscreen' ? styles.setupInput : styles.modalInput}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://..."
          autoCapitalize="none"
          keyboardType="url"
          placeholderTextColor="#999"
        />
        
        <Text style={mode === 'fullscreen' ? styles.setupHelper : styles.apiHelperText}>
          {t('settings.apiHelperText')}
        </Text>
        
        {mode === 'fullscreen' ? (
          <TouchableOpacity 
            style={styles.setupButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.setupButtonText}>
                {t('setup.continue')}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.modalButtonsContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  // 如果是全屏模式或模态框可见，则渲染内容
  if (mode === 'fullscreen') {
    return (
      <View style={styles.fullscreenContainer}>
        {renderContent()}
      </View>
    );
  }
  
  // 模态框模式
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalContainer}>
        {renderContent()}
      </View>
    </Modal>
  );
};

// 样式定义
const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  setupContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  setupLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  setupInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  setupHelper: {
    fontSize: 12,
    color: '#666',
    marginBottom: 32,
    lineHeight: 18,
  },
  setupButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  apiHelperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
    lineHeight: 18,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#0066cc',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ApiUrlSettings; 