import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ClienteLayout() {
  const { user } = useAuth();

  // Função para abrir o WhatsApp diretamente
  const abrirWhatsApp = () => {
    const telefone = "244929885183"; // Substitui pelo número de suporte real
    const mensagem = "Olá! Preciso de ajuda com o meu pedido no Nzila Plus.";
    const url = `whatsapp://send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;
    
    Linking.openURL(url).catch(() => {
      alert("Certifica-te que o WhatsApp está instalado no teu dispositivo.");
    });
  };

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#3B82F6', // Azul Premium do design
      tabBarInactiveTintColor: '#94A3B8',
      tabBarStyle: { 
        height: 70, 
        paddingBottom: 12,
        paddingTop: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        elevation: 10,
      },
      headerShown: false,
    }}>
      
      {/* 1. INÍCIO */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={26} color={color} />,
        }}
      />

      {/* 2. MAPA */}
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <MaterialIcons name="map" size={26} color={color} />,
        }}
      />

      {/* 3. CHAT (WHATSAPP) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MaterialIcons name="chat" size={26} color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Impede de abrir uma página interna
            abrirWhatsApp();
          },
        }}
      />

      {/* 4. PERFIL */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={26} color={color} />,
        }}
      />

      {/* OCULTAR ECRÃS AUXILIARES DA BARRA INFERIOR */}
      <Tabs.Screen 
        name="nova-carga" 
        options={{ 
          href: null, // Remove o botão da aba
        }} 
      />

      <Tabs.Screen 
        name="minhas-cargas" 
        options={{ 
          href: null, 
        }} 
      />

      {/* ABA ESCONDIDA: Detalhe da Carga */}
      <Tabs.Screen
        name="detalhe-carga"
        options={{
          href: null, // <--- ISTO É O QUE REMOVE DA BARRA DE BAIXO
        }}
      />

    </Tabs>
  );
}