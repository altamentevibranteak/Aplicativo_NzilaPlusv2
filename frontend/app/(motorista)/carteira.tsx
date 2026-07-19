import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, Text, View,
  TouchableOpacity, FlatList, Dimensions,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const { width } = Dimensions.get('window');

const COLORS = {
  PRIMARY:   '#10b981',
  SECONDARY: '#3b82f6',
  BG:        '#111827',
  CARD:      '#1e293b',
  TEXT:      '#f1f5f9',
  MUTED:     '#94a3b8',
  GOLD:      '#f59e0b',
  DANGER:    '#ef4444',
};

const PACOTES = [
  { id: 1, slug: 'FACIL',   nome: 'PACOTE FÁCIL', unidades: 10,          preco: '15.000', cor: COLORS.PRIMARY   },
  { id: 2, slug: 'PLUS',    nome: 'PACOTE PLUS',  unidades: 30,          preco: '50.000', cor: COLORS.SECONDARY },
  { id: 3, slug: 'PREMIUM', nome: 'PREMIUM',      unidades: 'ILIMITADO', preco: '100.000', cor: COLORS.GOLD     },
];

// ─────────────────────────────────────────────
// Componente auxiliar — badge de estado do plano
// ─────────────────────────────────────────────

const StatusPlano = ({ motorista }: any) => {
  if (!motorista) return null;

  if (motorista.viagens_disponiveis <= 0 && !motorista.primeira_viagem_gratis) {
    return (
      <View style={[badgeStyles.badge, { backgroundColor: COLORS.DANGER }]}>
        <Text style={badgeStyles.badgeText}>SEM PLANO ATIVO ❌</Text>
      </View>
    );
  }

  if (motorista.primeira_viagem_gratis) {
    return (
      <View style={[badgeStyles.badge, { backgroundColor: COLORS.PRIMARY }]}>
        <Text style={badgeStyles.badgeText}>PRIMEIRA ENTREGA GRÁTIS 🎁</Text>
      </View>
    );
  }

  if (motorista.viagens_disponiveis >= 999) {
    return (
      <View style={[badgeStyles.badge, { backgroundColor: COLORS.GOLD }]}>
        <Text style={badgeStyles.badgeText}>MEMBRO PREMIUM ⭐</Text>
      </View>
    );
  }

  return (
    <View style={[badgeStyles.badge, { backgroundColor: COLORS.SECONDARY }]}>
      <Text style={badgeStyles.badgeText}>PLANO ATIVO ✅</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// Ecrã principal
// ─────────────────────────────────────────────

export default function CarteiraMotorista() {
  const { token, API_URL } = useAuth();

  const [motoristaData,      setMotoristaData]      = useState<any>(null);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [historico,          setHistorico]          = useState<any[]>([]);
  const [modalVisivel,       setModalVisivel]       = useState(false);
  const [planoSelecionado,   setPlanoSelecionado]   = useState<any>(null);
  const [carregandoRecarga,  setCarregandoRecarga]  = useState(false);

  // ─── Fetch: perfil ───────────────────────────

  const fetchPerfil = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/motorista/meu-perfil/?t=${Date.now()}`, {
        headers: {
          Authorization: `Token ${token}`,
          'Cache-Control': 'no-cache',
        },
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (response.ok && data) {
        setMotoristaData({ ...data });
      } else {
        console.warn('Resposta inválida ao carregar perfil:', text);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL, token]);

  // ─── Fetch: histórico de entregas ────────────

  const fetchHistorico = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cargas/?t=${Date.now()}`, {
        headers: {
          Authorization: `Token ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await res.json();

      const entregues = (data as any[])
        .filter((item) => item.status === 'ENTREGUE')
        .sort((a, b) => new Date(b.data_entrega).getTime() - new Date(a.data_entrega).getTime());

      setHistorico(entregues);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    }
  }, [API_URL, token]);

  // ─── Carregar ao focar o ecrã ─────────────────

  useFocusEffect(
    useCallback(() => {
      fetchPerfil();
      fetchHistorico();
    }, [fetchPerfil, fetchHistorico])
  );

  // ─── Handlers ────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    fetchPerfil();
    fetchHistorico();
  };

  const handleAbrirModal = (plano: any) => {
    setPlanoSelecionado(plano);
    setModalVisivel(true);
  };

  const confirmarRecarga = async () => {
    if (!planoSelecionado) return;
    setCarregandoRecarga(true);

    try {
      const response = await fetch(`${API_URL}/api/motorista/recarregar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ plano: planoSelecionado.slug }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.ok) {
        await fetchPerfil();
        Alert.alert('Sucesso', `Plano ${planoSelecionado.nome} ativado!`);
        setModalVisivel(false);
      } else {
        Alert.alert('Erro', data.erro || 'Falha na transação.');
      }
    } catch {
      Alert.alert('Erro', 'Sem conexão com o servidor.');
    } finally {
      setCarregandoRecarga(false);
    }
  };

  // ─── Loading inicial ──────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  // ─── Render ───────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} />
      }
    >
      {/* Cabeçalho — saldo e viagens */}
      <View style={styles.headerCard}>
        <StatusPlano motorista={motoristaData} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }}>
          <View style={styles.mainBalance}>
            <Text style={styles.label}>Viagens</Text>
            <Text style={styles.balanceValue}>
              {motoristaData?.viagens_disponiveis >= 999 ? '∞' : motoristaData?.viagens_disponiveis ?? '--'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.secondaryBalance}>
            <Text style={styles.label}>Saldo (Kz)</Text>
            <Text style={styles.earningsValue}>
              {Number(motoristaData?.saldo || 0).toLocaleString('pt-AO')}
            </Text>
          </View>
        </View>
      </View>

      {/* Planos de crédito */}
      <Text style={styles.sectionTitle}>Planos de Crédito</Text>
      <FlatList
        data={PACOTES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingLeft: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pacoteCard, { borderColor: item.cor }]}
            onPress={() => handleAbrirModal(item)}
          >
            <Text style={[styles.pacoteNome, { color: item.cor }]}>{item.nome}</Text>
            <Text style={[
            styles.pacoteUnidades, 
            item.unidades === 'ILIMITADO' && { fontSize: 18 } // Ajusta o 18 para o tamanho que preferires
          ]}>
            {item.unidades}
          </Text>
            <Text style={styles.pacoteSub}>VIAGENS</Text>
            <View style={styles.precoTag}>
              <Text style={styles.precoText}>{item.preco} Kz</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Histórico de entregas */}
      <View style={styles.sectionHistorico}>
        <Text style={styles.sectionTitle}>Atividades Recentes</Text>

        {historico.length > 0 ? (
          historico.map((item) => {
            const ganho = (parseFloat(item.preco_frete) * 0.95).toLocaleString('pt-AO');
            return (
              <View key={item.id} style={styles.itemHistorico}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="local-shipping" size={20} color="#10b981" />
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.itemTitulo}>{item.titulo || 'Entrega Nzila'}</Text>
                  <Text style={styles.itemData}>
                    {new Date(item.data_entrega).toLocaleDateString('pt-AO')} • {item.destino}
                  </Text>
                </View>
                <View style={styles.valorBox}>
                  <Text style={styles.valorTexto}>+{ganho} Kz</Text>
                  <Text style={styles.statusTexto}>Concluído</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={40} color="#334155" />
            <Text style={styles.emptyText}>Ainda não tens entregas finalizadas.</Text>
          </View>
        )}
      </View>

      {/* Modal de confirmação de recarga */}
      <Modal visible={modalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="wallet-giftcard" size={48} color={planoSelecionado?.cor} />
            <Text style={styles.modalTitle}>{planoSelecionado?.nome}</Text>
            <Text style={styles.modalText}>
              Desejas confirmar a compra de {planoSelecionado?.unidades} viagens?
              {'\n\n'}Simulação para a PAP
            </Text>
            <TouchableOpacity
              style={[styles.btnConfirmar, { backgroundColor: planoSelecionado?.cor || COLORS.PRIMARY }]}
              onPress={confirmarRecarga}
              disabled={carregandoRecarga}
            >
              {carregandoRecarga
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Pagar Agora</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisivel(false)}>
              <Text style={styles.btnCancelar}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────

const badgeStyles = StyleSheet.create({
  badge:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.BG },
  headerCard:       { backgroundColor: COLORS.CARD, margin: 20, marginTop: 60, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' },
  mainBalance:      { flex: 1, alignItems: 'center' },
  secondaryBalance: { flex: 1, alignItems: 'center' },
  divider:          { width: 1, height: 40, backgroundColor: '#334155' },
  label:            { color: COLORS.MUTED, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  balanceValue:     { color: COLORS.PRIMARY, fontSize: 38, fontWeight: '900' },
  earningsValue:    { color: COLORS.TEXT, fontSize: 20, fontWeight: '700' },
  sectionTitle:     { color: COLORS.TEXT, fontSize: 16, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, textTransform: 'uppercase' },

  pacoteCard:       { backgroundColor: COLORS.CARD, width: width * 0.42, marginRight: 15, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2 },
  pacoteNome:       { fontSize: 11, fontWeight: '900', marginBottom: 10 },
  pacoteUnidades:   { color: COLORS.TEXT, fontSize: 28, fontWeight: '900' },
  pacoteSub:        { color: COLORS.MUTED, fontSize: 10, fontWeight: 'bold', marginBottom: 15 },
  precoTag:         { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  precoText:        { color: COLORS.TEXT, fontSize: 12, fontWeight: 'bold' },

  historySection:   { paddingHorizontal: 20, paddingBottom: 40 },
  historyItem:      { backgroundColor: COLORS.CARD, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  historyIcon:      { marginRight: 15 },
  historyText:      { color: COLORS.TEXT, fontWeight: '600', fontSize: 14 },
  historyDate:      { color: COLORS.MUTED, fontSize: 12 },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent:     { backgroundColor: '#1e293b', padding: 30, borderRadius: 24, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  modalTitle:       { color: '#fff', fontSize: 22, fontWeight: 'bold', marginVertical: 15 },
  modalText:        { color: '#94a3b8', textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  btnConfirmar:     { padding: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnText:          { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnCancelar:      { color: COLORS.MUTED, marginTop: 20, fontWeight: '600' },

  sectionHistorico: { paddingHorizontal: 20, paddingBottom: 40 },
  itemHistorico:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.CARD, borderRadius: 16, padding: 14, marginBottom: 10 },
  iconBox:          { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f2a1e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoBox:          { flex: 1 },
  itemTitulo:       { color: COLORS.TEXT, fontWeight: '700', fontSize: 14 },
  itemData:         { color: COLORS.MUTED, fontSize: 12, marginTop: 2 },
  valorBox:         { alignItems: 'flex-end' },
  valorTexto:       { color: COLORS.PRIMARY, fontWeight: '800', fontSize: 14 },
  statusTexto:      { color: COLORS.MUTED, fontSize: 11, marginTop: 2 },
  emptyState:       { alignItems: 'center', paddingVertical: 30 },
  emptyText:        { color: COLORS.MUTED, marginTop: 10, fontSize: 14 },
});