import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Dimensions,
  Image, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Definição de Cores Premium
const theme = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  subText: '#64748B',
  accent: '#3B82F6',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444', // Vermelho para Logout
  white: '#FFFFFF',
};

export default function PerfilCliente() {
  const router = useRouter();
  const { token, API_URL, logout } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bi, setBi] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState<any>(null);

  useEffect(() => { fetchPerfil(); }, []);

  async function fetchPerfil() {
    try {
      // Nota André: IP atualizado para o teu HP (Servidor)
      const response = await fetch(`${API_URL}/api/perfil/cliente/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      const data = await response.json();
      setPerfil(data);
      setTelefone(data.telefone || '');
      setEndereco(data.endereco || '');
      setBi(data.bi || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function pickImage(setter: (img: any) => void) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setter(result.assets[0]);
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append('telefone', telefone);
      formData.append('endereco', endereco);
      formData.append('bi', bi);

      if (fotoPerfil) {
        formData.append('foto_perfil', {
          uri: fotoPerfil.uri,
          name: 'foto_perfil.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const response = await fetch(`${API_URL}/api/perfil/cliente/editar/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          // Content-Type é definido automaticamente pelo FormData
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Erro ao salvar.');

      Alert.alert('✅ Perfil actualizado!', 'As tuas informações foram guardadas.');
      setEditando(false);
      setFotoPerfil(null);
      fetchPerfil();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  }

  // Lógica de confirmação de logout (Melhor UX)
  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Tens a certeza que desejas encerrar a sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: () => logout() }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />
      
      {/* Header Premium */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Meu Perfil</Text>
        <TouchableOpacity
          style={[styles.editBtn, editando && styles.editBtnActive]}
          onPress={() => editando ? handleSalvar() : setEditando(true)}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color={theme.white} size="small" />
          ) : (
            <>
              <MaterialIcons name={editando ? "save" : "edit"} size={18} color={editando ? theme.white : theme.accent} style={{marginRight: 6}} />
              <Text style={[styles.editBtnText, editando && styles.editBtnTextActive]}>
                {editando ? 'Guardar' : 'Editar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={editando ? () => pickImage(setFotoPerfil) : undefined}
            activeOpacity={editando ? 0.7 : 1}
            style={styles.avatarWrapper}
          >
            <View style={[styles.avatar, editando && { borderColor: theme.accent }]}>
              {fotoPerfil ? (
                <Image source={{ uri: fotoPerfil.uri }} style={styles.avatarImagem} />
              ) : perfil?.foto_perfil ? (
                <Image source={{ uri: perfil.foto_perfil }} style={styles.avatarImagem} />
              ) : (
                <MaterialIcons name="person" size={50} color={theme.subText} />
              )}
            </View>
            {editando && (
              <View style={styles.avatarEditBadge}>
                <MaterialIcons name="add-a-photo" size={16} color={theme.white} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.nome}>{perfil?.nome_completo || perfil?.username}</Text>
          <View style={styles.tipoBadge}>
            <Text style={styles.tipoText}>Conta Cliente</Text>
          </View>
        </View>

        {/* Stats Row Premium */}
        <View style={styles.statsRow}>
          <StatCard label="Total" value={perfil?.total_cargas || 0} icon="inventory-2" color={theme.text} />
          <StatCard label="Pendentes" value={perfil?.cargas_pendentes || 0} icon="history" color={theme.warning} />
          <StatCard label="Trânsito" value={perfil?.cargas_em_transito || 0} icon="local-shipping" color={theme.accent} />
          <StatCard label="Entregues" value={perfil?.cargas_entregues || 0} icon="check-circle" color={theme.success} />
        </View>

        {/* Dados Pessoais (Card Premium) */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DADOS DA CONTA</Text>
          <InfoRow icon="account-circle" label="Username" value={perfil?.username || '—'} />
          <InfoRow icon="email" label="Email" value={perfil?.email || '—'} />
          
          <Text style={[styles.cardLabel, {marginTop: 20}]}>INFORMAÇÕES ADICIONAIS</Text>
          <EditableRow
            icon="phone" label="Telefone"
            value={telefone} onChangeText={setTelefone}
            editando={editando} placeholder="Ex: +244 9XX XXX XXX" keyboardType="phone-pad"
          />
          <EditableRow
            icon="badge" label="Número do BI"
            value={bi} onChangeText={setBi}
            editando={editando} placeholder="Ex: 004XXXXXXLA042"
          />
          <EditableRow
            icon="home" label="Endereço"
            value={endereco} onChangeText={setEndereco}
            editando={editando} placeholder="Ex: Rua X, Bairro Y, Luanda"
            last
          />
        </View>

        {/* Botões de Ação Final (Cancel e Logout) */}
        {editando ? (
          <TouchableOpacity
            style={styles.btnCancelar}
            onPress={() => { setEditando(false); setFotoPerfil(null); fetchPerfil(); }}
          >
            <MaterialIcons name="close" size={20} color={theme.danger} style={{marginRight: 8}} />
            <Text style={styles.btnCancelarText}>Cancelar edição</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
            <View style={styles.btnLogoutIconCircle}>
                <MaterialIcons name="logout" size={20} color={theme.danger} />
            </View>
            <Text style={styles.btnLogoutText}>Encerrar Sessão</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.subText} />
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// Componentes Auxiliares Estilizados

function StatCard({ label, value, icon, color }: any) {
  return (
    <View style={statStyles.card}>
      <MaterialIcons name={icon} size={22} color={color} style={{marginBottom: 6}} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrapper}>
        <MaterialIcons name={icon} size={18} color={theme.accent} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function EditableRow({ icon, label, value, onChangeText, editando, placeholder, last, keyboardType }: any) {
  return (
    <View style={[infoStyles.row, last && { borderBottomWidth: 0 }]}>
      <View style={infoStyles.iconWrapper}>
        <MaterialIcons name={icon} size={18} color={theme.accent} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        {editando ? (
          <TextInput
            style={infoStyles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.subText}
            keyboardType={keyboardType || 'default'}
          />
        ) : (
          <Text style={infoStyles.value}>{value || '—'}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  loadingContainer: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15,
    backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: theme.text },
  editBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.card,
  },
  editBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  editBtnText: { fontSize: 14, color: theme.accent, fontWeight: '700' },
  editBtnTextActive: { color: theme.white },
  avatarSection: { alignItems: 'center', paddingVertical: 30 },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: theme.card, borderWidth: 3, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 15,
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  avatarImagem: { width: 100, height: 100, borderRadius: 50 },
  avatarEditBadge: {
    position: 'absolute', bottom: 18, right: 0,
    backgroundColor: theme.accent,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: theme.bg,
  },
  nome: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 8 },
  tipoBadge: {
    backgroundColor: '#E0F2FE', borderRadius: 20, // Azul muito leve
    paddingHorizontal: 16, paddingVertical: 6,
  },
  tipoText: { fontSize: 13, color: theme.accent, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 25 },
  card: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: theme.card, borderRadius: 24,
    padding: 20, borderWidth: 1, borderColor: theme.border, elevation: 1,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: theme.subText, letterSpacing: 1.2, marginBottom: 15 },
  btnCancelar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 15,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  btnCancelarText: { fontSize: 15, fontWeight: '700', color: theme.danger },
  
  // Design Premium para o Logout Botão
  btnLogout: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 30,
    backgroundColor: theme.card, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: '#FEE2E2', // Borda vermelha leve
    elevation: 2, shadowColor: theme.danger, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5,
  },
  btnLogoutIconCircle: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FEF2F2', // Fundo vermelho muito leve
    alignItems: 'center', justifyContent: 'center', marginRight: 15,
  },
  btnLogoutText: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.danger },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: theme.card, borderRadius: 16,
    padding: 15, alignItems: 'center', borderWidth: 1, borderColor: theme.border, elevation: 1,
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: theme.subText, marginTop: 4, fontWeight: '500' },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 15,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  iconWrapper: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0F9FF', // Azul leve
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  label: { fontSize: 11, color: theme.subText, fontWeight: '600' },
  value: { fontSize: 15, color: theme.text, marginTop: 3, fontWeight: '500' },
  input: {
    fontSize: 15, color: theme.accent, marginTop: 3, fontWeight: '600',
    backgroundColor: theme.bg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.accent,
  },
});