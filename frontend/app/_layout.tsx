import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootLayoutNav() {
  const { signed, loading, userType } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const rootSegment = segments[0] as string;
    const inAuthGroup = segments.some(s => s.includes('auth'));

    if (!signed) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else {
      if (userType === 'motorista') {
        if (rootSegment !== '(motorista)') {
          router.replace('/(motorista)/home' as any);
        }
      } else if (userType === 'cliente') {
        if (rootSegment !== '(cliente)') {
          router.replace('/(cliente)/home' as any);
        }
      }
    }
  }, [signed, userType, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#B45309" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />
      <Stack.Screen name="(cliente)" />
      <Stack.Screen name="(motorista)" />
      <Stack.Screen name="(main)/index" />
      <Stack.Screen name="modal" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}