import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth(); // Assume-se que o login gere o token internamente
  const { height } = useWindowDimensions();

  // Estados do formulário
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ESTADO DO TEMA (Substitui o onclick="toggle('dark')" do HTML)
  const [isDarkMode, setIsDarkMode] = useState(false); // Nasce branco, como pediste

  // Definição de Cores Dinâmicas baseada no Tema (Seguindo o protótipo Tailwind)
  const theme = {
    background: isDarkMode ? '#0f172a' : '#FFFFFF',
    textNzila: isDarkMode ? '#FFFFFF' : '#000000',
    tagline: isDarkMode ? '#94a3b8' : '#64748b',
    watermark: isDarkMode ? '#FFFFFF' : '#E2E8F0',
    inputBg: isDarkMode ? '#1e293b' : '#f1f5f9',
    inputBorder: isDarkMode ? '#334155' : '#e2e8f0',
    inputText: isDarkMode ? '#FFFFFF' : '#000000',
    placeholder: isDarkMode ? '#64748b' : '#94a3b8',
    dividerLine: isDarkMode ? '#1e293b' : '#e2e8f0',
    dividerText: isDarkMode ? '#64748b' : '#94a3b8',
    socialBg: isDarkMode ? '#1e293b' : '#f1f5f9',
    socialBorder: isDarkMode ? '#334155' : '#e2e8f0',
    socialLabel: isDarkMode ? '#cbd5e1' : '#475569',
    socialIcon: isDarkMode ? '#FFFFFF' : '#000000',
    footerText: isDarkMode ? '#94a3b8' : '#64748b',
    themeToggleBg: isDarkMode ? '#1e293b' : '#FFFFFF',
    themeToggleIcon: isDarkMode ? '#94a3b8' : '#64748b',
  };

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha o utilizador e a senha.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      const message = e?.message || 'Utilizador ou senha incorretos.';
      Alert.alert('Erro de Acesso', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* StatusBar ajustada Dinamicamente */}
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />

      {/* Marca d'água de fundo (Ajustada Dinamicamente) */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <MaterialIcons name="local-shipping" size={120} color={theme.watermark} style={[styles.watermarkIcon, { top: 40, left: 40, transform: [{ rotate: '-12deg' }] }]} />
        <MaterialIcons name="inventory-2" size={120} color={theme.watermark} style={[styles.watermarkIcon, { bottom: 80, right: 40, transform: [{ rotate: '12deg' }] }]} />
        <MaterialIcons name="route" size={100} color={theme.watermark} style={[styles.watermarkIcon, { top: height * 0.45, left: '20%', transform: [{ rotate: '-45deg' }] }]} />
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <MaterialIcons name="local-shipping" size={48} color="#ffffff" />
          </View>
          <Text style={[styles.appName, { color: theme.textNzila }]}>
            NZILA <Text style={styles.appNameHighlight}>PLUS</Text>
          </Text>
          <Text style={[styles.tagline, { color: theme.tagline }]}>Conectando Cargas ao Seu Destino</Text>
        </View>

        {/* Form (Card ajustado Dinamicamente) */}
        <View style={styles.formContainer}>
          {/* Input de Email */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <MaterialIcons name="person-outline" size={22} color="#94a3b8" style={styles.inputIconLeft} />
          <TextInput
            style={[styles.input, { color: theme.inputText }]}
            placeholder="Username ou E-mail"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername} // Atualiza o username
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

          {/* Input de Senha */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <MaterialIcons name="lock-open" size={22} color="#94a3b8" style={styles.inputIconLeft} />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Senha"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIconRight}>
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={22} 
                color="#94a3b8" 
              />
            </TouchableOpacity>
          </View>

          {/* Esqueceu a senha */}
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.btnLogin, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.btnLoginText}>Entrar</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#ffffff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Divisor */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: theme.dividerLine }]} />
          <Text style={[styles.dividerText, { color: theme.dividerText }]}>OU ENTRE COM</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.dividerLine }]} />
        </View>

        {/* Botões Sociais */}
        <View style={styles.socialContainer}>
          <TouchableOpacity style={[styles.btnSocial, { backgroundColor: theme.socialBg, borderColor: theme.socialBorder }]}>
            <Text style={styles.btnSocialTextGoogle}>G</Text>
            <Text style={[styles.btnSocialLabel, { color: theme.socialLabel }]}>Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.btnSocial, { backgroundColor: theme.socialBg, borderColor: theme.socialBorder }]}>
            <MaterialIcons name="apple" size={22} color={theme.socialIcon} style={styles.btnSocialIcon} />
            <Text style={[styles.btnSocialLabel, { color: theme.socialLabel }]}>Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.footerText }]}>Não tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}> Criar Conta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BOTÃO FLUTUANTE DE TROCA DE TEMA (O "onclick" do teu HTML) */}
      <TouchableOpacity 
        style={[styles.themeToggle, { backgroundColor: theme.themeToggleBg, borderColor: theme.inputBorder }]} 
        onPress={() => setIsDarkMode(!isDarkMode)} // Toggle Sutil
      >
        <MaterialIcons 
          name={isDarkMode ? "wb-sunny" : "dark-mode"} // Sol ou Lua
          size={24} 
          color={theme.themeToggleIcon} 
        />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  watermarkIcon: {
    position: 'absolute',
    opacity: 0.1, // Opacidade super baixa para ser sutil
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: '#2563eb', // primary blue
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appNameHighlight: {
    color: '#2563eb',
  },
  tagline: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIconLeft: {
    marginRight: 12,
  },
  inputIconRight: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  btnLogin: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnLoginText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  btnSocial: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSocialTextGoogle: {
    color: '#DB4437',
    fontWeight: '900',
    fontSize: 18,
    marginRight: 8,
  },
  btnSocialIcon: {
    marginRight: 8,
  },
  btnSocialLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  // ESTILO DO BOTÃO FLUTUANTE
  themeToggle: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10, // Sombra forte para flutuar
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 100,
  },
});