import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

// ⚠️ ATENÇÃO: Se usaste o .env como falámos no GitHub, deixa assim. 
// Se não, substitui o 'process.env...' pelo teu token "pk..." entre aspas.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

export default function Mapa() {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      // 1. Pede permissão ao telemóvel para usar o GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      // 2. Se o utilizador aceitar, pega a localização atual
      if (status === 'granted') {
        const userLocation = await Location.getCurrentPositionAsync({});
        // O Mapbox exige a ordem [longitude, latitude]
        setLocation([userLocation.coords.longitude, userLocation.coords.latitude]);
      }
    })();
  }, []);

  // Enquanto verifica o GPS, mostra um ecrã de carregamento elegante
  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.text}>A carregar o mapa do Nzila Plus...</Text>
      </View>
    );
  }

  // Se o utilizador negar o GPS
  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>A permissão de localização foi negada. O mapa precisa de GPS para funcionar.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView 
        style={styles.map} 
        styleURL={Mapbox.StyleURL.Street} 
        logoEnabled={false} // Remove o logo do Mapbox para ficar mais limpo
        compassEnabled={true}
      >
        <Mapbox.Camera
          zoomLevel={14}
          // Se o GPS ainda estiver a carregar, centra em Luanda por defeito
          centerCoordinate={location || [13.2343, -8.8368]} 
          animationMode="flyTo"
          animationDuration={2000}
        />
        
        {/* Mostra o ponto azul vivo que indica onde o telemóvel está agora */}
        <Mapbox.UserLocation 
          visible={true} 
          showsUserHeadingIndicator={true} 
        />
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' // Fundo escuro a combinar com o mapa dark
  },
  map: {
    flex: 1,
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC',
    padding: 20
  },
  text: { 
    marginTop: 12,
    fontSize: 16, 
    color: '#64748B', 
    fontWeight: '600',
    textAlign: 'center'
  }
});