import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Props {
  perfilImg: string | null;
  documentosPendentes: boolean;
}

const PASSOS = [
  {
    id: 1,
    titulo: "Validar Identidade",
    desc: "Entre no seu perfil clique no icone de lápis para editar o seu perfil e envie  a foto do teu BI e Carta de Condução para ativar a tua conta.",
    icon: "file-certificate-outline",
    cor: "#ef4444",
  },
  {
    id: 2,
    titulo: "Notificações",
    desc: "Ativa as notificações para receberes novos pedidos de carga em tempo real.",
    icon: "bell-ring-outline",
    cor: "#3b82f6",
  },
  {
    id: 3,
    titulo: "Tudo Pronto!",
    desc: "Após a validação dos teus documentos, poderás começar a faturar no Nzila Plus.",
    icon: "check-decagram-outline",
    cor: "#10b981",
  },
];

export default function TutorialModal({ perfilImg, documentosPendentes }: Props) {
  const [passoAtual, setPassoAtual] = useState(0);
  // Controla se o utilizador já dispensou o modal nesta sessão
  const [dispensado, setDispensado] = useState(false);

  // Sempre que o perfil carregar e os docs estiverem pendentes,
  // mostra o modal novamente (comportamento de "a cada login")
  useEffect(() => {
    console.log('TutorialModal — documentosPendentes:', documentosPendentes);
    if (documentosPendentes) {
      setDispensado(false);
      setPassoAtual(0);
    }
  }, [documentosPendentes]);

  const eUltimoPasso = passoAtual === PASSOS.length - 1;

  const proximoPasso = () => {
    if (!eUltimoPasso) {
      setPassoAtual(prev => prev + 1);
    } else {
      // Fecha o modal ao clicar "Entendido" no último passo
      setDispensado(true);
    }
  };

  const item = PASSOS[passoAtual];
  const visivel = documentosPendentes && !dispensado;

  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* Avatar / foto de perfil */}
          <View style={styles.logoContainer}>
            {perfilImg ? (
              <Image source={{ uri: perfilImg }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <MaterialCommunityIcons name="account" size={40} color="#64748b" />
              </View>
            )}
          </View>

          {/* Ícone do passo actual */}
          <View style={[styles.iconBox, { backgroundColor: `${item.cor}22` }]}>
            <MaterialCommunityIcons name={item.icon as any} size={36} color={item.cor} />
          </View>

          {/* Indicador de progresso */}
          <View style={styles.progressoContainer}>
            {PASSOS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.ponto,
                  {
                    backgroundColor: i === passoAtual ? item.cor : '#334155',
                    width: i === passoAtual ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.titulo}>{item.titulo}</Text>
          <Text style={styles.descricao}>{item.desc}</Text>

          <TouchableOpacity
            style={[styles.botao, { backgroundColor: item.cor }]}
            onPress={proximoPasso}
          >
            <Text style={styles.botaoTexto}>
              {passoAtual === PASSOS.length - 1 ? "Entendido" : "Seguinte"}
            </Text>
          </TouchableOpacity>

          {/* Saltar tutorial */}
          {!eUltimoPasso && (
            <TouchableOpacity onPress={() => setDispensado(true)} style={styles.saltarBtn}>
              <Text style={styles.saltarTexto}>Saltar tutorial</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 26, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: width * 0.88,
    backgroundColor: '#1e293b',
    borderRadius: 35,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoContainer: { marginBottom: 16 },
  logo: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#334155' },
  logoPlaceholder: { backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  iconBox: { padding: 16, borderRadius: 20, marginBottom: 20 },
  progressoContainer: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  ponto: { height: 6, borderRadius: 3, marginHorizontal: 3 },
  titulo: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  descricao: {
    color: '#94a3b8', fontSize: 15, textAlign: 'center',
    marginTop: 12, lineHeight: 22, paddingHorizontal: 10,
  },
  botao: {
    width: '100%', padding: 18, borderRadius: 20,
    marginTop: 35, alignItems: 'center',
  },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  saltarBtn: { marginTop: 16 },
  saltarTexto: { color: '#475569', fontSize: 13 },
});