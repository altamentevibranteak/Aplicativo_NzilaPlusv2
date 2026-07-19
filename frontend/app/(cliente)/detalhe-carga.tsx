import { MaterialIcons } from '@expo/vector-icons'; // Padronizado com nova-carga
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapaRota from '../../components/MapaRota';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';

// Configuração de Status (Cores semânticas)
const getStatusConfig = (isDark: boolean) => ({
  PENDENTE:    { label: 'Pendente',    color: '#F5A623', bg: isDark ? '#422200' : '#FEF3C7', icon: '⏳' },
  EM_TRANSITO: { label: 'Em Trânsito', color: '#3B82F6', bg: isDark ? '#002B40' : '#E0F2FE', icon: '🚛' },
  ENTREGUE:    { label: 'Entregue',    color: '#10B981', bg: isDark ? '#003300' : '#DCFCE7', icon: '✅' },
  CANCELADO:   { label: 'Cancelado',   color: '#EF5350', bg: isDark ? '#330000' : '#FEE2E2', icon: '❌' },
});

export default function DetalheCarga() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { token, API_URL, isDarkMode } = useAuth();

  const [carga, setCarga] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelandoCarga, setCanceladoCarga] = useState(false);
  const [wsConectado, setWsConectado] = useState(false);
  const [wsUrl, setWsUrl] = useState<string>('');

  // Tema Dinâmico
  const theme = useMemo(() => ({
    bg: isDarkMode ? '#0F172A' : '#F8FAFC',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    border: isDarkMode ? '#334155' : '#E2E8F0',
    headerBg: isDarkMode ? '#1E293B' : '#FFFFFF',
  }), [isDarkMode]);

  const STATUS_CONFIG = useMemo(() => getStatusConfig(isDarkMode), [isDarkMode]);

  useEffect(() => {
    async function fetchCarga() {
      try {
        // Corrigido para /api/cargas/ conforme o Swagger
        const response = await fetch(`${API_URL}/api/cargas/${id}/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
        
        if (!response.ok) throw new Error('Carga não encontrada');
        
        const data = await response.json();
        setCarga(data);
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível carregar os detalhes da carga.');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchCarga();
  }, [id]);

  // Construir URL do WebSocket depois que a carga é carregada
  useEffect(() => {
    if (carga && id && token && API_URL) {
      // Converte http:// para ws:// ou https:// para wss://
      const wsBaseUrl = API_URL.replace(/^https?:/, 'ws:');
      const url = `${wsBaseUrl}/ws/cargas/${id}/?token=${token}`;
      setWsUrl(url);
    }
  }, [carga, id, token, API_URL]);

  // Handlers para o WebSocket
  const handleWsConnect = useCallback(() => {
    console.log('✅ WebSocket conectado para a carga:', id);
    setWsConectado(true);
  }, [id]);

  const handleWsMessage = useCallback((data: any) => {
    console.log('📨 Atualização em tempo real da carga:', data);
    
    // Atualiza o status da carga em tempo real
    if (data.status) {
      setCarga((prevCarga: any) => ({
        ...prevCarga,
        status: data.status,
      }));
      console.log(`✅ Status da carga atualizado para: ${data.status}`);
    }
  }, []);

  const handleWsError = useCallback((error: any) => {
    console.error('❌ Erro no WebSocket:', error);
    setWsConectado(false);
  }, []);

  const handleWsClose = useCallback(() => {
    console.log('❌ WebSocket desconectado');
    setWsConectado(false);
  }, []);

  // Usar o hook de WebSocket
  useWebSocket({
    url: wsUrl,
    onConnect: handleWsConnect,
    onMessage: handleWsMessage,
    onError: handleWsError,
    onClose: handleWsClose,
  });

  // Função para cancelar a carga
  async function handleCancelar() {
    Alert.alert(
      '⚠️ Cancelar Carga',
      'Tens a certeza que queres cancelar esta carga? Esta acção não pode ser desfeita.',
      [
        { text: 'Não, voltar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Sim, cancelar',
          onPress: async () => {
            setCanceladoCarga(true);
            try {
              const response = await fetch(`${API_URL}/api/cargas/${id}/cancelar/`, {
                method: 'POST',
                headers: {
                  'Authorization': `Token ${token}`,
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true',
                },
              });

              const data = await response.json();

              if (!response.ok) {
                // Erro do backend (status 400 ou 403)
                Alert.alert('Erro', data.erro || 'Não foi possível cancelar a carga.');
                setCanceladoCarga(false);
                return;
              }

              // Sucesso (status 200)
              Alert.alert('✅ Sucesso', data.mensagem || 'Carga cancelada com sucesso!', [
                {
                  text: 'OK',
                  onPress: () => {
                    setCarga({ ...carga, status: 'CANCELADO' });
                    setCanceladoCarga(false);
                  }
                }
              ]);
            } catch (error) {
              Alert.alert('Erro de Rede', 'Não foi possível conectar ao servidor. Tenta novamente.');
              setCanceladoCarga(false);
            }
          },
          style: 'destructive',
        }
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (!carga) return null;

  const st = STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDENTE;
  const preco = parseFloat(carga.preco_frete || 0).toLocaleString('pt-AO');

  console.log("DADOS DO MAPA:", carga.origem_coords);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.headerBg} />
      
      {/* Header Padronizado (Igual ao Histórico/Nova Carga) */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border}]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.bg }]}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Detalhe da Carga</Text>
        {/* Indicador de status WebSocket */}
        <View style={[styles.wsIndicator, { backgroundColor: wsConectado ? '#10B981' : '#94A3B8' }]}>
          <View style={styles.wsIndicatorDot} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Foto com Badge de Status Flutuante */}
        <View>
          {carga.foto_carga ? (
            <Image source={{ uri: carga.foto_carga }} style={styles.foto} resizeMode="cover" />
          ) : (
            <View style={[styles.fotoPlaceholder, { backgroundColor: theme.border }]}>
              <MaterialIcons name="image-not-supported" size={40} color={theme.subText} />
            </View>
          )}
          <View style={[styles.statusFloatingBadge, { backgroundColor: st.bg }]}>
             <Text style={[styles.statusText, { color: st.color }]}>{st.icon} {st.label}</Text>
          </View>
        </View>

        {/* Título e Preço */}
        <View style={styles.heroSection}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cargaTitulo, { color: theme.text }]}>{carga.titulo}</Text>
            <Text style={[styles.categoriaText, { color: theme.subText }]}>{carga.categoria.toUpperCase()}</Text>
          </View>
          <Text style={[styles.cargaPreco, { color: theme.accent }]}>{preco} Kz</Text>
        </View>

        {/* Componente de Mapa (Versão Lite para Expo Go) */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
           <MapaRota 
             origemCoords={carga.origem_coords.split(',').reverse().map(Number) as [number, number]} 
             destinoCoords={carga.destino_coords.split(',').reverse().map(Number) as [number, number]}
             origemLabel={carga.origem}
             destinoLabel={carga.destino}
           />
        </View>

        {/* Informações em Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>INFORMAÇÕES DA ENTREGA</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <InfoRow icon="description" label="Descrição" value={carga.descricao || 'Sem descrição'} theme={theme} />
            <InfoRow icon="scale" label="Peso Estimado" value={`${carga.peso_kg} kg`} theme={theme} />
            <InfoRow icon="local-shipping" label="Tipo de Serviço" value={carga.tipo_servico} theme={theme} />
            <InfoRow icon="person" label="Acompanhada" value={carga.acompanhada ? 'Sim' : 'Não'} theme={theme} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>RASTREAMENTO</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
             <InfoRow icon="history" label="Criado em" value={new Date(carga.data_criacao).toLocaleString('pt-PT')} theme={theme} />
             {carga.data_entrega && (
               <InfoRow icon="check-circle" label="Entregue em" value={new Date(carga.data_entrega).toLocaleString('pt-PT')} theme={theme} />
             )}
          </View>
        </View>

        {/* Botão de Cancelamento - Apenas para cargas PENDENTE */}
        {carga.status === 'PENDENTE' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.btnCancelar, { opacity: cancelandoCarga ? 0.6 : 1 }]}
              onPress={handleCancelar}
              disabled={cancelandoCarga}
            >
              {cancelandoCarga ? (
                <ActivityIndicator color={theme.card} size="small" />
              ) : (
                <>
                  <MaterialIcons name="block" size={22} color={theme.card} />
                  <Text style={styles.btnCancelarText}>Cancelar Carga</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, theme }: any) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <MaterialIcons name={icon} size={20} color={theme.accent} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ fontSize: 11, color: theme.subText, fontWeight: '700' }}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 15, color: theme.text, marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  foto: { width: '100%', height: 220 },
  fotoPlaceholder: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
  statusFloatingBadge: {
    position: 'absolute', bottom: 15, right: 20,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  statusText: { fontSize: 12, fontWeight: '800' },
  heroSection: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cargaTitulo: { fontSize: 22, fontWeight: '900' },
  categoriaText: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  cargaPreco: { fontSize: 22, fontWeight: '900' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10, marginLeft: 5 },
  card: { borderRadius: 20, padding: 15, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  btnCancelar: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  btnCancelarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  wsIndicator: {
    width: 35,
    height: 35,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});