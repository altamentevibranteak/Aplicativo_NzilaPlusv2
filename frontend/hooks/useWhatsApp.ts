import { Alert, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function useWhatsApp() {
  const { userType } = useAuth();

  const abrirChat = (carga: any) => {
    const ehCliente = userType === 'cliente';

    const telefone = ehCliente
      ? carga.motorista_telefone
      : carga.cliente_telefone;

    const nome = ehCliente
      ? carga.motorista_nome
      : carga.cliente_nome;

    if (!telefone) {
      Alert.alert(
        'Sem contacto',
        ehCliente
          ? 'Este motorista ainda não tem número registado.'
          : 'Este cliente ainda não tem número registado.'
      );
      return;
    }

    const numeroLimpo = telefone.replace(/\D/g, '');
    const mensagem = ehCliente
      ? `Olá ${nome || 'Motorista'}! Estou a contactá-lo sobre a minha encomenda no Nzila Plus.`
      : `Olá ${nome || 'Cliente'}! Sou o motorista responsável pela sua entrega no Nzila Plus.`;

    Linking.openURL(
      `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
    ).catch(() =>
      Alert.alert('Erro', 'Certifica-te que o WhatsApp está instalado.')
    );
  };

  return { abrirChat };
}