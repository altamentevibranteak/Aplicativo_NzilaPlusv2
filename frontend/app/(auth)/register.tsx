import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { API_URL as API_URL_CONST } from '../../services/api';

type TipoUsuario = 'cliente' | 'motorista';

export default function RegisterScreen() {
  const router = useRouter();
  const { API_URL: API_URL_CONTEXT } = useAuth();

  const handleOpenPrivacy = async () => {
    const url = API_URL_CONTEXT ? `${API_URL_CONTEXT}/api/termos-privacidade/` : `${API_URL_CONST}/api/termos-privacidade/`;
    await WebBrowser.openBrowserAsync(url);
  };

  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('cliente');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bi, setBi] = useState('');
  const [password, setPassword] = useState('');
  const [cartaConducao, setCartaConducao] = useState('');

  // Erros inline por campo
  const [erros, setErros] = useState<Record<string, string>>({});

  const theme = {
    background: isDarkMode ? '#0F172A' : '#F8FAFC',
    cardBg: isDarkMode ? '#0F172A' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#0F172A',
    textSecondary: isDarkMode ? '#94A3B8' : '#64748B',
    primaryBlue: '#1E40AF',
    inputBg: isDarkMode ? '#1E293B' : '#F8FAFC',
    inputBorder: isDarkMode ? '#334155' : '#E2E8F0',
    inputText: isDarkMode ? '#FFFFFF' : '#0F172A',
    placeholder: isDarkMode ? '#64748B' : '#94A3B8',
    iconColor: '#94A3B8',
    btnBackBg: isDarkMode ? '#1E293B' : '#F1F5F9',
    btnBackIcon: isDarkMode ? '#94A3B8' : '#475569',
    radioBg: isDarkMode ? '#1E293B' : '#F8FAFC',
    errorColor: '#EF4444',
    errorBg: isDarkMode ? '#3B0000' : '#FEF2F2',
    errorBorder: '#EF4444',
  };

  const BASE_URL = API_URL_CONTEXT || API_URL_CONST;

  // Limpa o erro de um campo quando o utilizador começa a editar
  function limparErro(campo: string) {
    if (erros[campo]) {
      setErros(prev => { const novo = { ...prev }; delete novo[campo]; return novo; });
    }
  }

  function validarCampos(): boolean {
    const novosErros: Record<string, string> = {};

    if (!username.trim()) {
      novosErros.username = 'O nome de utilizador é obrigatório.';
    } else if (username.trim().length < 3) {
      novosErros.username = 'O username deve ter pelo menos 3 caracteres.';
    } else if (/\s/.test(username)) {
      novosErros.username = 'O username não pode conter espaços.';
    } else if (/[^a-zA-Z0-9_]/.test(username)) {
      novosErros.username = 'Apenas letras, números e underscore (_).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      novosErros.email = 'O e-mail é obrigatório.';
    } else if (!emailRegex.test(email.trim())) {
      novosErros.email = 'Insere um endereço de e-mail válido (ex: nome@gmail.com).';
    }

    if (!password) {
      novosErros.password = 'A palavra-passe é obrigatória.';
    } else if (password.length < 8) {
      novosErros.password = 'A palavra-passe deve ter pelo menos 8 caracteres.';
    }

    const telefoneNumeros = telefone.replace(/\D/g, '');
    if (!telefone.trim()) {
      novosErros.telefone = 'O número de telefone é obrigatório.';
    } else if (telefoneNumeros.length < 9) {
      novosErros.telefone = 'Insere um número válido com pelo menos 9 dígitos.';
    }

    const biRegex = /^\d{9}[A-Z]{2}\d{3}$/;
    if (!bi.trim()) {
      novosErros.bi = 'O número do BI é obrigatório.';
    } else if (!biRegex.test(bi.trim().toUpperCase())) {
      novosErros.bi = 'Formato inválido. Ex: 000000000LA000';
    }

    const cartaRegex = /^\d{9}[A-Z]{2}\d{3}$/;
    if (tipoUsuario === 'motorista') {
      if (!cartaConducao.trim()) {
        novosErros.cartaConducao = 'A carta de condução é obrigatória para motoristas.';
      } else if (!cartaRegex.test(cartaConducao.trim().toUpperCase())) {
        novosErros.cartaConducao = 'Formato inválido. Ex: 000000000LA000';
      }
    }

    if (!aceitouTermos) {
      novosErros.termos = 'Precisas aceitar os Termos e a Política de Privacidade.';
    }

    setErros(novosErros);

    // Mostra o primeiro erro encontrado em destaque
    const primeiroErro = Object.values(novosErros)[0];
    if (primeiroErro) {
      Alert.alert('Atenção', primeiroErro);
    }

    return Object.keys(novosErros).length === 0;
  }

  async function handleRegister() {
    if (!validarCampos()) return;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          telefone: telefone.trim(),
          bi: bi.trim(),
          tipo_usuario: tipoUsuario,
          carta_conducao: tipoUsuario === 'motorista' ? cartaConducao.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mapeia erros por campo vindos do backend
        const errosBackend: Record<string, string> = {};
        const camposMap: Record<string, string> = {
          username: 'username',
          email: 'email',
          password: 'password',
          telefone: 'telefone',
          bi: 'bi',
          carta_conducao: 'cartaConducao',
        };

        const nomesLegiveis: Record<string, string> = {
          username: 'Nome de utilizador',
          email: 'E-mail',
          password: 'Palavra-passe',
          telefone: 'Telefone',
          bi: 'Bilhete de Identidade',
          cartaConducao: 'Carta de condução',
        };

        let temErroCampo = false;
        for (const [campoBd, chaveLocal] of Object.entries(camposMap)) {
          if (data[campoBd]) {
            errosBackend[chaveLocal] = Array.isArray(data[campoBd]) ? data[campoBd][0] : String(data[campoBd]);
            temErroCampo = true;
          }
        }

        if (temErroCampo) {
          setErros(errosBackend);
          const camposComErro = Object.keys(errosBackend)
            .map(k => nomesLegiveis[k])
            .filter(Boolean)
            .join(', ');
          Alert.alert(
            '❌ Erro no Registo',
            `Corrige o(s) seguinte(s) campo(s):\n\n${camposComErro}`
          );
        } else {
          // Erro genérico (ex: "Este utilizador já existe")
          const mensagem =
            data.erro ||
            data.detail ||
            data.non_field_errors?.[0] ||
            Object.values(data).flat().join('\n') ||
            'Erro desconhecido ao criar conta.';
          Alert.alert('❌ Erro no Registo', mensagem);
        }
        return;
      }

      Alert.alert(
        'Conta criada! 🎉',
        'Bem-vindo ao NZILA PLUS. Faça login para continuar.',
        [{ text: 'Entrar', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('Erro de Rede', 'Não foi possível conectar ao servidor. Verifica a tua ligação e tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Componente de input com erro inline
  const renderInput = (
    label: string,
    icon: any,
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    campoErro: string,
    options?: any
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: theme.inputBg, borderColor: erros[campoErro] ? theme.errorBorder : theme.inputBorder },
      ]}>
        <MaterialIcons
          name={icon}
          size={20}
          color={erros[campoErro] ? theme.errorColor : theme.iconColor}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { color: theme.inputText }]}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          value={value}
          onChangeText={(v) => { setValue(v); limparErro(campoErro); }}
          {...options}
        />
        {erros[campoErro] && (
          <MaterialIcons name="error-outline" size={18} color={theme.errorColor} />
        )}
      </View>
      {erros[campoErro] && (
        <Text style={[styles.erroTexto, { color: theme.errorColor }]}>
          {erros[campoErro]}
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.inputBorder }]}>

          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.btnBack, { backgroundColor: theme.btnBackBg }]}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back-ios" size={18} color={theme.btnBackIcon} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)}>
              <MaterialIcons name={isDarkMode ? 'wb-sunny' : 'dark-mode'} size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerTexts}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Criar Conta</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Junte-se à <Text style={{ color: theme.primaryBlue, fontWeight: '700' }}>NZILA PLUS</Text> conectando cargas ao destino.
            </Text>
          </View>

          <View style={styles.form}>

            {/* Seleção de tipo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>EU SOU...</Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: theme.radioBg, borderColor: tipoUsuario === 'cliente' ? theme.primaryBlue : 'transparent' }, tipoUsuario === 'cliente' && { backgroundColor: `${theme.primaryBlue}10` }]}
                  onPress={() => setTipoUsuario('cliente')}
                >
                  <MaterialIcons name="person-outline" size={32} color={tipoUsuario === 'cliente' ? theme.primaryBlue : theme.iconColor} />
                  <Text style={[styles.radioText, { color: tipoUsuario === 'cliente' ? theme.textPrimary : theme.textSecondary }]}>Cliente</Text>
                  {tipoUsuario === 'cliente' && <MaterialIcons name="check-circle" size={20} color={theme.primaryBlue} style={styles.radioCheck} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.radioBtn, { backgroundColor: theme.radioBg, borderColor: tipoUsuario === 'motorista' ? theme.primaryBlue : 'transparent' }, tipoUsuario === 'motorista' && { backgroundColor: `${theme.primaryBlue}10` }]}
                  onPress={() => setTipoUsuario('motorista')}
                >
                  <MaterialIcons name="local-shipping" size={32} color={tipoUsuario === 'motorista' ? theme.primaryBlue : theme.iconColor} />
                  <Text style={[styles.radioText, { color: tipoUsuario === 'motorista' ? theme.textPrimary : theme.textSecondary }]}>Motorista</Text>
                  {tipoUsuario === 'motorista' && <MaterialIcons name="check-circle" size={20} color={theme.primaryBlue} style={styles.radioCheck} />}
                </TouchableOpacity>
              </View>
            </View>

            {renderInput('NOME DE UTILIZADOR', 'person', username, setUsername, 'Escolhe um username', 'username', { autoCapitalize: 'none' })}
            {renderInput('ENDEREÇO DE E-MAIL', 'mail', email, setEmail, 'nome@exemplo.com', 'email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
            {renderInput('PALAVRA-PASSE', 'lock', password, setPassword, 'Mínimo 8 caracteres', 'password', { secureTextEntry: true })}
            {renderInput('NÚMERO DE TELEFONE', 'phone', telefone, setTelefone, '+244 9XX XXX XXX', 'telefone', { keyboardType: 'phone-pad' })}
            {renderInput('BILHETE DE IDENTIDADE', 'badge', bi, setBi, 'Número do BI', 'bi')}

            {tipoUsuario === 'motorista' &&
              renderInput('CARTA DE CONDUÇÃO', 'directions-car', cartaConducao, setCartaConducao, 'Número da licença', 'cartaConducao')
            }

            {/* Termos */}
            <View style={styles.termsContainer}>
              <TouchableOpacity onPress={() => { setAceitouTermos(!aceitouTermos); limparErro('termos'); }}>
                <MaterialIcons
                  name={aceitouTermos ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={erros.termos ? theme.errorColor : theme.primaryBlue}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                  Ao criar conta, concordas com os{' '}
                  <Text style={{ color: theme.primaryBlue, fontWeight: '600' }} onPress={handleOpenPrivacy}>Termos</Text>
                  {' '}e a{' '}
                  <Text style={{ color: theme.primaryBlue, fontWeight: '600' }} onPress={handleOpenPrivacy}>Privacidade</Text>.
                </Text>
                {erros.termos && (
                  <Text style={[styles.erroTexto, { color: theme.errorColor }]}>{erros.termos}</Text>
                )}
              </View>
            </View>

          </View>

          <View style={styles.form}>
            <TouchableOpacity
              style={[styles.btnSubmit, { backgroundColor: theme.primaryBlue }, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#ffffff" />
                : <Text style={styles.btnSubmitText}>Criar Conta</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/(auth)/login')}>
              <Text style={[styles.loginLinkText, { color: theme.textSecondary }]}>
                Já tem uma conta? <Text style={{ color: theme.primaryBlue, fontWeight: '700' }}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 16, justifyContent: 'center' },
  card: {
    flex: 1, borderRadius: 30, borderWidth: 1, overflow: 'hidden', paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  btnBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTexts: { paddingHorizontal: 32, paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  form: { paddingHorizontal: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, height: 55, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  erroTexto: { fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '600' },
  radioContainer: { flexDirection: 'row', gap: 16 },
  radioBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 2, position: 'relative' },
  radioText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  radioCheck: { position: 'absolute', top: 8, right: 8 },
  termsContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24, paddingRight: 10 },
  termsText: { fontSize: 12, lineHeight: 18 },
  btnSubmit: {
    borderRadius: 16, height: 60, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1E40AF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginBottom: 0,
  },
  btnSubmitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 24 },
  loginLinkText: { fontSize: 14 },
});