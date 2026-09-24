import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { View, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { readCart } from '../../components/fashion-data';

export default function TabLayout() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const fetchCart = async () => {
      const cart = await readCart();
      const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
    };
    fetchCart();
    const interval = setInterval(fetchCart, 1000);
    return () => clearInterval(interval);
  }, []);

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
              {cartCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: Colors.light.primary, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{cartCount}</Text>
                </View>
              )}
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
