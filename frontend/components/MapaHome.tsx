import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, SafeAreaView,
  StyleSheet, Text, TouchableOpacity, View
} from 'react-native';

// O teu token
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

const COORDENADAS_PADRAO: [number, number] = [13.2345, -8.8383]; // Luanda
const COLOR_PRIMARY = '#10b981'; // Ajustado para o Verde Premium

export default function MapaHome() {
  const [coords, setCoords] = useState<[number, number]>(COORDENADAS_PADRAO);
  const [loading, setLoading] = useState(true);
  const [endereco, setEndereco] = useState('');
  const [mapaAberto, setMapaAberto] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  useEffect(() => {
    async function detectarLocalizacao() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLoading(false); return; }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;
        const novasCoords: [number, number] = [longitude, latitude];
        
        setCoords(novasCoords);
        cameraRef.current?.setCamera({ centerCoordinate: novasCoords, zoomLevel: 14, animationDuration: 2000 });

        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode[0]) {
          const e = geocode[0];
          setEndereco([e.street, e.district, e.city].filter(Boolean).join(', '));
        }
      } catch (e) {
        console.error('Erro:', e);
      } finally {
        setLoading(false);
      }
    }
    detectarLocalizacao();
  }, []);

  return (
    <>
      <View style={styles.container}>
        <MapboxGL.MapView style={styles.map} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false}>
          <MapboxGL.Camera ref={cameraRef} centerCoordinate={coords} zoomLevel={12} animationMode="flyTo" />
        </MapboxGL.MapView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={COLOR_PRIMARY} size="large" />
            <Text style={styles.loadingTextOverlay}>A detetar localização...</Text>
          </View>
        )}

        {!loading && (
          <View style={styles.pinoCentro} pointerEvents="none">
            <View style={styles.markerPulse} />
            <View style={styles.markerDot} />
          </View>
        )}

        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setMapaAberto(true)} activeOpacity={0.9} />

        {!loading && endereco ? (
          <View style={styles.enderecoBox}>
            <Text style={styles.enderecoIcon}>📍</Text>
            <Text style={styles.enderecoText} numberOfLines={1}>{endereco}</Text>
          </View>
        ) : null}
      </View>

      <Modal visible={mapaAberto} animationType="slide" onRequestClose={() => setMapaAberto(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>📍 A minha localização</Text>
            <TouchableOpacity style={styles.btnFechar} onPress={() => setMapaAberto(false)}>
              <Text style={styles.btnFecharTexto}>✕ Fechar</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {mapaAberto && (
              <MapboxGL.MapView style={styles.map} scrollEnabled zoomEnabled>
                <MapboxGL.Camera centerCoordinate={coords} zoomLevel={14} animationMode="none" />
                <MapboxGL.MarkerView id="ponto-modal" coordinate={coords}>
                  <View style={styles.markerWrapper}>
                    <View style={styles.markerPulse} />
                    <View style={styles.markerDot} />
                  </View>
                </MapboxGL.MarkerView>
              </MapboxGL.MapView>
            )}
          </View>

          {endereco ? (
            <View style={styles.modalEndereco}>
              <Text style={styles.enderecoIcon}>📍</Text>
              <Text style={styles.enderecoText}>{endereco}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  map: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 24, 39, 0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingTextOverlay: { color: '#f1f5f9', fontSize: 13, marginTop: 8, fontWeight: 'bold' },
  pinoCentro: { position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  markerWrapper: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  markerPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.4)' },
  markerDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLOR_PRIMARY, borderWidth: 3, borderColor: '#fff', elevation: 5 },
  enderecoBox: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(17, 24, 39, 0.9)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 5 },
  enderecoIcon: { fontSize: 12 },
  enderecoText: { fontSize: 12, color: '#f1f5f9', fontWeight: '600', flex: 1 },
  modalContainer: { flex: 1, backgroundColor: '#111827' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitulo: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  btnFechar: { backgroundColor: '#1E293B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  btnFecharTexto: { color: COLOR_PRIMARY, fontSize: 13, fontWeight: '900' },
  modalEndereco: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#334155', backgroundColor: '#1E293B' },
});