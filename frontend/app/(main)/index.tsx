import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Olá, {user?.username || 'Utilizador'}</Text>
          <Text style={styles.userType}>{user?.type === 'motorista' ? 'Motorista' : 'Cliente'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.btnLogout}>
          <MaterialIcons name="logout" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <MaterialIcons name="local-shipping" size={80} color="#2563eb" />
        <Text style={styles.title}>NZILA PLUS</Text>
        <Text style={styles.subtitle}>Pronto para gerir as suas cargas em Luanda?</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 24, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  welcome: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  userType: { fontSize: 14, color: '#64748b', textTransform: 'capitalize' },
  btnLogout: { padding: 8 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#2563eb', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginTop: 8 }
});