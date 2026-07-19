import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  PRIMARY: '#10b981',
  PRIMARY_MUTED: 'rgba(16, 185, 129, 0.1)',
  BG_DARK: '#111827',
  CARD_DARK: '#1e293b',
  TEXT_LIGHT: '#f1f5f9',
  TEXT_MUTED: '#94a3b8',
  BORDER: '#334155',
  DANGER: '#ef4444',
  DANGER_MUTED: 'rgba(239, 68, 68, 0.1)',
};

export default function PerfilMotorista() {
  const router = useRouter();
  const { token, API_URL, logout } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // ESTADOS - DADOS PESSOAIS
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [morada, setMorada] = useState('');

  // ESTADOS - VEÍCULO
  const [veiculoModelo, setVeiculoModelo] = useState('');
  const [veiculoPlaca, setVeiculoPlaca] = useState('');
  const [veiculoCapacidade, setVeiculoCapacidade] = useState('');
  const [veiculoCor, setVeiculoCor] = useState('');

  // ESTADOS - FOTOS NOVAS (Temporárias)
  const [fotos, setFotos] = useState<{ [key: string]: any }>({
    perfil: null, bi_frente: null, bi_verso: null, 
    carta_frente: null, carta_verso: null, livrete: null,
    veiculo: null, placa: null
  });

  useEffect(() => { fetchPerfil(); }, []);

  async function fetchPerfil() {
  try {
    const response = await fetch(`${API_URL}/api/perfil/motorista/`, {
      headers: { 'Authorization': `Token ${token}`, 'ngrok-skip-browser-warning': 'true' },
    });
    const data = await response.json();
    setPerfil(data);
    
    // Mapeamento correto dos dados pessoais
    // Se o backend não enviar first/last name separados, usamos o nome_completo
    setFirstName(data.first_name || data.nome_completo?.split(' ')[0] || '');
    setLastName(data.last_name || data.nome_completo?.split(' ').slice(1).join(' ') || '');
    setTelefone(data.telefone || '');
    setMorada(data.endereco || ''); // Mudado para 'endereco' conforme o modelo
    
    // Veículo - Alinhado com o teu JSON (capacidade_kg)
    const v = data.veiculo || {};
    setVeiculoModelo(v.modelo || '');
    setVeiculoPlaca(v.placa || '');
    setVeiculoCapacidade(v.capacidade_kg?.toString() || ''); // Chave correta: capacidade_kg
    setVeiculoCor(v.cor || '');

  } catch (e) { console.error("Erro ao carregar:", e); } finally { setLoading(false); }
}

  const pickImage = async (key: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, allowsEditing: true,
    });
    if (!result.canceled) {
      setFotos(prev => ({ ...prev, [key]: result.assets[0] }));
    }
  };

  const RenderEstrelas = ({ media }: { media: number }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons 
          key={i}
          name={i <= Math.round(media) ? "star" : "star-outline"} 
          size={18} 
          color="#f59e0b" 
        />
      ))}
      <Text style={{ color: '#94a3b8', marginLeft: 5, fontWeight: 'bold' }}>
        ({media.toFixed(1)})
      </Text>
    </View>
  );
};

  async function handleSalvar() {
    setSalvando(true);
  try {
    const formData = new FormData();
    
    // Dados Pessoais
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('telefone', telefone);
    formData.append('morada', morada);

    // Dados do Veículo - Alinhado com o que o backend espera no PATCH
    formData.append('veiculo_modelo', veiculoModelo);
    formData.append('veiculo_placa', veiculoPlaca);
    formData.append('veiculo_cor', veiculoCor);
    formData.append('veiculo_capacidade_kg', veiculoCapacidade);

      // Append de Fotos se existirem novas
      const appendPhoto = (key: string, fieldName: string) => {
        if (fotos[key]) {
          formData.append(fieldName, {
            uri: fotos[key].uri, name: `${key}.jpg`, type: 'image/jpeg'
          } as any);
        }
      };

      appendPhoto('perfil', 'foto_perfil');
      appendPhoto('bi_frente', 'foto_bi_frente');
      appendPhoto('bi_verso', 'foto_bi_verso');
      appendPhoto('carta_frente', 'foto_carta_frente');
      appendPhoto('carta_verso', 'foto_carta_verso');
      appendPhoto('livrete', 'foto_livrete');
      appendPhoto('veiculo', 'foto_veiculo');
      appendPhoto('placa', 'foto_placa');

      const response = await fetch(`${API_URL}/api/perfil/motorista/editar/`, {
      method: 'PATCH',
      headers: { 'Authorization': `Token ${token}`, 'ngrok-skip-browser-warning': 'true' },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log("Erro do Back:", errorData);
      throw new Error('Erro ao atualizar dados.');
    }

    Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    setEditando(false);
    fetchPerfil(); // Recarrega para garantir que os dados "prendem" no ecrã
  } catch (e: any) {
    Alert.alert('Erro', e.message);
  } finally {
    setSalvando(false);
  }
}

  if (loading) return <View style={styles.loading}><ActivityIndicator color={COLORS.PRIMARY} size="large" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><MaterialIcons name="close" size={20} color={COLORS.TEXT_LIGHT} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{editando ? 'Editar Tudo' : 'Meu Perfil'}</Text>
        <TouchableOpacity onPress={() => editando ? handleSalvar() : setEditando(true)} style={styles.iconBtn}>
          {salvando ? <ActivityIndicator size="small" color={COLORS.PRIMARY} /> : <MaterialIcons name={editando ? "check" : "edit"} size={20} color={COLORS.PRIMARY} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => editando && pickImage('perfil')} disabled={!editando}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: fotos.perfil?.uri || perfil?.foto_perfil || 'https://via.placeholder.com/150' }} style={styles.avatar} />
              {editando && <View style={styles.editBadge}><MaterialIcons name="camera-alt" size={14} color="#fff" /></View>}
            </View>
          </TouchableOpacity>
          <Text style={styles.nameText}>{`${firstName} ${lastName}` || perfil?.username}</Text>
          {/* 🌟 AQUI USAS O COMPONENTE: */}
          <RenderEstrelas media={perfil?.media_avaliacao || 0} />
          <Text style={styles.roleText}>Motorista Profissional</Text>
        </View>

        {/* SECÇÃO 1: DADOS PESSOAIS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          <View style={styles.card}>
            {editando ? (
              <>
                <InputGroup icon="person" label="Primeiro Nome" value={firstName} onChange={setFirstName} />
                <InputGroup icon="person-outline" label="Apelido" value={lastName} onChange={setLastName} />
                <InputGroup icon="phone" label="Telefone" value={telefone} onChange={setTelefone} keyboard="phone-pad" />
                <InputGroup icon="place" label="Morada" value={morada} onChange={setMorada} />
              </>
            ) : (
              <>
                <InfoRow icon="email" label="E-mail" value={perfil?.email} />
                <InfoRow icon="phone" label="Contacto" value={telefone} />
                <InfoRow icon="place" label="Morada Principal" value={morada || 'Não definida'} />
                <InfoRow icon="fingerprint" label="BI / NIF" value={perfil?.bi || '---'} last />
              </>
            )}
          </View>
        </View>

        {/* SECÇÃO 2: O MEU VEÍCULO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O Meu Veículo</Text>
          <View style={styles.card}>
            {editando ? (
              <>
                <InputGroup icon="local-shipping" label="Modelo" value={veiculoModelo} onChange={setVeiculoModelo} />
                <InputGroup icon="subtitles" label="Matrícula" value={veiculoPlaca} onChange={setVeiculoPlaca} />
                <InputGroup icon="fitness-center" label="Capacidade (Kg)" value={veiculoCapacidade} onChange={setVeiculoCapacidade} keyboard="numeric" />
                <InputGroup icon="palette" label="Cor" value={veiculoCor} onChange={setVeiculoCor} />
                
                <Text style={styles.subLabel}>Fotos do Veículo</Text>
                <View style={styles.row}>
                  <UploadBox label="Veículo" hasFile={!!perfil?.veiculo?.foto_veiculo} newFile={fotos.veiculo} onPress={() => pickImage('veiculo')} editando />
                  <UploadBox label="Placa/Matrícula" hasFile={!!perfil?.veiculo?.foto_placa} newFile={fotos.placa} onPress={() => pickImage('placa')} editando />
                </View>
              </>
            ) : (
              <>
                <View style={styles.row}>
                    <View style={{flex: 1}}><InfoRow icon="local-shipping" label="Modelo" value={veiculoModelo} /></View>
                    <View style={{flex: 1}}><InfoRow icon="subtitles" label="Placa" value={veiculoPlaca} /></View>
                </View>
                <View style={styles.row}>
                    <View style={{flex: 1}}>
                    <InfoRow 
                      icon="fitness-center" 
                      label="Carga Máx" 
                      value={veiculoCapacidade ? `${veiculoCapacidade} Kg` : 'Não definido'} 
                    />
                  </View>
                    <View style={{flex: 1}}><InfoRow icon="palette" label="Cor" value={veiculoCor} last /></View>
                </View>
                {perfil?.veiculo?.foto_veiculo && (
                  <Image source={{ uri: perfil.veiculo.foto_veiculo }} style={styles.vehiclePreview} />
                )}
              </>
            )}
          </View>
        </View>

        {/* SECÇÃO 3: DOCUMENTAÇÃO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentação Digital</Text>
          <View style={styles.card}>
             <Text style={styles.subLabel}>Bilhete de Identidade</Text>
             <View style={styles.row}>
                <UploadBox label="Frente" hasFile={!!perfil?.foto_bi_frente} newFile={fotos.bi_frente} onPress={() => pickImage('bi_frente')} editando={editando} />
                <UploadBox label="Verso" hasFile={!!perfil?.foto_bi_verso} newFile={fotos.bi_verso} onPress={() => pickImage('bi_verso')} editando={editando} />
             </View>
             
             <Text style={[styles.subLabel, {marginTop: 15}]}>Carta de Condução</Text>
             <View style={styles.row}>
                <UploadBox label="Frente" hasFile={!!perfil?.foto_carta_frente} newFile={fotos.carta_frente} onPress={() => pickImage('carta_frente')} editando={editando} />
                <UploadBox label="Verso" hasFile={!!perfil?.foto_carta_verso} newFile={fotos.carta_verso} onPress={() => pickImage('carta_verso')} editando={editando} />
             </View>

             <Text style={[styles.subLabel, {marginTop: 15}]}>Livrete</Text>
             <UploadBox label="Livrete Completo" fullWidth hasFile={!!perfil?.foto_livrete} newFile={fotos.livrete} onPress={() => pickImage('livrete')} editando={editando} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={20} color={COLORS.DANGER} />
          <Text style={styles.logoutText}>Encerrar Sessão Profissional</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// COMPONENTES AUXILIARES
const InfoRow = ({ icon, label, value, last }: any) => (
  <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
    <MaterialIcons name={icon} size={18} color={COLORS.PRIMARY} />
    <View style={{ marginLeft: 12 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '---'}</Text>
    </View>
  </View>
);

const InputGroup = ({ icon, label, value, onChange, keyboard = "default" }: any) => (
  <View style={styles.inputGroup}>
    <MaterialIcons name={icon} size={18} color={COLORS.TEXT_MUTED} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={keyboard} placeholder="..." placeholderTextColor="#444" />
    </View>
  </View>
);

const UploadBox = ({ label, hasFile, newFile, onPress, editando, fullWidth }: any) => {
    const active = !!(newFile || hasFile);
    return (
        <TouchableOpacity onPress={onPress} disabled={!editando} style={[styles.uploadBox, fullWidth && { width: '100%' }, active && { borderColor: COLORS.PRIMARY }]}>
            {newFile ? <Image source={{ uri: newFile.uri }} style={styles.imgFull} /> : (hasFile ? <MaterialIcons name="verified" size={24} color={COLORS.PRIMARY} /> : <MaterialIcons name="add-a-photo" size={24} color={COLORS.TEXT_MUTED} />)}
            <Text style={[styles.uploadText, active && { color: COLORS.PRIMARY }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_DARK },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.CARD_DARK, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.TEXT_LIGHT },
  scroll: { padding: 20, paddingBottom: 100 },
  hero: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.PRIMARY, padding: 3 },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.PRIMARY, padding: 6, borderRadius: 15, borderWidth: 2, borderColor: COLORS.BG_DARK },
  nameText: { fontSize: 22, fontWeight: 'bold', color: COLORS.TEXT_LIGHT, marginTop: 15 },
  roleText: { fontSize: 12, color: COLORS.PRIMARY, fontWeight: 'bold', letterSpacing: 1.2, textTransform: 'uppercase' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: COLORS.TEXT_MUTED, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  card: { backgroundColor: COLORS.CARD_DARK, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { fontSize: 10, color: COLORS.TEXT_MUTED, fontWeight: 'bold' },
  infoValue: { fontSize: 14, color: COLORS.TEXT_LIGHT, marginTop: 2 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 12 },
  inputLabel: { fontSize: 9, color: COLORS.PRIMARY, fontWeight: 'bold', textTransform: 'uppercase' },
  input: { color: '#fff', fontSize: 15, paddingVertical: 2 },
  subLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.TEXT_MUTED, marginBottom: 10, marginTop: 5 },
  row: { flexDirection: 'row', gap: 10 },
  uploadBox: { flex: 1, height: 80, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.BORDER, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', position: 'absolute' },
  uploadText: { fontSize: 10, fontWeight: 'bold', color: COLORS.TEXT_MUTED, marginTop: 5 },
  vehiclePreview: { width: '100%', height: 150, borderRadius: 15, marginTop: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, backgroundColor: COLORS.DANGER_MUTED, marginTop: 20 },
  logoutText: { color: COLORS.DANGER, fontWeight: 'bold', marginLeft: 10 }
});