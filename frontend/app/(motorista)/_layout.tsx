import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

const COLORS = {
  PRIMARY:   '#10b981',
  BG_DARK:   '#111827',
  TEXT_MUTED: '#94a3b8',
  BORDER:    '#334155',
};

export default function MotoristaLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.BG_DARK,
          borderTopColor: COLORS.BORDER,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_MUTED,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="carteira"
        options={{
          title: 'Carteira',
          tabBarIcon: ({ color }) => <MaterialIcons name="account-balance-wallet" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="minhas-entregas"
        options={{
          title: 'Viagens',
          tabBarIcon: ({ color }) => <MaterialIcons name="history" size={24} color={color} />,
        }}
      />

      {/* Escondido do menu — acessível via router.push('/(motorista)/chat-handler') */}
      <Tabs.Screen name="chat-handler"         options={{ href: null }} />
      <Tabs.Screen name="perfil"               options={{ href: null }} />
      <Tabs.Screen name="detalhe-entrega"      options={{ href: null }} />
      <Tabs.Screen name="detalhe-carga-motorista" options={{ href: null }} />
    </Tabs>
  );
}