import React from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useColorScheme } from 'react-native';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
}

const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({ children, style }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return (
    <SafeAreaView style={[
      styles.container, 
      { backgroundColor: isDark ? '#000000' : '#f7f9fc' },
      style
    ]}>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12,
  },
});

export default SafeAreaWrapper; 