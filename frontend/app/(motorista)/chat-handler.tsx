import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatarTelefoneAngola, urlWhatsApp } from '../../utils/formatarTelefone';

export default function ChatHandler() {
  const router = useRouter();
  const { userType, token } = useAuth();

  useEffect(() => {
    if (!token) return;
    
    const abrirWhatsApp = async () => {
      try {
        const response = await api.get('/api/cargas/ativa/');
        const data = response.data;
        const cargaActiva = data?.id ? data : null;

        if (!cargaActiva) {
          Alert.alert(
            'Chat Nzila',
            'Não encontrámos nenhuma viagem activa no momento.',
            [{ text: 'Ok', onPress: () => router.replace('/(motorista)/home') }]
          );
          return;
        }

        const eCliente = userType === 'cliente';
        const telefoneRaw = eCliente ? cargaActiva.motorista_telefone : cargaActiva.cliente_telefone;
        const nomeDestinatario = eCliente ? cargaActiva.motorista_nome : cargaActiva.cliente_nome;

        if (!telefoneRaw) {
          Alert.alert('Aviso', 'O contacto da outra parte não está disponível.');
          router.replace('/(motorista)/home');
          return;
        }
        console.log('=== DEBUG WHATSAPP ===');
        console.log('telefoneRaw:', telefoneRaw);
        console.log('numeroFinal:', formatarTelefoneAngola(telefoneRaw));
        console.log('cargaActiva completa:', JSON.stringify(cargaActiva, null, 2));

        const numeroFinal = formatarTelefoneAngola(telefoneRaw);

        if (!numeroFinal) {
          Alert.alert('Aviso', 'O número de telefone registado é inválido.');
          router.replace('/(motorista)/home');
          return;
        }

        const mensagem = eCliente
          ? `Olá ${nomeDestinatario || ''}! Estou a contactar sobre a minha encomenda no Nzila Plus.`
          : `Olá ${nomeDestinatario || ''}! Sou o motorista responsável pela sua entrega no Nzila Plus.`;

        Alert.alert(
          'Contactar via WhatsApp',
          `Desejas abrir o chat com ${nomeDestinatario || 'a outra parte'}?`,
          [
            { text: 'Cancelar', onPress: () => router.replace('/(motorista)/home'), style: 'cancel' },
            {
              text: 'Sim, Abrir',
              onPress: () => {
                Linking.openURL(urlWhatsApp(numeroFinal, mensagem)).catch(() => {
                  Alert.alert('Erro', 'Certifica-te que o WhatsApp está instalado.');
                });
                router.replace('/(motorista)/home');
              },
            },
          ]
        );
      } catch (error) {
        console.error('Erro no ChatHandler:', error);
        router.replace('/(motorista)/home');
      }
    };

    abrirWhatsApp();
  }, [userType, token]);

  return <View style={{ flex: 1, backgroundColor: '#111827' }} />;
}