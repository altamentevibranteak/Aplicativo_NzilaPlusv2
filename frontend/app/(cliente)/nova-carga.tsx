import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import MapboxGL from '@rnmapbox/maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView as RNSafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputField } from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';

// ─── Configuração ────────────────────────────────────────────────────────────
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

const LUANDA_CENTER: [number, number] = [13.2345, -8.8383]; // [lon, lat]

// ─── Fórmula de preço — espelho EXACTO do models.py ──────────────────────────
const PRECO_BASE = 3000;
const TAXA_DISTANCIA = 600; // Kz por km de estrada

const CATEGORIAS = [
  { value: 'construcao', label: 'Construção', icon: 'construction', taxa: 1.3 },
  { value: 'mobilia',    label: 'Mobiliário',  icon: 'weekend',      taxa: 1.2 },
  { value: 'eletro',     label: 'Eletrónicos', icon: 'phonelink',    taxa: 1.1 },
  { value: 'outros',     label: 'Geral',       icon: 'inventory-2',  taxa: 1.0 },
];

function calcularPreco(distanciaKm: number, cat: string): number {
  const taxa = CATEGORIAS.find(c => c.value === cat)?.taxa ?? 1.0;
  return (PRECO_BASE + distanciaKm * TAXA_DISTANCIA) * taxa;
}

// ─── Modal de selecção de ponto no mapa ──────────────────────────────────────
interface ModalMapaProps {
  visible: boolean;
  titulo: string;
  coordInicial: [number, number];
  onConfirmar: (coords: [number, number], endereco: string) => void;
  onFechar: () => void;
}

