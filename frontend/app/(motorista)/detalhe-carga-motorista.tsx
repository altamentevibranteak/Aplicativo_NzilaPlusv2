import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapaRota from '../../components/MapaRota';
import { useAuth } from '../../context/AuthContext';

const getStatusConfig = (isDark: boolean) => ({
  PENDENTE:    { label: 'Disponível',   color: '#F5A623', bg: isDark ? '#422200' : '#FEF3C7', icon: 'hourglass-empty' as const },
  EM_TRANSITO: { label: 'Em Curso',     color: '#3B82F6', bg: isDark ? '#002B40' : '#E0F2FE', icon: 'local-shipping' as const },
  ENTREGUE:    { label: 'Entregue',     color: '#10B981', bg: isDark ? '#003300' : '#DCFCE7', icon: 'check-circle' as const },
  CANCELADO:   { label: 'Cancelado',    color: '#EF5350', bg: isDark ? '#330000' : '#FEE2E2', icon: 'block' as const },
});

export default function DetalheCargaMotorista() {
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const { token, API_URL, isDarkMode } = useAuth();

  // Lê os dados diretamente dos params — sem fetch
  const carga = useMemo(() => {
    try {
      return data ? JSON.parse(data as string) : null;
    } catch {
      return null;
    }
  }, [data]);

  const [aceitando, setAceitando] = useState(false);

  const theme = useMemo(() => ({
    bg: isDarkMode ? '#0F172A' : '#F8FAFC',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    accent: '#10B981',
    border: isDarkMode ? '#334155' : '#E2E8F0',
    headerBg: isDarkMode ? '#1E293B' : '#FFFFFF',
  }), [isDarkMode]);

  const STATUS_CONFIG = useMemo(() => getStatusConfig(isDarkMode), [isDarkMode]);

  if (!carga) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <MaterialIcons name="error-outline" size={48} color={theme.subText} />
        <Text style={{ color: theme.subText, marginTop: 12, fontSize: 15 }}>Dados da carga não encontrados.</Text>
      </View>
    );
  }

  async function handleAceitar() {
    Alert.alert(
      '🚛 Aceitar Carga',
      'Tens a certeza que queres aceitar esta carga? Serás responsável pela entrega.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setAceitando(true);
            try {
              const response = await fetch(`${API_URL}/api/cargas/${carga.id}/aceitar/`, {
                method: 'POST',
                headers: {
                  'Authorization': `Token ${token}`,
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true',
                },
              });

              const data = await response.json();

              if (!response.ok) {
                Alert.alert('Erro', data.erro || 'Não foi possível aceitar a carga.');
                return;
              }

              Alert.alert('✅ Carga Aceite!', data.mensagem || 'A carga foi aceite com sucesso. Boa viagem!', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(motorista)/home'),
                },
              ]);
            } catch (error) {
              Alert.alert('Erro de Rede', 'Não foi possível conectar ao servidor. Tenta novamente.');
            } finally {
              setAceitando(false);
            }
          },
        },
      ]
    );
  }

  const st = STATUS_CONFIG[carga.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDENTE;
  const preco = parseFloat(carga.preco_frete || 0).toLocaleString('pt-AO');
  const podeAceitar = carga.status === 'PENDENTE';

  const temMapa = carga.origem_coords && carga.destino_coords;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.bg }]}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Detalhe da Carga</Text>
        {/* Badge de status */}
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <MaterialIcons name={st.icon} size={14} color={st.color} />
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: podeAceitar ? 120 : 40 }}
      >
        {/* Foto ou placeholder */}
        {carga.foto_carga ? (
          <Image source={{ uri: carga.foto_carga }} style={styles.foto} resizeMode="cover" />
        ) : (
          <View style={[styles.fotoPlaceholder, { backgroundColor: theme.border }]}>
            <MaterialIcons name="image-not-supported" size={48} color={theme.subText} />
            <Text style={[styles.fotoPlaceholderText, { color: theme.subText }]}>Sem foto da carga</Text>
          </View>
        )}

        {/* Título e Preço */}
        <View style={styles.heroSection}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cargaTitulo, { color: theme.text }]}>
              {carga.titulo || 'Carga sem título'}
            </Text>
            <Text style={[styles.categoriaText, { color: theme.subText }]}>
              {(carga.categoria || 'Geral').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.precoBox, { backgroundColor: isDarkMode ? '#052e16' : '#dcfce7' }]}>
            <Text style={[styles.precoLabel, { color: theme.accent }]}>Frete</Text>
            <Text style={[styles.cargaPreco, { color: theme.accent }]}>{preco} Kz</Text>
          </View>
        </View>

        {/* Mapa da Rota */}
        {temMapa && (
          <View style={styles.mapSection}>
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>MAPA DA ROTA</Text>
            <MapaRota
              origemCoords={
                carga.origem_coords
                  .split(',')
                  .map((c: string) => Number(c.trim()))
                  .reverse() as [number, number]
              }
              destinoCoords={
                carga.destino_coords
                  .split(',')
                  .map((c: string) => Number(c.trim()))
                  .reverse() as [number, number]
              }
              origemLabel={carga.origem}
              destinoLabel={carga.destino}
            />
          </View>
        )}

        {/* Rota Visual */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>ROTA DA VIAGEM</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.rotaPonto}>
              <View style={[styles.rotaIconBox, { backgroundColor: isDarkMode ? '#052e16' : '#dcfce7' }]}>
                <MaterialIcons name="trip-origin" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rotaLabel, { color: theme.subText }]}>RECOLHA</Text>
                <Text style={[styles.rotaValue, { color: theme.text }]}>
                  {carga.origem?.morada || carga.origem || 'Local de recolha'}
                </Text>
              </View>
            </View>
            <View style={styles.rotaLinhaWrapper}>
              <View style={[styles.rotaLinha, { backgroundColor: theme.border }]} />
            </View>
            <View style={styles.rotaPonto}>
              <View style={[styles.rotaIconBox, { backgroundColor: isDarkMode ? '#422200' : '#FEF3C7' }]}>
                <MaterialIcons name="location-on" size={18} color="#F5A623" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rotaLabel, { color: theme.subText }]}>ENTREGA</Text>
                <Text style={[styles.rotaValue, { color: theme.text }]}>
                  {carga.destino?.morada || carga.destino || 'Local de entrega'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Detalhes da Carga */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>DETALHES DA CARGA</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <InfoRow icon="description"    label="Descrição"         value={carga.descricao || 'Sem descrição'} theme={theme} />
            <InfoRow icon="fitness-center" label="Peso Aproximado"   value={`${carga.peso_kg || 0} kg`} theme={theme} />
            <InfoRow icon="category"       label="Categoria"         value={carga.categoria || 'Não especificada'} theme={theme} />
            <InfoRow icon="bolt"           label="Tipo de Serviço"   value={carga.tipo_servico || 'Normal'} theme={theme} />
            <InfoRow icon="group"          label="Cliente acompanha" value={carga.acompanhada ? 'Sim' : 'Não'} theme={theme} last />
          </View>
        </View>

        {/* Histórico */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>INFORMAÇÃO</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <InfoRow
              icon="calendar-today"
              label="Publicado em"
              value={new Date(carga.data_criacao).toLocaleString('pt-AO')}
              theme={theme}
              last
            />
          </View>
        </View>
      </ScrollView>

      {/* Botão fixo de Aceitar — só aparece se PENDENTE */}
      {podeAceitar && (
        <View style={[styles.fixedBottom, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.97)' : 'rgba(248,250,252,0.97)', borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.btnAceitar, aceitando && styles.btnDisabled]}
            onPress={handleAceitar}
            disabled={aceitando}
          >
            {aceitando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="local-shipping" size={22} color="#fff" />
                <Text style={styles.btnAceitarText}>Aceitar Esta Carga</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({
  icon, label, value, theme, last,
}: {
  icon: any; label: string; value: string; theme: any; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.infoIconBox, { backgroundColor: isDarkBg(theme.bg) ? '#052e16' : '#dcfce7' }]}>
        <MaterialIcons name={icon} size={18} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: theme.subText, fontWeight: '700' }}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 14, color: theme.text, marginTop: 2, fontWeight: '500' }}>{value}</Text>
      </View>
    </View>
  );
}

// Helper para detectar se o fundo é escuro
function isDarkBg(bg: string) {
  return bg === '#0F172A';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },

  foto: { width: '100%', height: 220 },
  fotoPlaceholder: {
    width: '100%', height: 180,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  fotoPlaceholderText: { fontSize: 13, fontWeight: '600' },

  heroSection: {
    padding: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  cargaTitulo: { fontSize: 22, fontWeight: '900' },
  categoriaText: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  precoBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  precoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cargaPreco: { fontSize: 18, fontWeight: '900', marginTop: 2 },

  mapSection: { paddingHorizontal: 20, marginBottom: 20 },

  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },

  rotaPonto: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rotaIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rotaLinhaWrapper: { paddingLeft: 17, marginVertical: 4 },
  rotaLinha: { width: 2, height: 24 },
  rotaLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  rotaValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  fixedBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, borderTopWidth: 1,
  },
  btnAceitar: {
    backgroundColor: '#10B981',
    borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    elevation: 4, shadowColor: '#10B981', shadowOpacity: 0.4, shadowRadius: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnAceitarText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});