// app/(drawer)/_layout.tsx - FIXED LOGOUT BUTTON
import { Drawer } from 'expo-router/drawer';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router, usePathname } from 'expo-router';
import { logout } from '../../utils/auth';
import { usePatientStore } from '../../hooks/usePatientStore';

function CustomDrawerContent() {
  const pathname = usePathname();
  const { clearPatientProfile } = usePatientStore();

  const menuItems = [
    { label: 'Home', route: '/(drawer)', icon: '📊' },
    { label: 'Chat with AI', route: '/(drawer)/chat', icon: '💬' },
    { label: 'Analytics', route: '/(drawer)/analytics', icon: '📈' },
    { label: 'Reminders', route: '/(drawer)/reminders', icon: '⏰' },
    { label: 'Locate medical care', route: '/(drawer)/locatemedicalcare', icon: '📍' },
    { label: 'Profile', route: '/(drawer)/profile', icon: '👤' },
  ];

  const handleLogout = async () => {
    console.log('🟡 Logout button pressed');

    try {
      console.log('🟡 Logout confirmed - starting process');
      clearPatientProfile();
      await logout();
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force redirect even if there's an error
      router.replace('/auth/login');
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: 60, backgroundColor: '#fff' }}>
      <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0F131A' }}>Dashboard</Text>
        <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>Your Medical Companion</Text>
      </View>

      <View style={{ flex: 1, padding: 12 }}>
        {menuItems.map((item, index) => {
          const isActive = pathname === item.route ||
            (item.route === '/(drawer)' && pathname === '/(drawer)/index');
          return (
            <TouchableOpacity
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 4,
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
              }}
              onPress={() => {
                console.log(`🟡 Navigating to: ${item.route}`);
                router.push(item.route as any);
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 12 }}>{item.icon}</Text>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isActive ? '#3B82F6' : '#0F131A'
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Logout Button at Bottom */}
      <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: '#FEF2F2',
          }}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 20, marginRight: 12 }}>🚪</Text>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#DC2626'
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerHideStatusBarOnOpen: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        swipeEnabled: true,
        swipeEdgeWidth: 50, // Makes it easier to open drawer
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Home',
          title: 'Home',
        }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          drawerLabel: 'Chat with AI',
          title: 'Chat with AI',
        }}
      />
      <Drawer.Screen
        name="analytics"
        options={{
          drawerLabel: 'Analytics',
          title: 'Analytics',
        }}
      />
      <Drawer.Screen
        name="reminders"
        options={{
          drawerLabel: 'Reminders',
          title: 'Reminders',
        }}
      />
      <Drawer.Screen
        name="locatemedicalcare"
        options={{
          drawerLabel: "Locate medical care",
          title: "Locate medical care",
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'Profile',
          title: 'Profile',
        }}
      />
    </Drawer>
  );
}
