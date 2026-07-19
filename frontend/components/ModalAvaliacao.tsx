import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  visivel: boolean;
  nomeMotorista: string;
  onEnviar: (nota: number, comentario: string) => void;
  onCancelar: () => void;
  loading: boolean;
}

export default function ModalAvaliacao({ visivel, nomeMotorista, onEnviar, onCancelar, loading }: Props) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');

  const handleEnviar = () => {
    if (nota > 0) {
      onEnviar(nota, comentario);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <MaterialCommunityIcons name="check-decagram" size={50} color="#10b981" />
          
          <Text style={styles.titulo}>Entrega Concluída!</Text>
          <Text style={styles.subtitulo}>
            Como avalias o serviço do motorista <Text style={{fontWeight: 'bold', color: '#fff'}}>{nomeMotorista}</Text>?
          </Text>

          {/* SISTEMA DE ESTRELAS INTERATIVO */}
          <View style={styles.estrelasContainer}>
            {[1, 2, 3, 4, 5].map((estrela) => (
              <TouchableOpacity 
                key={estrela} 
                onPress={() => setNota(estrela)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name={nota >= estrela ? "star" : "star-outline"} 
                  size={42} 
                  color={nota >= estrela ? "#f59e0b" : "#475569"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Algum comentário sobre a entrega? (Opcional)"
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            value={comentario}
            onChangeText={setComentario}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnCancelar} onPress={onCancelar}>
              <Text style={styles.btnTextoSecundario}>Agora não</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnEnviar, { opacity: nota === 0 || loading ? 0.5 : 1 }]} 
              onPress={handleEnviar}
              disabled={nota === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnTextoPrincipal}>AVALIAR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modal: { 
    width: '88%', 
    backgroundColor: '#1e293b', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  titulo: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  subtitulo: { color: '#94a3b8', fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  estrelasContainer: { flexDirection: 'row', marginVertical: 20, gap: 4 },
  input: { 
    width: '100%', 
    backgroundColor: '#0f172a', 
    borderRadius: 12, 
    padding: 12, 
    color: '#fff', 
    height: 80, 
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 20
  },
  footer: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancelar: { flex: 1, padding: 16, alignItems: 'center' },
  btnEnviar: { 
    flex: 2, 
    backgroundColor: '#10b981', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 4
  },
  btnTextoPrincipal: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnTextoSecundario: { color: '#64748b', fontSize: 14 }
});