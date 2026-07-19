import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList, RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  WARNING: '#eab308',
  WARNING_MUTED: 'rgba(234, 179, 8, 0.1)',
  DANGER: '#ef4444',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  EM_TRANSITO: { label: 'Em Curso', color: COLORS.WARNING, bg: COLORS.WARNING_MUTED, icon: 'local-shipping' },
  ENTREGUE:    { label: 'Concluído', color: COLORS.PRIMARY, bg: COLORS.PRIMARY_MUTED, icon: 'check-circle' },
  TODOS:       { label: 'Todas', color: COLORS.TEXT_MUTED, bg: COLORS.CARD_DARK, icon: 'history' },
};

const CATEGORIA_ICON: Record<string, any> = {
  construcao: 'architecture', 
  mobilia: 'chair', 
  eletro: 'tv', 
  outros: 'inventory-2',
};

const FILTROS = ['TODOS', 'EM_TRANSITO', 'ENTREGUE'];

export default function MinhasEntregas() {
  const router = useRouter();
  const { token, API_URL } = useAuth();
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('TODOS');

  const fetchEntregas = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/cargas/`, {
        headers: { 'Authorization': `Token ${token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await response.json();
      setEntregas(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchEntregas(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchEntregas(); }, []);

  const entregasFiltradas = filtro === 'TODOS'
    ? entregas
    : entregas.filter(e => e.status === filtro);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_DARK} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Histórico de Viagens</Text>
          <Text style={styles.subtitle}>{entregas.length} entregas registadas</Text>
        </View>
      </View>

      <View style={{ height: 60, marginTop: 16 }}>
        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={f => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosContainer}
          renderItem={({ item }) => {
            const st = STATUS_CONFIG[item];
            const isActive = filtro === item;
            const count = item === 'TODOS' ? entregas.length : entregas.filter(e => e.status === item).length;
            
            return (
              <TouchableOpacity
                style={[styles.filtroBtn, isActive && { backgroundColor: st.bg, borderColor: st.color }]}
                onPress={() => setFiltro(item)}
              >
                <MaterialIcons name={st.icon} size={16} color={isActive ? st.color : COLORS.TEXT_MUTED} style={{ marginRight: 6 }} />
                <Text style={[styles.filtroText, isActive && { color: st.color }]}>
                  {st.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.PRIMARY} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entregasFiltradas}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="inventory" size={48} color={COLORS.BORDER} />
              <Text style={styles.emptyText}>Nenhuma entrega encontrada</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.EM_TRANSITO;
            const catIconName = CATEGORIA_ICON[item.categoria] || 'inventory-2';
            const preco = item.preco_frete ? parseFloat(item.preco_frete).toLocaleString('pt-AO') : '0';

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/(motorista)/detalhe-entrega', params: { id: item.id } } as any)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconCircle}>
                     <MaterialIcons name={catIconName} size={20} color={COLORS.PRIMARY} />
                  </View>
                  <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.cardRoute}>
                  <View style={styles.routeItem}>
                    <Text style={styles.routeLabel}>RECOLHA</Text>
                    <Text style={styles.routeValue} numberOfLines={1}>{item.origem || 'Luanda'}</Text>
                  </View>
                  
                  <MaterialIcons name="double-arrow" size={18} color={COLORS.TEXT_MUTED} style={styles.routeArrowIcon} />
                  
                  <View style={styles.routeItem}>
                    <Text style={styles.routeLabel}>ENTREGA</Text>
                    <Text style={styles.routeValue} numberOfLines={1}>{item.destino || 'Viana'}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.rowCenter}>
                    <MaterialIcons name="fitness-center" size={14} color={COLORS.TEXT_MUTED} />
                    <Text style={styles.peso}> {item.peso_kg} kg</Text>
                  </View>
                  <Text style={styles.preco}>{preco} Kz</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.TEXT_LIGHT },
  subtitle: { fontSize: 13, color: COLORS.TEXT_MUTED, marginTop: 4 },
  filtrosContainer: { paddingHorizontal: 24, gap: 10, alignItems: 'center' },
  filtroBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.CARD_DARK, borderWidth: 1, borderColor: COLORS.BORDER },
  filtroText: { fontSize: 12, color: COLORS.TEXT_MUTED, fontWeight: 'bold' },
  lista: { paddingHorizontal: 24, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.TEXT_MUTED, marginTop: 12, fontWeight: '600' },
  card: { backgroundColor: COLORS.CARD_DARK, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardTitulo: { fontSize: 15, fontWeight: 'bold', color: COLORS.TEXT_LIGHT, flex: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  cardRoute: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, marginBottom: 16 },
  routeItem: { flex: 1 },
  routeLabel: { fontSize: 9, color: COLORS.TEXT_MUTED, fontWeight: '900' },
  routeValue: { fontSize: 12, color: COLORS.TEXT_LIGHT, marginTop: 2, fontWeight: '600' },
  routeArrowIcon: { marginHorizontal: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  peso: { fontSize: 12, color: COLORS.TEXT_MUTED, fontWeight: '600' },
  preco: { fontSize: 16, fontWeight: '900', color: COLORS.PRIMARY },
});