function ModalMapaSeletor({ visible, titulo, coordInicial, onConfirmar, onFechar }: ModalMapaProps) {
  const [pontoSelecionado, setPontoSelecionado] = useState<[number, number]>(coordInicial);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  // Sempre que o modal abre, reinicia para o ponto inicial
  useEffect(() => {
    if (visible) {
      setPontoSelecionado(coordInicial);
      setEnderecoSelecionado('');
    }
  }, [visible]);

  async function reverseGeocode(lon: number, lat: number) {
    setGeocodingLoading(true);
    try {
      // Usa a API Geocoding do Mapbox para obter o endereço real
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&language=pt&limit=1`;
      const res = await fetch(url);
      const json = await res.json();
      const nome = json.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      setEnderecoSelecionado(nome);
    } catch {
      setEnderecoSelecionado(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    } finally {
      setGeocodingLoading(false);
    }
  }

  function handleToque(feature: any) {
    const [lon, lat] = feature.geometry.coordinates;
    const novosPontos: [number, number] = [lon, lat];
    setPontoSelecionado(novosPontos);
    reverseGeocode(lon, lat);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onFechar}>
      <RNSafeAreaView style={estilosModal.container}>
        {/* Header */}
        <View style={estilosModal.header}>
          <TouchableOpacity onPress={onFechar} style={estilosModal.btnVoltar}>
            <MaterialIcons name="arrow-back" size={22} color="#f1f5f9" />
          </TouchableOpacity>
          <Text style={estilosModal.titulo}>{titulo}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={estilosModal.instrucao}>Toca no mapa para marcar o ponto</Text>

        {/* Mapa interactivo */}
        <View style={{ flex: 1 }}>
          {visible && (
            <MapboxGL.MapView
              style={{ flex: 1 }}
              styleURL={MapboxGL.StyleURL.Street}
              logoEnabled={false}
              onPress={handleToque}
            >
              <MapboxGL.Camera
                ref={cameraRef}
                centerCoordinate={pontoSelecionado}
                zoomLevel={13}
                animationMode="flyTo"
                animationDuration={800}
              />

              {/* Marcador do ponto seleccionado */}
              <MapboxGL.MarkerView id="ponto" coordinate={pontoSelecionado}>
                <View style={estilosModal.markerWrapper}>
                  <View style={estilosModal.markerPulse} />
                  <View style={estilosModal.markerDot} />
                </View>
              </MapboxGL.MarkerView>

              {/* Localização actual do utilizador */}
              <MapboxGL.UserLocation visible />
            </MapboxGL.MapView>
          )}
        </View>

        {/* Footer com endereço e botão confirmar */}
        <View style={estilosModal.footer}>
          <View style={estilosModal.enderecoRow}>
            <MaterialIcons name="place" size={18} color="#10b981" />
            {geocodingLoading ? (
              <ActivityIndicator size="small" color="#10b981" style={{ marginLeft: 8 }} />
            ) : (
              <Text style={estilosModal.enderecoTexto} numberOfLines={2}>
                {enderecoSelecionado || 'Toca no mapa para seleccionar...'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[estilosModal.btnConfirmar, (!enderecoSelecionado || geocodingLoading) && { opacity: 0.5 }]}
            onPress={() => onConfirmar(pontoSelecionado, enderecoSelecionado)}
            disabled={!enderecoSelecionado || geocodingLoading}
          >
            <MaterialIcons name="check" size={20} color="#111827" />
            <Text style={estilosModal.btnConfirmarTexto}>CONFIRMAR LOCALIZAÇÃO</Text>
          </TouchableOpacity>
        </View>
      </RNSafeAreaView>
    </Modal>
  );
}

const estilosModal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  btnVoltar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  instrucao: {
    color: '#94a3b8', fontSize: 12, textAlign: 'center',
    paddingVertical: 8, backgroundColor: '#1e293b',
  },
  markerWrapper: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  markerPulse: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 2, borderColor: 'rgba(16,185,129,0.5)',
  },
  markerDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#10b981', borderWidth: 3, borderColor: '#fff', elevation: 6,
  },
  footer: {
    padding: 16, backgroundColor: '#1e293b',
    borderTopWidth: 1, borderTopColor: '#334155', gap: 12,
  },
  enderecoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  enderecoTexto: { flex: 1, color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  btnConfirmar: {
    backgroundColor: '#10b981', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 14, gap: 8,
  },
  btnConfirmarTexto: { color: '#111827', fontWeight: '900', fontSize: 15 },
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function NovaCarga() {
  const router = useRouter();
  const { token, API_URL, isDarkMode } = useAuth();
  const [loading, setLoading] = useState(false);

  const theme = {
    bg: isDarkMode ? '#0F172A' : '#F8FAFC',
    card: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    subText: isDarkMode ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    border: isDarkMode ? '#334155' : '#E2E8F0',
    success: '#10B981',
    white: '#FFFFFF',
    btnDark: isDarkMode ? '#334155' : '#0F172A',
    orcamentoBg: isDarkMode ? '#022C22' : '#ECFDF5',
    orcamentoBorder: isDarkMode ? '#064E3B' : '#A7F3D0',
    orcamentoLabel: isDarkMode ? '#6EE7B7' : '#065F46',
    orcamentoValue: isDarkMode ? '#34D399' : '#10B981',
  };

  const styles = useMemo(() => getStyles(theme), [isDarkMode]);

  // ─── Estados do formulário ──────────────────────────────────────────────────
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [origemCoords, setOrigemCoords] = useState<[number, number] | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<[number, number] | null>(null);
  const [categoria, setCategoria] = useState('outros');
  const [tipoServico, setTipoServico] = useState<'IMEDIATO' | 'AGENDADO'>('IMEDIATO');
  const [acompanhada, setAcompanhada] = useState(false);
  const [foto, setFoto] = useState<any>(null);

  // ─── Modal do mapa ──────────────────────────────────────────────────────────
  const [modalMapa, setModalMapa] = useState<'origem' | 'destino' | null>(null);
  const [localizacaoAtual, setLocalizacaoAtual] = useState<[number, number]>(LUANDA_CENTER);

  // ─── Orçamento ──────────────────────────────────────────────────────────────
  const [distanciaKm, setDistanciaKm] = useState(0);
  const [precoEstimado, setPrecoEstimado] = useState(PRECO_BASE);
  const [calculandoRota, setCalculandoRota] = useState(false);

  // ─── Agendamento ────────────────────────────────────────────────────────────
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [dataObjeto, setDataObjeto] = useState(new Date());

  // GPS loading
  const [gpsLoading, setGpsLoading] = useState<{ origem: boolean; destino: boolean }>({
    origem: false, destino: false,
  });

  // ─── Detecta localização actual para centrar o mapa ─────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocalizacaoAtual([loc.coords.longitude, loc.coords.latitude]);
    })();
  }, []);

  const limparFormulario = useCallback(() => {
    setTitulo(''); setDescricao(''); setPesoKg('');
    setOrigem(''); setDestino('');
    setOrigemCoords(null); setDestinoCoords(null);
    setCategoria('outros'); setTipoServico('IMEDIATO');
    setAcompanhada(false); setFoto(null);
    setDataAgendamento(''); setDataObjeto(new Date()); setShowPicker(false);
    setDistanciaKm(0); setPrecoEstimado(PRECO_BASE);
  }, []);

  useFocusEffect(useCallback(() => {
    return () => limparFormulario();
  }, [limparFormulario]));

  // ─── Busca distância REAL de estrada pela API Directions do Mapbox ───────────
  async function buscarDistanciaEstrada(orig: [number, number], dest: [number, number]) {
    setCalculandoRota(true);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${orig[0]},${orig[1]};${dest[0]},${dest[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.routes?.[0]) {
        // Mapbox devolve distância em metros
        const km = json.routes[0].distance / 1000;
        setDistanciaKm(km);
        setPrecoEstimado(calcularPreco(km, categoria));
      }
    } catch (e) {
      console.error('Erro ao calcular rota:', e);
    } finally {
      setCalculandoRota(false);
    }
  }

  // Recalcula preço quando categoria muda (mantendo distância já calculada)
  useEffect(() => {
    if (distanciaKm > 0) {
      setPrecoEstimado(calcularPreco(distanciaKm, categoria));
    }
  }, [categoria]);

  // Recalcula rota quando ambas as coords estiverem definidas
  useEffect(() => {
    if (origemCoords && destinoCoords) {
      buscarDistanciaEstrada(origemCoords, destinoCoords);
    }
  }, [origemCoords, destinoCoords]);

  // ─── GPS rápido (botão GPS) ──────────────────────────────────────────────────
  async function detectarLocalizacao(tipo: 'origem' | 'destino') {
    setGpsLoading(prev => ({ ...prev, [tipo]: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permissão', 'Precisamos da localização.'); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const coords: [number, number] = [longitude, latitude];

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const e = geocode[0];
      const nomeLocal = [e?.street, e?.district, e?.city].filter(Boolean).join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      if (tipo === 'origem') {
        setOrigem(nomeLocal);
        setOrigemCoords(coords);
      } else {
        setDestino(nomeLocal);
        setDestinoCoords(coords);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível obter a localização.');
    } finally {
      setGpsLoading(prev => ({ ...prev, [tipo]: false }));
    }
  }

  // ─── Confirma localização escolhida no modal ─────────────────────────────────
  function handleConfirmarMapa(coords: [number, number], endereco: string) {
    if (modalMapa === 'origem') {
      setOrigemCoords(coords);
      setOrigem(endereco);
    } else {
      setDestinoCoords(coords);
      setDestino(endereco);
    }
    setModalMapa(null);
  }

  // ─── Imagem ──────────────────────────────────────────────────────────────────
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão', 'Precisamos de acesso à galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled) setFoto(result.assets[0]);
  }

  // ─── Submissão ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!titulo || !origem || !destino) {
      Alert.alert('Atenção', 'Preenche todos os campos obrigatórios (*).');
      return;
    }
    if (!origemCoords || !destinoCoords) {
      Alert.alert('Atenção', 'Usa o botão 📍 ou o mapa para definir a origem e o destino.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('descricao', descricao);
      formData.append('peso_kg', pesoKg || '0');
      formData.append('origem', origem);
      formData.append('destino', destino);
      formData.append('origem_coords', `${origemCoords[1]},${origemCoords[0]}`); // lat,lon para o backend
      formData.append('destino_coords', `${destinoCoords[1]},${destinoCoords[0]}`);
      formData.append('categoria', categoria);
      formData.append('tipo_servico', tipoServico);
      formData.append('acompanhada', String(acompanhada));
      formData.append('distancia_km', distanciaKm.toFixed(2));
      formData.append('preco_frete', precoEstimado.toFixed(2)); // ✅ nome correcto

      const dataFinal = (tipoServico === 'AGENDADO' ? dataObjeto : new Date()).toISOString().split('.')[0];
      formData.append('data_agendamento', dataFinal);

      if (foto) {
        const filename = foto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename ?? '');
        formData.append('foto_carga', { uri: foto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' } as any);
      }

      const response = await fetch(`${API_URL}/api/cargas/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}`, Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) throw new Error('Erro ao criar pedido.');

      Alert.alert('✅ Sucesso!', 'Pedido publicado.', [{
        text: 'Ver meus pedidos',
        onPress: () => { limparFormulario(); router.replace('/(cliente)/minhas-cargas'); },
      }]);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Algo correu mal.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Date pickers ────────────────────────────────────────────────────────────
  const onChangeData = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event?.type === 'set' && selectedDate) {
      setDataObjeto(selectedDate);
      setDataAgendamento(selectedDate.toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
  };

  const abrirPickerAndroid = () => {
    DateTimePickerAndroid.open({
      value: dataObjeto, mode: 'date', is24Hour: true,
      onChange: (event, selectedDate) => {
        if (event.type === 'set' && selectedDate) {
          DateTimePickerAndroid.open({
            value: selectedDate, mode: 'time', is24Hour: true,
            onChange: (timeEvent, selectedTime) => {
              if (timeEvent.type === 'set' && selectedTime) {
                setDataObjeto(selectedTime);
                setDataAgendamento(selectedTime.toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
              }
            },
          });
        }
      },
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />

      {/* Modal Mapa Seletor */}
      <ModalMapaSeletor
        visible={modalMapa !== null}
        titulo={modalMapa === 'origem' ? '📍 Marcar Origem' : '🏁 Marcar Destino'}
        coordInicial={
          modalMapa === 'origem'
            ? (origemCoords ?? localizacaoAtual)
            : (destinoCoords ?? localizacaoAtual)
        }
        onConfirmar={handleConfirmarMapa}
        onFechar={() => setModalMapa(null)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Entrega</Text>
        <View style={{ width: 40 }} />
        <TouchableOpacity onPress={limparFormulario}>
          <MaterialIcons name="delete-sweep" size={24} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── 1. Rota ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Rota</Text>
          <View style={styles.card}>

            {/* Origem */}
            <View style={styles.locationInputRow}>
              <View style={{ flex: 1 }}>
                <InputField
                  placeholder="Origem *"
                  value={origem}
                  onChangeText={text => { setOrigem(text); setOrigemCoords(null); }}
                  icon="my-location"
                  theme={theme}
                  styles={styles}
                />
              </View>
              {/* GPS rápido */}
              <TouchableOpacity style={styles.gpsBtn} onPress={() => detectarLocalizacao('origem')}>
                {gpsLoading.origem
                  ? <ActivityIndicator color={theme.white} />
                  : <MaterialIcons name="gps-fixed" size={20} color={theme.white} />}
              </TouchableOpacity>
              {/* Abrir mapa */}
              <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: theme.success }]} onPress={() => setModalMapa('origem')}>
                <MaterialIcons name="map" size={20} color={theme.white} />
              </TouchableOpacity>
            </View>

            {/* Indicador de coords da origem */}
            {origemCoords && (
              <Text style={styles.coordsLabel}>
                ✅ Origem marcada no mapa
              </Text>
            )}

            <View style={{ height: 10 }} />

            {/* Destino */}
            <View style={styles.locationInputRow}>
              <View style={{ flex: 1 }}>
                <InputField
                  placeholder="Destino *"
                  value={destino}
                  onChangeText={text => { setDestino(text); setDestinoCoords(null); }}
                  icon="pin-drop"
                  theme={theme}
                  styles={styles}
                />
              </View>
              {/* GPS rápido */}
              <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: theme.accent }]} onPress={() => detectarLocalizacao('destino')}>
                {gpsLoading.destino
                  ? <ActivityIndicator color={theme.white} />
                  : <MaterialIcons name="gps-fixed" size={20} color={theme.white} />}
              </TouchableOpacity>
              {/* Abrir mapa */}
              <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: '#ef4444' }]} onPress={() => setModalMapa('destino')}>
                <MaterialIcons name="map" size={20} color={theme.white} />
              </TouchableOpacity>
            </View>

            {/* Indicador de coords do destino */}
            {destinoCoords && (
              <Text style={styles.coordsLabel}>
                ✅ Destino marcado no mapa
              </Text>
            )}

            {/* Linha de distância */}
            {distanciaKm > 0 && (
              <View style={styles.distanciaRow}>
                <MaterialIcons name="directions-car" size={16} color={theme.success} />
                {calculandoRota
                  ? <ActivityIndicator size="small" color={theme.success} />
                  : <Text style={[styles.coordsLabel, { color: theme.success, marginTop: 0 }]}>
                      {distanciaKm.toFixed(1)} km de estrada
                    </Text>
                }
              </View>
            )}
          </View>
        </View>

        {/* ── 2. Detalhes da Carga ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Detalhes da Carga</Text>
          <View style={styles.card}>
            <InputField placeholder="Título da carga *" value={titulo} onChangeText={setTitulo} icon="title" theme={theme} styles={styles} />

            <View style={{ marginTop: 10 }}>
              <InputField placeholder="Descrição (cuidados, tamanho, estado)..." value={descricao} onChangeText={setDescricao} icon="description" multiline theme={theme} styles={styles} />
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <InputField placeholder="Peso (kg)" value={pesoKg} onChangeText={setPesoKg} icon="scale" keyboardType="numeric" theme={theme} styles={styles} />
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Vou junto</Text>
                <Switch
                  value={acompanhada}
                  onValueChange={setAcompanhada}
                  trackColor={{ false: isDarkMode ? '#475569' : '#CBD5E1', true: theme.accent }}
                  thumbColor={theme.white}
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 15 }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
              {CATEGORIAS.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.chip, categoria === cat.value && styles.chipActive]}
                  onPress={() => setCategoria(cat.value)}
                >
                  <MaterialIcons name={cat.icon as any} size={18} color={categoria === cat.value ? theme.white : theme.subText} />
                  <Text style={[styles.chipText, categoria === cat.value && { color: theme.white }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.cardDashed, { marginTop: 20 }]}>
              <Text style={styles.labelDashed}>FOTO DA CARGA (OPCIONAL)</Text>
              <TouchableOpacity style={styles.fotoUploadBtn} onPress={pickImage}>
                {foto ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="check-circle" size={28} color={theme.success} />
                    <Text style={[styles.fotoUploadText, { color: theme.success }]}> Foto Pronta</Text>
                  </View>
                ) : (
                  <>
                    <MaterialIcons name="add-a-photo" size={32} color={theme.accent} />
                    <Text style={styles.fotoUploadText}>Toca para adicionar foto</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 3. Quando? ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Quando?</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity style={[styles.typeBtn, tipoServico === 'IMEDIATO' && styles.typeBtnActive]} onPress={() => setTipoServico('IMEDIATO')}>
              <MaterialIcons name="bolt" size={20} color={tipoServico === 'IMEDIATO' ? theme.white : theme.subText} />
              <Text style={[styles.typeBtnText, tipoServico === 'IMEDIATO' && { color: theme.white }]}>Imediato</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeBtn, tipoServico === 'AGENDADO' && styles.typeBtnActive]} onPress={() => setTipoServico('AGENDADO')}>
              <MaterialIcons name="event" size={20} color={tipoServico === 'AGENDADO' ? theme.white : theme.subText} />
              <Text style={[styles.typeBtnText, tipoServico === 'AGENDADO' && { color: theme.white }]}>Agendado</Text>
            </TouchableOpacity>
          </View>

          {tipoServico === 'AGENDADO' && (
            <>
              <TouchableOpacity onPress={() => Platform.OS === 'android' ? abrirPickerAndroid() : setShowPicker(true)}>
                <View pointerEvents="none">
                  <InputField placeholder="Selecionar data e hora" value={dataAgendamento} icon="schedule" theme={theme} styles={styles} editable={false} />
                </View>
              </TouchableOpacity>
              {showPicker && Platform.OS === 'ios' && (
                <DateTimePicker value={dataObjeto} mode="datetime" display="default" onChange={onChangeData} />
              )}
            </>
          )}
        </View>

        {/* ── Orçamento ─────────────────────────────────────────────────── */}
        <View style={styles.orcamentoCard}>
          {calculandoRota ? (
            <>
              <ActivityIndicator color={theme.orcamentoValue} />
              <Text style={[styles.orcamentoDica, { marginTop: 8 }]}>A calcular rota real...</Text>
            </>
          ) : (
            <>
              <Text style={styles.orcamentoTotalLabel}>Total Estimado</Text>
              <Text style={styles.orcamentoTotalValue}>
                {precoEstimado.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </Text>
              <Text style={styles.orcamentoDica}>
                {distanciaKm > 0
                  ? `${distanciaKm.toFixed(1)} km de estrada · ${CATEGORIAS.find(c => c.value === categoria)?.label}`
                  : 'Marca a origem e o destino para ver o preço'}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity style={[styles.btnSubmit, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.white} /> : <Text style={styles.btnSubmitText}>Publicar Pedido de Carga</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, backgroundColor: theme.card,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg, borderRadius: 12 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  scroll: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: theme.text, marginBottom: 10, marginLeft: 5 },
  card: { backgroundColor: theme.card, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: theme.border, elevation: 1 },
  cardRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 0 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bg, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border },
  input: { flex: 1, color: theme.text, paddingVertical: 10, fontSize: 15 },
  locationInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gpsBtn: { width: 45, height: 45, borderRadius: 12, backgroundColor: theme.btnDark, alignItems: 'center', justifyContent: 'center' },
  coordsLabel: { fontSize: 11, color: theme.subText, marginTop: 4, marginLeft: 4 },
  distanciaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  rowInputs: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  switchLabel: { fontSize: 12, fontWeight: '600', color: theme.subText, marginRight: 5 },
  label: { fontSize: 12, fontWeight: '700', color: theme.subText, marginBottom: 5, marginLeft: 5 },
  chipsContainer: { flexDirection: 'row', marginBottom: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, marginRight: 8, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.subText, marginLeft: 5 },
  cardDashed: { backgroundColor: theme.bg, borderRadius: 16, padding: 20, borderWidth: 2, borderColor: theme.border, borderStyle: 'dashed', alignItems: 'center' },
  labelDashed: { fontSize: 10, fontWeight: '800', color: theme.subText, letterSpacing: 1, marginBottom: 12 },
  fotoUploadBtn: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  fotoUploadText: { fontSize: 13, color: theme.accent, fontWeight: '700', marginTop: 5 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, gap: 8, elevation: 1 },
  typeBtnActive: { backgroundColor: theme.btnDark, borderColor: theme.btnDark },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: theme.subText },
  orcamentoCard: { margin: 20, padding: 20, borderRadius: 20, backgroundColor: theme.orcamentoBg, alignItems: 'center', borderWidth: 1, borderColor: theme.orcamentoBorder },
  orcamentoTotalLabel: { fontSize: 14, color: theme.orcamentoLabel, fontWeight: '700' },
  orcamentoTotalValue: { fontSize: 26, fontWeight: '900', color: theme.orcamentoValue },
  orcamentoDica: { fontSize: 12, color: theme.orcamentoLabel, marginTop: 5, textAlign: 'center' },
  btnSubmit: { margin: 20, backgroundColor: theme.btnDark, padding: 18, borderRadius: 15, alignItems: 'center', elevation: 2 },
  btnSubmitText: { color: theme.white, fontWeight: '800', fontSize: 16 },
});