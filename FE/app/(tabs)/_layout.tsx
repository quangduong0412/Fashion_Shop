import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.onSurfaceVariant,
        headerShown: false,
        tabBarStyle: {
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: 'rgba(251, 248, 255, 0.9)', // surface/90
          borderTopColor: 'rgba(30,58,95,0.05)',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
        }
      }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Trang chủ', 
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="explore" 
        options={{ 
          title: 'Khám phá', 
          tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="cart" 
        options={{ 
          title: 'Giỏ hàng', 
          tabBarIcon: ({ color }) => (
            <View>
              <MaterialIcons name="local-mall" size={24} color={color} />
              {/* Optional: Add badge here if needed */}
            </View>
          )
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Tài khoản', 
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}
