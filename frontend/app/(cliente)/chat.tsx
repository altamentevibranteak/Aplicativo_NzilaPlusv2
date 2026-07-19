import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatarTelefoneAngola, urlWhatsApp } from '../../utils/formatarTelefone';

const SUPORTE_WHATSAPP = '244929885183';
const SUPORTE_MENSAGEM = 'Olá, preciso de ajuda com o Nzila Plus.';

export default function ChatCliente() {
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    async function abrirWhatsApp() {
      try {
        const response = await api.get('/api/cargas/?status=EM_TRANSITO');
        const data = response.data;
        const cargaActiva = Array.isArray(data) ? data[0] : data.results?.[0];

        if (!cargaActiva) {
          Alert.alert(
            'Suporte Nzila',
            'Não tens nenhuma viagem activa. Queres falar com o nosso suporte?',
            [
              { text: 'Agora não', onPress: () => router.replace('/(cliente)/home'), style: 'cancel' },
              {
                text: 'Suporte',
                onPress: () => {
                  Linking.openURL(urlWhatsApp(SUPORTE_WHATSAPP, SUPORTE_MENSAGEM));
                  router.replace('/(cliente)/home');
                },
              },
            ]
          );
          return;
        }

        const telefoneRaw = cargaActiva.motorista_telefone;
        const nome = cargaActiva.motorista_nome;

        if (!telefoneRaw) {
          Alert.alert('Aviso', 'O motorista ainda não registou o número de telefone.');
          router.replace('/(cliente)/home');
          return;
        }

        const numeroFinal = formatarTelefoneAngola(telefoneRaw);

        if (!numeroFinal) {
          Alert.alert('Aviso', 'O número do motorista é inválido.');
          router.replace('/(cliente)/home');
          return;
        }

        const mensagem = `Olá ${nome || 'Motorista'}! Estou a contactar sobre a minha encomenda no Nzila Plus.`;

        Alert.alert(
          'Contactar Motorista',
          `Desejas falar com ${nome || 'o motorista'}?`,
          [
            { text: 'Cancelar', onPress: () => router.replace('/(cliente)/home'), style: 'cancel' },
            {
              text: 'Abrir WhatsApp',
              onPress: () => {
                Linking.openURL(urlWhatsApp(numeroFinal, mensagem)).catch(() => {
                  Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
                });
                router.replace('/(cliente)/home');
              },
            },
          ]
        );
      } catch (error) {
        console.error('Erro no Chat Cliente:', error);
        Alert.alert('Erro', 'Falha ao carregar dados do chat.');
        router.replace('/(cliente)/home');
      }
    }

    abrirWhatsApp();
  }, [token]);

  return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
}