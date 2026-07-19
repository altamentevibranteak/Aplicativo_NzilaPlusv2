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

interface Carga {
  id: number;
  titulo: string;
  status: string;
  origem: string;
  destino: string;
  preco_frete: string;
  data_criacao: string;
  categoria: string;
  peso_kg: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDENTE:    { label: 'Pendente',    color: '#B45309', bg: '#FEF3C7', icon: 'schedule' },
  EM_TRANSITO: { label: 'Em Trânsito', color: '#1D4ED8', bg: '#DBEAFE', icon: 'local-shipping' },
  ENTREGUE:    { label: 'Entregue',    color: '#15803D', bg: '#DCFCE7', icon: 'check-circle' },
  CANCELADO:   { label: 'Cancelado',   color: '#B91C1C', bg: '#FEE2E2', icon: 'cancel' },
};

const CATEGORIA_ICON: Record<string, string> = {
  construcao: 'construction',
  mobilia: 'weekend',
  eletro: 'phonelink',
  outros: 'inventory',
};

const FILTROS = ['TODOS', 'PENDENTE', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO'];

export default function MinhasCargas() {
  const { theme, token, API_URL, isDarkMode } = useAuth();
  const styles = createStyles(theme);
  const router = useRouter();

  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('TODOS');

  async function fetchCargas() {
    try {
      const response = await fetch(`${API_URL}/api/cargas/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();
      setCargas(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchCargas(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCargas();
  }, []);

  const cargasFiltradas = filtro === 'TODOS'
    ? cargas
    : cargas.filter(c => c.status === filtro);

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.card} 
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Histórico</Text> 
          <Text style={styles.subtitle}>{cargas.length} envios realizados</Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#3B82F6' }]}
          onPress={() => router.push('/(cliente)/nova-carga' as any)}
        >
          <MaterialIcons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtrosWrapper}>
        <FlatList
            horizontal
            data={FILTROS}
            keyExtractor={f => f}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtrosContainer}
            renderItem={({ item }) => {
            const st = STATUS_CONFIG[item];
            const isActive = filtro === item;
            
            return (
                <TouchableOpacity
                style={[
                    styles.filtroBtn, 
                    isActive && { backgroundColor: st?.color || '#3B82F6', borderColor: st?.color || '#3B82F6' }
                ]}
                onPress={() => setFiltro(item)}
                >
                {item !== 'TODOS' && st?.icon && (
                    <MaterialIcons name={st.icon as any} size={16} color={isActive ? "#FFF" : st.color} style={{marginRight: 6}} />
                )}
                <Text style={[styles.filtroText, isActive && { color: "#FFF", fontWeight: '700' }]}>
                    {st?.label || 'Todos'}
                </Text>
                </TouchableOpacity>
            );
            }}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#3B82F6" style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={cargasFiltradas}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialIcons name="inventory" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhuma carga encontrada</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDENTE;
            const catIconName = CATEGORIA_ICON[item.categoria] || 'inventory';
            const preco = parseFloat(item.preco_frete).toLocaleString('pt-AO');
            
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/(cliente)/detalhe-carga', params: { id: item.id } } as any)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.categoryIconCircle}>
                        <MaterialIcons name={catIconName as any} size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialIcons name={st.icon as any} size={12} color={st.color} />
                        <Text style={[styles.badgeText, { color: st.color }]}>
                            {st.label.toUpperCase()}
                        </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardRoute}>
                  <View style={styles.routePointRow}>
                    <View style={styles.routeIconContainer}>
                        <View style={styles.dotOrigem} />
                        <View style={styles.routeLine} />
                    </View>
                    <View style={styles.routeTextContainer}>
                        <Text style={styles.routeLabel}>RECOLHA</Text>
                        <Text style={styles.routeValue} numberOfLines={1}>{item.origem}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.routePointRow}>
                    <View style={styles.routeIconContainer}>
                        <MaterialIcons name="location-on" size={16} color="#EF4444" />
                    </View>
                    <View style={styles.routeTextContainer}>
                        <Text style={styles.routeLabel}>ENTREGA</Text>
                        <Text style={styles.routeValue} numberOfLines={1}>{item.destino}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.infoTag}>
                    <MaterialIcons name="fitness-center" size={14} color="#64748B" />
                    <Text style={styles.peso}>{item.peso_kg} kg</Text>
                  </View>
                  <View style={styles.priceDateColumn}>
                    <Text style={styles.preco}>{preco} Kz</Text>
                    <Text style={styles.data}>{new Date(item.data_criacao).toLocaleDateString('pt-PT')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20,
    backgroundColor: theme.card, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  title: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: theme.icon, marginTop: 1 },
  addBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  filtrosWrapper: { backgroundColor: theme.card, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  filtrosContainer: { paddingHorizontal: 20 },
  filtroBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.background, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginRight: 10, 
    borderWidth: 1, 
    borderColor: theme.border,
  },
  filtroText: { fontSize: 13, fontWeight: '600', color: theme.text },
  lista: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40 },
  card: {
    backgroundColor: theme.card, 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: theme.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  categoryIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitulo: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardRoute: { backgroundColor: theme.background, borderRadius: 16, padding: 15, marginVertical: 12, borderWidth: 1, borderColor: theme.border },
  routePointRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeIconContainer: { alignItems: 'center', width: 20, marginRight: 12 },
  dotOrigem: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginTop: 4 },
  routeLine: { width: 2, height: 25, backgroundColor: theme.border, marginVertical: 2 },
  routeTextContainer: { flex: 1 },
  routeLabel: { fontSize: 9, color: theme.icon, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  routeValue: { fontSize: 14, color: theme.text, marginTop: 2, fontWeight: '500' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: theme.border },
  infoTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  peso: { fontSize: 12, fontWeight: '600', color: theme.icon },
  priceDateColumn: { alignItems: 'flex-end' },
  preco: { fontSize: 18, fontWeight: '900', color: theme.success },
  data: { fontSize: 11, color: theme.icon, marginTop: 2 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: theme.icon, marginTop: 15, fontSize: 14, fontWeight: '500' },
});