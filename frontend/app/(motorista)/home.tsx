import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import MapaHome from '../../components/MapaHome';
import TutorialModal from '../../components/TutorialModal';
// import { useNotifications } from '../../hooks/useNotifications';


const COLORS = {
  PRIMARY: '#10b981',
  BG_DARK: '#111827',
  CARD_DARK: '#1e293b',
  TEXT_LIGHT: '#f1f5f9',
  TEXT_MUTED: '#94a3b8',
  BORDER: '#334155',
  DANGER: '#ef4444',
  WARNING: '#f59e0b',
};

export default function MotoristaHome() {
  const router = useRouter();
  const { token, API_URL } = useAuth();
  // useNotifications(token);
  
  const [perfil, setPerfil] = useState<any>(null);
  const [entregasDisponiveis, setEntregasDisponiveis] = useState<any[]>([]);
  const [viagemAtiva, setViagemAtiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [iniciandoTransito, setIniciandoTransito] = useState(false);
  
  // 🛡️ Lógica Blindada: Só é 'true' se o campo vier do Django exatamente como o booleano false.
  const docsPendentes = perfil?.documentos_enviados === false;

  // ✅ CORREÇÃO: Endpoint apontado para o que configuramos no backend + Cache Busting
  const fetchPerfil = useCallback(async () => {
    if (!token) return;
    try {
      const timestamp = Date.now();
      const res = await fetch(`${API_URL}/api/motorista/meu-perfil/?t=${timestamp}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setPerfil(data);
      }
    } catch (e) {
      console.error('Erro ao buscar perfil:', e);
    }
  }, [token, API_URL]);

  // 🔄 Função para o "Puxar para Atualizar"
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Aqui chamas todas as funções que carregam dados na tua Home
      await fetchPerfil();
      // Se tiveres outras funções como fetchEntregas(), chama-as aqui também:
      // await fetchEntregas(); 
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    } finally {
      setRefreshing(false); // Esconde o ícone de carregamento
    }
  }, [fetchPerfil]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      let lat = 0;
      let lon = 0;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Tenta localização actual; se falhar usa a última conhecida
          const location = await Location.getCurrentPositionAsync({})
            .catch(() => Location.getLastKnownPositionAsync());

          if (location) {
            lat = location.coords.latitude;
            lon = location.coords.longitude;
          }
        }
      } catch {
        console.warn('Localização indisponível — a carregar cargas sem filtro de distância.');
      }

      const res = await fetch(`${API_URL}/api/cargas/disponiveis/?lat=${lat}&lon=${lon}&raio=30&t=${Date.now()}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      setEntregasDisponiveis(Array.isArray(data) ? data : data.cargas || []);
    } catch (e) {
      console.error('Erro ao buscar cargas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, API_URL]);

  const fetchViagemAtiva = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/cargas/ativa/?t=${Date.now()}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Cache-Control': 'no-cache',
        },
      });

      const text = await res.text();
      if (!text || text.trim() === '') {
        setViagemAtiva(null);
        return;
      }

      const data = JSON.parse(text);

      if (!data || data.viagem === null || !data.id) {
        setViagemAtiva(null);
      } else {
        setViagemAtiva(data);
      }
    } catch (e) {
      console.error('Erro ao buscar viagem ativa:', e);
      setViagemAtiva(null); 
    }
  }, [token, API_URL]);

  const wsUrl = API_URL ? `${API_URL.replace('http', 'ws')}/ws/cargas/?token=${token}` : '';
  useWebSocket({
    url: wsUrl,
    onMessage: () => { fetchData(); fetchViagemAtiva(); },
    onConnect: () => console.log('✅ WebSocket Conectado'),
  });

  // ✅ CORREÇÃO: Substitui o useEffect por useFocusEffect
  // Sempre que a página é focada (ex: vindo da carteira), ele roda novamente
  useFocusEffect(
    useCallback(() => {
      fetchPerfil();
      fetchData();
      fetchViagemAtiva();
    }, [fetchPerfil, fetchData, fetchViagemAtiva])
  );

  const handleAceitar = async (id: number) => {
    if (!token) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_URL}/api/cargas/${id}/aceitar/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        Alert.alert("Viagem Aceite! 🚛", "Dirija-se ao local de recolha da carga.");
        const data = await res.json();

        // ✅ REDIRECIONA LOGO PARA A TELA DE ENTREGA
        router.push({ 
          pathname: '/(motorista)/detalhe-entrega', 
          params: { id: id } 
        } as any);
        
        setViagemAtiva(null);
        await fetchData();
        await fetchViagemAtiva();
        await fetchPerfil(); // Atualiza viagens disponíveis após aceitar
      } else {
        const errorData = await res.json();
        Alert.alert("Erro", errorData?.erro || "Não foi possível aceitar.");
      }
    } catch {
      Alert.alert("Erro", "Falha na conexão.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecusar = async (id: number) => {
    if (!token) return;
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_URL}/api/cargas/${id}/recusar/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        setEntregasDisponiveis(prev => prev.filter(c => c.id !== id));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleIniciarTransito = async () => {
    if (!token || !viagemAtiva) return;
    setIniciandoTransito(true);
    try {
      const res = await fetch(`${API_URL}/api/cargas/${viagemAtiva.id}/iniciar-transito/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        Alert.alert("Recolha Confirmada! 🚚", "Carga em trânsito. Boa viagem!");
        await fetchViagemAtiva();
      } else {
        const errorData = await res.json();
        Alert.alert("Erro", errorData?.erro || "Não foi possível confirmar a recolha.");
      }
    } catch {
      Alert.alert("Erro", "Falha na conexão.");
    } finally {
      setIniciandoTransito(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACEITE') return { label: 'A CAMINHO DA RECOLHA', color: COLORS.WARNING };
    if (status === 'EM_TRANSITO') return { label: 'EM TRÂNSITO', color: COLORS.PRIMARY };
    return { label: status, color: COLORS.TEXT_MUTED };
  };

  return (
    <View style={styles.container}>

      {/* 2. COLOCA O COMPONENTE AQUI (Logo no topo do return) */}
      <TutorialModal 
        perfilImg={perfil?.foto_perfil} 
        documentosPendentes={docsPendentes} 
      />

      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_DARK} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>NZILA PLUS</Text>
          <Text style={styles.brandSubtitle}>MOTORISTA</Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          {/* Botão de chat — só aparece se houver viagem activa */}
          {viagemAtiva && (
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => router.push('/(motorista)/chat-handler' as any)}
            >
              <MaterialIcons name="chat" size={22} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/(motorista)/perfil' as any)}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={24} color={COLORS.TEXT_MUTED} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPerfil(); fetchData(); fetchViagemAtiva(); }}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {/* LINHA 1 DE ESTATÍSTICAS */}
        <View style={[styles.statsContainer, { marginBottom: 12 }]}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Ganhos Totais</Text>
            <Text style={styles.statValue}>
              {perfil?.saldo ? parseFloat(perfil.saldo).toLocaleString('pt-AO') : '0'}
              <Text style={styles.statCurrency}> KZ</Text>
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Entregas Totais</Text>
            <Text style={styles.statValue}>{perfil?.total_entregas || '0'}</Text>
          </View>
        </View>

        {/* LINHA 2 DE ESTATÍSTICAS (NOVA) */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Viagens Disponíveis</Text>
            <Text style={styles.statValue}>{perfil?.viagens_disponiveis ?? '0'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Entregas Hoje</Text>
            <Text style={styles.statValue}>{perfil?.viagens_realizadas_hoje ?? '0'}</Text>
          </View>
        </View>

        <MapaHome />

        {/* CARD DE VIAGEM ATIVA */}
        {viagemAtiva && (() => {
          const badge = getStatusBadge(viagemAtiva.status);
          return (
            <View style={styles.activeTripCard}>
              <View style={styles.activeTripHeader}>
                <View style={[styles.pulseDot, { backgroundColor: badge.color }]} />
                <Text style={[styles.activeTripTitle, { color: badge.color }]}>{badge.label}</Text>
              </View>

              <Text style={styles.activeTripDest}>Para: {viagemAtiva.destino}</Text>
              <Text style={styles.activeTripOrig}>De: {viagemAtiva.origem}</Text>

              {viagemAtiva.status === 'ACEITE' ? (
                <View style={styles.tripButtonRow}>
                  <TouchableOpacity
                    style={styles.btnNavigate}
                    onPress={() => router.push({ pathname: '/(motorista)/detalhe-entrega', params: { id: viagemAtiva.id } } as any)}
                  >
                    <MaterialIcons name="navigation" size={18} color={COLORS.BG_DARK} />
                    <Text style={styles.btnNavigateText}>VER DETALHES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnConfirmPickup, iniciandoTransito && styles.btnDisabled]}
                    onPress={handleIniciarTransito}
                    disabled={iniciandoTransito}
                  >
                    {iniciandoTransito
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <MaterialIcons name="check-circle" size={18} color="#fff" />
                          <Text style={styles.btnConfirmPickupText}>CONFIRMAR RECOLHA</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.btnNavigate}
                  onPress={() => router.push({ pathname: '/(motorista)/detalhe-entrega', params: { id: viagemAtiva.id } } as any)}
                >
                  <MaterialIcons name="navigation" size={20} color={COLORS.BG_DARK} />
                  <Text style={styles.btnNavigateText}>RETOMAR NAVEGAÇÃO</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* SEÇÃO PEDIDOS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pedidos Disponíveis</Text>
          <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>AO VIVO</Text></View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.PRIMARY} size="large" style={{ marginTop: 40 }} />
        ) : entregasDisponiveis.length > 0 ? (
          entregasDisponiveis.map(carga => (
            <View key={carga.id} style={styles.orderCard}>
              
              <TouchableOpacity 
                style={styles.orderCardInner}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/(motorista)/detalhe-carga-motorista', params: { data: JSON.stringify(carga) } })}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderType}>
                    <MaterialIcons name="local-shipping" size={20} color={COLORS.PRIMARY} />
                    <Text style={styles.orderTypeText}>{carga.titulo || 'Carga'}</Text>
                  </View>
                  <Text style={styles.priceValue}>{parseFloat(carga.preco_frete).toLocaleString('pt-AO')} KZ</Text>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.routeLine} />
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: COLORS.PRIMARY }]} />
                    <Text style={styles.routeMainText}>{carga.origem}</Text>
                  </View>
                  <View style={[styles.routePoint, { marginTop: 12 }]}>
                    <View style={[styles.routeDot, { backgroundColor: COLORS.DANGER }]} />
                    <Text style={styles.routeMainText}>{carga.destino}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.btnRefuse}
                  onPress={() => handleRecusar(carga.id)}
                  disabled={actionLoadingId === carga.id}
                >
                  <Text style={styles.btnRefuseText}>RECUSAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnAccept, actionLoadingId === carga.id && styles.btnDisabled]}
                  onPress={() => handleAceitar(carga.id)}
                  disabled={actionLoadingId === carga.id}
                >
                  {actionLoadingId === carga.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.btnAcceptText}>ACEITAR</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="radar" size={48} color={COLORS.BORDER} />
            <Text style={styles.emptyStateText}>Nenhuma carga por perto...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.BORDER, backgroundColor: COLORS.BG_DARK
  },
  brandTitle: { fontSize: 20, fontWeight: '900', color: COLORS.PRIMARY },
  brandSubtitle: { fontSize: 10, fontWeight: '700', color: COLORS.TEXT_MUTED, letterSpacing: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.CARD_DARK, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.BORDER
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.PRIMARY },
  onlineText: { color: COLORS.TEXT_LIGHT, fontSize: 12, fontWeight: '600' },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.CARD_DARK, justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: COLORS.CARD_DARK, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.BORDER },
  statLabel: { fontSize: 12, color: COLORS.TEXT_MUTED, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.TEXT_LIGHT },
  statCurrency: { fontSize: 10, color: COLORS.TEXT_MUTED },

  // VIAGEM ATIVA
  activeTripCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: COLORS.PRIMARY,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24
  },
  activeTripHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  activeTripTitle: { fontWeight: '900', fontSize: 12 },
  activeTripDest: { color: COLORS.TEXT_LIGHT, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  activeTripOrig: { color: COLORS.TEXT_MUTED, fontSize: 13, marginBottom: 16 },
  tripButtonRow: { flexDirection: 'row', gap: 8 },
  btnNavigate: {
    flex: 1, backgroundColor: COLORS.PRIMARY, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 6
  },
  btnNavigateText: { color: COLORS.BG_DARK, fontWeight: '900', fontSize: 13 },
  btnConfirmPickup: {
    flex: 1, backgroundColor: COLORS.WARNING, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 6
  },
  btnConfirmPickupText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.TEXT_LIGHT },
  liveBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveBadgeText: { color: COLORS.PRIMARY, fontSize: 10, fontWeight: '900' },
  orderCard: { backgroundColor: COLORS.CARD_DARK, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: COLORS.BORDER },
  orderCardInner: { padding: 16 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  orderType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderTypeText: { color: COLORS.TEXT_LIGHT, fontWeight: 'bold' },
  priceValue: { color: COLORS.PRIMARY, fontSize: 18, fontWeight: '900' },
  routeContainer: { paddingLeft: 10 },
  routeLine: { position: 'absolute', left: 16, top: 10, bottom: 10, width: 1, backgroundColor: COLORS.BORDER },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeMainText: { color: COLORS.TEXT_LIGHT, fontSize: 13 },
  actionButtons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.BORDER },
  btnRefuse: { flex: 1, padding: 16, alignItems: 'center' },
  btnRefuseText: { color: COLORS.DANGER, fontWeight: 'bold' },
  btnAccept: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: COLORS.PRIMARY },
  btnAcceptText: { color: '#fff', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { color: COLORS.TEXT_MUTED, marginTop: 10 }
});