import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react'; // Tira o useEffect
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
import MapaRota from '../../components/MapaRota';
import { useAuth } from '../../context/AuthContext';

// Cores Premium Dark
const COLORS = {
  PRIMARY: '#10b981',
  PRIMARY_MUTED: 'rgba(16, 185, 129, 0.1)',
  BG_DARK: '#111827',
  CARD_DARK: '#1e293b',
  TEXT_LIGHT: '#f1f5f9',
  TEXT_MUTED: '#94a3b8',
  BORDER: '#334155',
  WARNING: '#eab308',
  WARNING_MUTED: 'rgba(234, 179, 8, 0.1)',
  DANGER: '#ef4444',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  EM_TRANSITO: { label: 'Em Curso', color: COLORS.WARNING, bg: COLORS.WARNING_MUTED, icon: 'local-shipping' },
  ENTREGUE:    { label: 'Concluído', color: COLORS.PRIMARY, bg: COLORS.PRIMARY_MUTED, icon: 'check-circle' },
  PENDENTE:    { label: 'Pendente', color: COLORS.TEXT_MUTED, bg: COLORS.BORDER, icon: 'hourglass-empty' },
};

export default function DetalheEntrega() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { token, API_URL } = useAuth();

  const [carga, setCarga] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);

  // 2. Transforma o fetch numa função memorizada com useCallback
  const fetchCarga = useCallback(async () => {
    if (!id || !token) return;
    
    try {
      // Adicionamos o timestamp para evitar cache do browser/ngrok
      const response = await fetch(`${API_URL}/api/cargas/${id}/?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Token ${token}`, 
          'ngrok-skip-browser-warning': 'true' 
        },
      });
      const data = await response.json();
      setCarga(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível carregar a entrega.');
    } finally {
      setLoading(false);
    }
  }, [id, token, API_URL]);

  useFocusEffect(
    useCallback(() => {
      fetchCarga();
    }, [fetchCarga])
  );

  async function handleFinalizar() {
    Alert.alert(
      'Confirmar entrega',
      'Tens a certeza que queres marcar esta carga como entregue?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', onPress: async () => {
            setFinalizando(true);
            try {
              // Certifiquei-me de incluir /api/ na rota de finalizar
              const response = await fetch(`${API_URL}/api/cargas/${id}/finalizar-entrega/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}`, 'ngrok-skip-browser-warning': 'true' },
              });
              
              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.erro || 'Erro ao finalizar entrega.');
              }
              
              // Se a API retornar a carga atualizada, atualizamos o state, senão recarregamos
              const data = await response.json();
              setCarga(data.carga || data); 
              Alert.alert('Sucesso!', 'A viagem foi marcada como concluída.');
              
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setFinalizando(false);
            }
          }
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.PRIMARY} size="large" />
      </View>
    );
  }

  if (!carga) return null;

  const st = STATUS_CONFIG[carga.status] || STATUS_CONFIG.EM_TRANSITO;
  const preco = parseFloat(carga.preco_frete || 0).toLocaleString('pt-AO');
  const podeEntregue = carga.status === 'EM_TRANSITO';

  // Extração segura dos nomes de origem e destino
  const origemNome = carga.origem?.morada || carga.origem || 'Local de recolha';
  const destinoNome = carga.destino?.morada || carga.destino || 'Local de entrega';

  function parseCoords(coords: string): [number, number] | null {
    if (!coords) return null;
    const parts = coords.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lng, lat]; // Mapbox usa [longitude, latitude]
  }

  const origemCoords = parseCoords(carga.origem_coords);
  const destinoCoords = parseCoords(carga.destino_coords);
  const temMapa = origemCoords && destinoCoords;

  console.log("DADOS DO MAPA:", carga.origem_coords);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_DARK} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: podeEntregue ? 120 : 40 }}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={18} color={COLORS.TEXT_LIGHT} />
          </TouchableOpacity>
          <Text style={styles.title}>Detalhe da Viagem</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <MaterialIcons name={st.icon} size={14} color={st.color} />
            <Text style={[styles.statusText, { color: st.color, marginLeft: 4 }]}>{st.label}</Text>
          </View>
        </View>

        {/* FOTO DA CARGA (Se existir) */}
        {carga.foto_carga && (
          <Image source={{ uri: carga.foto_carga }} style={styles.foto} resizeMode="cover" />
        )}

        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Text style={styles.cargaTitulo}>{carga.titulo || 'Carga sem título'}</Text>
          <Text style={styles.cargaPreco}>{preco} Kz</Text>
        </View>

        {/* MAPA */}
        {temMapa && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>MAPA DA ROTA</Text>
            <View style={styles.mapContainer}>
              <MapaRota
                origemCoords={origemCoords}
                destinoCoords={destinoCoords}
                origemLabel={origemNome}
                destinoLabel={destinoNome}
              />
            </View>
          </View>
        )}

        {/* ROTA VISUAL */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ROTA DA VIAGEM</Text>
          <View style={styles.rotaContainer}>
            <View style={styles.rotaPonto}>
              <View style={[styles.rotaIconBox, { backgroundColor: COLORS.PRIMARY_MUTED }]}>
                <MaterialIcons name="trip-origin" size={16} color={COLORS.PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rotaLabel}>RECOLHA</Text>
                <Text style={styles.rotaValue}>{origemNome}</Text>
              </View>
            </View>
            
            <View style={styles.rotaLinhaWrapper}>
              <View style={styles.rotaLinha} />
            </View>
            
            <View style={styles.rotaPonto}>
              <View style={[styles.rotaIconBox, { backgroundColor: COLORS.WARNING_MUTED }]}>
                <MaterialIcons name="location-on" size={16} color={COLORS.WARNING} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rotaLabel}>ENTREGA</Text>
                <Text style={styles.rotaValue}>{destinoNome}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* DETALHES DA CARGA */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DETALHES DA CARGA</Text>
          <InfoRow icon="description" label="Descrição" value={carga.descricao || 'Sem descrição'} />
          <InfoRow icon="fitness-center" label="Peso Aproximado" value={`${carga.peso_kg || 0} kg`} />
          <InfoRow icon="category" label="Categoria" value={carga.categoria || 'Não especificada'} />
          <InfoRow icon="bolt" label="Tipo de serviço" value={carga.tipo_servico || 'Normal'} />
          <InfoRow icon="group" label="Cliente acompanha?" value={carga.acompanhada ? 'Sim' : 'Não'} last />
        </View>

        {/* DATAS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>HISTÓRICO</Text>
          <InfoRow icon="calendar-today" label="Criado em" value={new Date(carga.data_criacao).toLocaleString('pt-AO')} />
          {carga.data_entrega && (
            <InfoRow icon="verified" label="Entregue em" value={new Date(carga.data_entrega).toLocaleString('pt-AO')} last />
          )}
        </View>

      </ScrollView>

      {/* BOTÃO FIXO DE FINALIZAR */}
      {podeEntregue && (
        <View style={styles.fixedBottom}>
          <TouchableOpacity
            style={[styles.btnFinalizar, finalizando && styles.btnDisabled]}
            onPress={handleFinalizar}
            disabled={finalizando}
          >
            {finalizando ? (
              <ActivityIndicator color={COLORS.BG_DARK} />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color={COLORS.BG_DARK} />
                <Text style={styles.btnFinalizarText}>Marcar como Entregue</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// COMPONENTE AUXILIAR PARA LINHAS DE INFORMAÇÃO (AGORA COM MATERIAL ICONS)
function InfoRow({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[infoStyles.row, last && { borderBottomWidth: 0 }]}>
      <View style={infoStyles.iconBox}>
        <MaterialIcons name={icon} size={18} color={COLORS.PRIMARY} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  loadingContainer: { flex: 1, backgroundColor: COLORS.BG_DARK, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    backgroundColor: COLORS.BG_DARK, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.CARD_DARK, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.BORDER,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.TEXT_LIGHT, flex: 1, textAlign: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  
  foto: { width: '100%', height: 220, backgroundColor: COLORS.CARD_DARK },
  
  heroSection: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cargaTitulo: { fontSize: 20, fontWeight: '900', color: COLORS.TEXT_LIGHT, flex: 1, marginRight: 12 },
  cargaPreco: { fontSize: 22, fontWeight: '900', color: COLORS.PRIMARY },
  
  sectionTitle: { fontSize: 11, fontWeight: '900', color: COLORS.TEXT_MUTED, letterSpacing: 1.5, marginBottom: 16 },
  
  mapSection: { marginHorizontal: 20, marginBottom: 16 },
  mapContainer: { height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.BORDER },
  
  card: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: COLORS.CARD_DARK, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  
  rotaContainer: { paddingVertical: 4 },
  rotaPonto: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rotaIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rotaLinhaWrapper: { paddingLeft: 15, marginVertical: 4 },
  rotaLinha: { width: 2, height: 24, backgroundColor: COLORS.BORDER },
  rotaLabel: { fontSize: 10, color: COLORS.TEXT_MUTED, fontWeight: '900', letterSpacing: 1 },
  rotaValue: { fontSize: 14, color: COLORS.TEXT_LIGHT, marginTop: 2, fontWeight: '500' },
  
  fixedBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderTopWidth: 1, borderTopColor: COLORS.BORDER,
  },
  btnFinalizar: {
    backgroundColor: COLORS.PRIMARY, borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnFinalizarText: { fontSize: 16, fontWeight: '900', color: COLORS.BG_DARK },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.PRIMARY_MUTED, justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1 },
  label: { fontSize: 11, color: COLORS.TEXT_MUTED, fontWeight: 'bold', marginBottom: 2 },
  value: { fontSize: 14, color: COLORS.TEXT_LIGHT, fontWeight: '500' },
});