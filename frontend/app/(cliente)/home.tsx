import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import MapaHome from '../../components/MapaHome';
import ModalAvaliacao from '../../components/ModalAvaliacao';
// import { useNotifications } from '../../hooks/useNotifications';

// ─────────────────────────────────────────────
// Tema
// ─────────────────────────────────────────────

const themeColors = {
  light: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    subText: '#64748B',
    border: '#E2E8F0',
    headerBg: '#FFFFFF',
  },
  dark: {
    bg: '#0F172A',
    card: '#1E293B',
    text: '#F1F5F9',
    subText: '#94A3B8',
    border: '#334155',
    headerBg: '#1E293B',
  },
  accent: '#3B82F6',
  white: '#FFFFFF',
};

// ─────────────────────────────────────────────
// Ecrã principal
// ─────────────────────────────────────────────

export default function HomeCliente() {
  const { user, isDarkMode, toggleTheme, token, API_URL } = useAuth();
  const router = useRouter();

  const colors = isDarkMode ? themeColors.dark : themeColors.light;

  // ─── Estado ──────────────────────────────────
  const [cargasRecentes,   setCargasRecentes]   = useState<any[]>([]);
  const [loadingCargas,    setLoadingCargas]    = useState(true);
  const [loadingAvaliacao, setLoadingAvaliacao] = useState(false);
  const [cargaParaAvaliar, setCargaParaAvaliar] = useState<any>(null);

  // ─── Fetch: cargas recentes ──────────────────

  const fetchCargasRecentes = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingCargas(true);
      const response = await fetch(`${API_URL}/api/cargas/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCargasRecentes(data.slice(0, 3));
        // Verifica se há entrega finalizada sem avaliação
        const pendente = data.find((c: any) => c.status === 'ENTREGUE' && !c.avaliacao);
        if (pendente) setCargaParaAvaliar(pendente);
      }
    } catch (error) {
      console.error('Erro ao buscar cargas recentes:', error);
    } finally {
      setLoadingCargas(false);
    }
  }, [token, API_URL]);

  // ─── Notificações push ────────────────────────
  // useNotifications(token);

  // ─── Carregar ao focar o ecrã ─────────────────
  useFocusEffect(
    useCallback(() => {
      fetchCargasRecentes();
    }, [fetchCargasRecentes])
  );

  // ─── Handler: enviar avaliação ───────────────

  const handleEnviarAvaliacao = async (nota: number, comentario: string) => {
    if (!cargaParaAvaliar) return;
    setLoadingAvaliacao(true);
    try {
      const res = await fetch(`${API_URL}/api/cargas/${cargaParaAvaliar.id}/avaliar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ avaliacao: nota, comentario }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert('Nzila Plus ⭐', 'Obrigado! A tua avaliação ajuda a melhorar o serviço.');
        setCargaParaAvaliar(null); // fecha o modal
        fetchCargasRecentes();    // actualiza a lista
      } else {
        Alert.alert('Erro', data.erro || 'Falha ao avaliar.');
      }
    } catch {
      Alert.alert('Erro', 'Erro de conexão com o servidor.');
    } finally {
      setLoadingAvaliacao(false);
    }
  };

  // ─── Helpers ─────────────────────────────────

  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE':    return '#F59E0B';
      case 'ACEITE':      return '#3B82F6';
      case 'EM_TRANSITO': return '#8B5CF6';
      case 'ENTREGUE':    return '#10B981';
      case 'CANCELADO':   return '#EF4444';
      default:            return colors.subText;
    }
  };

  // ─── Render ───────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar
        barStyle={!isDarkMode ? 'dark-content' : 'light-content'}
        backgroundColor={colors.headerBg}
      />

      {/* Modal de avaliação — aparece quando há entrega sem avaliação */}
      <ModalAvaliacao
        visivel={!!cargaParaAvaliar}
        nomeMotorista={cargaParaAvaliar?.motorista_nome || 'do Nzila'}
        onEnviar={handleEnviarAvaliacao}
        onCancelar={() => setCargaParaAvaliar(null)}
        loading={loadingAvaliacao}
      />

      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            NZILA <Text style={{ color: themeColors.accent }}>PLUS</Text>
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
            Conectando Cargas ao Destino
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.bg }]}
            onPress={toggleTheme}
          >
            <MaterialIcons
              name={!isDarkMode ? 'dark-mode' : ('light-mode' as any)}
              size={22}
              color={colors.subText}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(cliente)/perfil')}
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.username || 'Utilizador')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* Boas-vindas */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            Olá, {user?.username || 'Utilizador'} 👋
          </Text>
          <Text style={[styles.subWelcomeText, { color: colors.subText }]}>
            Precisas transportar uma carga hoje?
          </Text>
        </View>

        {/* Barra de endereço */}
        <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialIcons name="location-on" size={24} color={themeColors.accent} style={styles.locationIcon} />
          <View style={styles.addressTextContainer}>
            <Text style={[styles.addressLabel, { color: colors.subText }]}>Recolha atual</Text>
            <Text style={[styles.addressValue, { color: colors.text }]} numberOfLines={1}>
              Minha localização
            </Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <MaterialIcons name="edit" size={20} color={themeColors.accent} />
          </TouchableOpacity>
        </View>

        {/* Mapa preview */}
        <View style={[styles.mapPreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Motoristas próximos</Text>
            <View style={styles.liveBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.mapContainerInsideCard}>
            <MapaHome />
          </View>
        </View>

        {/* Ações rápidas */}
        <View style={styles.actionsGrid}>
          <ActionCard
            title="Nova entrega"
            subTitle="Reserve uma carga agora"
            icon="add-box"
            backgroundColor={themeColors.accent}
            textColor="#FFFFFF"
            iconContainerColor="#FFFFFF30"
            onPress={() => router.push('/(cliente)/nova-carga')}
          />
          <ActionCard
            title="Ver preço"
            subTitle="Estimar custo"
            icon="payments"
            backgroundColor={colors.card}
            textColor={colors.text}
            subTextColor={colors.subText}
            borderColor={colors.border}
            iconContainerColor={!isDarkMode ? '#F1F5F9' : '#334155'}
            iconColor={themeColors.accent}
            onPress={() => router.push('/(cliente)/nova-carga')}
          />
          <ActionCard
            title="Rastrear"
            subTitle="Tempo real"
            icon="radar"
            backgroundColor={colors.card}
            textColor={colors.text}
            subTextColor={colors.subText}
            borderColor={colors.border}
            iconContainerColor={!isDarkMode ? '#F1F5F9' : '#334155'}
            iconColor={themeColors.accent}
            onPress={() => router.push('/(cliente)/mapa')}
          />
          <ActionCard
            title="Histórico"
            subTitle="Entregas anteriores"
            icon="history"
            backgroundColor={colors.card}
            textColor={colors.text}
            subTextColor={colors.subText}
            borderColor={colors.border}
            iconContainerColor={!isDarkMode ? '#F1F5F9' : '#334155'}
            iconColor={themeColors.accent}
            onPress={() => router.push('/(cliente)/minhas-cargas')}
          />
        </View>

        {/* Cargas recentes */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Cargas Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/(cliente)/minhas-cargas')}>
              <Text style={{ color: themeColors.accent, fontWeight: '600', fontSize: 13 }}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {loadingCargas ? (
            <ActivityIndicator size="small" color={themeColors.accent} style={{ marginTop: 20 }} />
          ) : cargasRecentes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialIcons name="inventory-2" size={30} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>
                Nenhuma carga recente encontrada.
              </Text>
            </View>
          ) : (
            cargasRecentes.map((carga, index) => {
              const precoFormatado = carga.preco_frete
                ? parseFloat(carga.preco_frete).toLocaleString('pt-AO')
                : '0';
              return (
                <TouchableOpacity
                  key={carga.id || index}
                  style={[styles.cargaRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/(cliente)/detalhe-carga', params: { id: carga.id } })}
                >
                  <View style={styles.cargaInfo}>
                    <Text style={[styles.cargaTitle, { color: colors.text }]} numberOfLines={1}>
                      {carga.titulo}
                    </Text>
                    <Text style={[styles.cargaDestino, { color: colors.subText }]} numberOfLines={1}>
                      Para: {carga.destino}
                    </Text>
                  </View>
                  <View style={styles.cargaStatusContainer}>
                    <Text style={[styles.cargaPrice, { color: colors.text }]}>{precoFormatado} Kz</Text>
                    <View style={[styles.badgeStatus, { backgroundColor: getStatusColor(carga.status) + '20' }]}>
                      <Text style={[styles.badgeStatusText, { color: getStatusColor(carga.status) }]}>
                        {carga.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Componente auxiliar — cartão de acção
// ─────────────────────────────────────────────

function ActionCard({
  title, subTitle, icon, backgroundColor, textColor,
  subTextColor, iconContainerColor, iconColor, borderColor, onPress,
}: any) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor, borderColor: borderColor || 'transparent' }]}
      onPress={onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconContainerColor }]}>
        <MaterialIcons name={icon as any} size={24} color={iconColor || textColor} />
      </View>
      <Text style={[styles.cardText, { color: textColor }]}>{title}</Text>
      <Text style={[styles.cardSubText, { color: subTextColor || textColor + 'BB' }]}>{subTitle}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  headerTitle:    { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarCircle:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#FFF', fontWeight: '800', fontSize: 15 },

  welcomeSection:       { paddingHorizontal: 20, marginVertical: 25 },
  welcomeText:          { fontSize: 22, fontWeight: '800' },
  subWelcomeText:       { fontSize: 15, marginTop: 4 },

  addressCard:          { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  locationIcon:         { marginRight: 15 },
  addressTextContainer: { flex: 1 },
  addressLabel:         { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  addressValue:         { fontSize: 14, fontWeight: '600', marginTop: 1 },
  editBtn:              { marginLeft: 10, padding: 5 },

  actionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  card:         { width: '48%', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1 },
  iconCircle:   { width: 45, height: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  cardText:     { fontSize: 14, fontWeight: '700' },
  cardSubText:  { fontSize: 10, marginTop: 2, fontWeight: '500' },
  cardTitle:    { fontSize: 16, fontWeight: '700' },

  recentSection:        { paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  recentHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cargaRow:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  cargaInfo:            { flex: 1, paddingRight: 10 },
  cargaTitle:           { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cargaDestino:         { fontSize: 12, fontWeight: '500' },
  cargaStatusContainer: { alignItems: 'flex-end' },
  cargaPrice:           { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  badgeStatus:          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeStatusText:      { fontSize: 10, fontWeight: '800' },
  emptyCard:            { padding: 25, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText:            { fontSize: 13, marginTop: 10, fontWeight: '500' },

  mapPreviewCard:         { marginHorizontal: 24, padding: 16, borderRadius: 24, borderWidth: 1, marginBottom: 20, elevation: 4 },
  mapContainerInsideCard: { height: 180, borderRadius: 16, overflow: 'hidden' },
  liveBadge:              { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pulseDot:               { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  liveText:               { color: '#10b981', fontSize: 10, fontWeight: '900' },
});