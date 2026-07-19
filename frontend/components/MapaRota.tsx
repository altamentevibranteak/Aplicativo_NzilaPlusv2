import { MaterialIcons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Teu token mantido
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

interface MapaRotaProps {
  origemCoords: [number, number];
  destinoCoords: [number, number];
  origemLabel: string;
  destinoLabel: string;
}

export default function MapaRota({ origemCoords, destinoCoords, origemLabel, destinoLabel }: MapaRotaProps) {
  const { isDarkMode } = useAuth();
  const [rota, setRota] = useState<any>(null);
  const [mapaAberto, setMapaAberto] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const theme = {
    card: isDarkMode ? '#1E293B' : '#F1F5F9',
    text: isDarkMode ? '#F8FAFC' : '#0F172A',
    accent: '#10b981', // Verde Premium
    border: isDarkMode ? '#334155' : '#E2E8F0',
    bg: isDarkMode ? '#111827' : '#FFFFFF',
  };

  const origemStr = origemCoords ? `${origemCoords[0]},${origemCoords[1]}` : '';
  const destinoStr = destinoCoords ? `${destinoCoords[0]},${destinoCoords[1]}` : '';

  useEffect(() => {
    const buscarDirecoes = async () => {
      if (!origemCoords || !destinoCoords || typeof origemCoords[0] !== 'number') return;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origemCoords[0]},${origemCoords[1]};${destinoCoords[0]},${destinoCoords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      
      try {
        const response = await fetch(url);
        const json = await response.json();
        if (json.routes && json.routes.length > 0) {
          setRota(json.routes[0].geometry);
        }
      } catch (error) {
        console.error("Erro ao traçar rota:", error);
      }
    };

    if (origemStr && destinoStr) buscarDirecoes();
  }, [origemStr, destinoStr]);

  const abrirNoGps = () => {
    const origin = `${origemCoords[1]},${origemCoords[0]}`;
    const destination = `${destinoCoords[1]},${destinoCoords[0]}`;
    const url = Platform.select({
      ios: `maps://app?saddr=${origin}&daddr=${destination}`,
      android: `google.navigation:q=${destination}`,
    });
    if (url) Linking.openURL(url);
  };

  // Componente interno para os elementos do mapa (evita repetição)
  const ConteudoDoMapa = () => (
    <>
      <MapboxGL.Camera
        ref={cameraRef}
        animationMode="flyTo"
        bounds={{
          ne: [Math.max(origemCoords[0], destinoCoords[0]), Math.max(origemCoords[1], destinoCoords[1])],
          sw: [Math.min(origemCoords[0], destinoCoords[0]), Math.min(origemCoords[1], destinoCoords[1])],
          paddingLeft: 50, paddingRight: 50, paddingTop: 50, paddingBottom: 50
        }}
      />

      {rota && (
        <MapboxGL.ShapeSource id="routeSource" shape={rota}>
          <MapboxGL.LineLayer
            id="routeLayer"
            style={{ lineColor: theme.accent, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
          />
        </MapboxGL.ShapeSource>
      )}

      <MapboxGL.PointAnnotation id="origem" coordinate={origemCoords}>
        <View style={styles.markerDotWhite} />
      </MapboxGL.PointAnnotation>

      <MapboxGL.PointAnnotation id="destino" coordinate={destinoCoords}>
        <View style={styles.markerWrapper}>
          <View style={styles.markerPulse} />
          <View style={styles.markerDot} />
        </View>
      </MapboxGL.PointAnnotation>
    </>
  );

  const dadosValidos = origemCoords && destinoCoords && typeof origemCoords[0] === 'number';
  if (!dadosValidos) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* VISTA MINIATURA */}
      <View style={styles.miniMapWrapper}>
        <MapboxGL.MapView 
          style={styles.map} 
          logoEnabled={false} 
          styleURL={isDarkMode ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Street}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <ConteudoDoMapa />
        </MapboxGL.MapView>
        
        {/* Camada para abrir o Modal */}
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={() => setMapaAberto(true)} 
          activeOpacity={0.9} 
        />
        
        <View style={styles.expandBadge}>
          <MaterialIcons name="fullscreen" size={18} color="#FFF" />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={abrirNoGps}>
          <MaterialIcons name="directions" size={20} color="#FFF" />
          <Text style={styles.btnText}>Abrir GPS Externo</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL TELA CHEIA */}
      <Modal visible={mapaAberto} animationType="slide" onRequestClose={() => setMapaAberto(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setMapaAberto(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Rota da Carga</Text>
              <Text style={styles.modalSub}>{destinoLabel}</Text>
            </View>
          </View>
          
          <MapboxGL.MapView 
            style={styles.map} 
            styleURL={isDarkMode ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Street}
          >
            <ConteudoDoMapa />
          </MapboxGL.MapView>

          <View style={[styles.modalFooter, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={[styles.btn, { width: '100%' }]} onPress={abrirNoGps}>
              <MaterialIcons name="navigation" size={20} color="#FFF" />
              <Text style={styles.btnText}>Iniciar Navegação</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  miniMapWrapper: { height: 200 },
  map: { flex: 1 },
  footer: { padding: 12, alignItems: 'center' },
  expandBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 8 },
  btn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  // Estilos dos Marcadores (Estilo MapaHome)
  markerWrapper: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  markerPulse: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 1, borderColor: '#10b981' },
  markerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
  markerDotWhite: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#10b981' },

  // Estilos do Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  closeBtn: { marginRight: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSub: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  modalFooter: { padding: 20, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }
});