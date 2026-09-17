import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#d9485f',
        headerShown: false,
        tabBarStyle: { height: 68, paddingBottom: 8, paddingTop: 6 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm', tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="news" options={{ title: 'Xu hướng', tabBarIcon: ({ color }) => <Ionicons name="sparkles-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarIcon: ({ color }) => <Ionicons name="bag-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'User', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={23} color={color} /> }} />
    </Tabs>
  );
}
