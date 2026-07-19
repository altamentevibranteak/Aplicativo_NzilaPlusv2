import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Colors } from '../constants/theme';
import api, { API_URL } from '../services/api';

type ThemeType = typeof Colors.light;

interface AuthContextData {
  signed: boolean;
  user: any | null;
  userType: 'cliente' | 'motorista' | null; // Adicionado para clareza
  loading: boolean;
  login(username: string, pass: string): Promise<void>;
  token: string | null;
  register(data: any): Promise<void>;
  logout(): void;
  API_URL: string;
  theme: ThemeType;
  isDarkMode: boolean;
  toggleTheme(): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userType, setUserType] = useState<'cliente' | 'motorista' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = isDarkMode ? Colors.dark : Colors.light;

  useEffect(() => {
    async function loadStorageData() {
      const [storageUser, storageToken, storageTheme] = await Promise.all([
        AsyncStorage.getItem('@NzilaPlus:user'),
        AsyncStorage.getItem('@NzilaPlus:token'),
        AsyncStorage.getItem('@NzilaPlus:theme'),
      ]);

      if (storageUser && storageToken) {
        const parsedUser = JSON.parse(storageUser);
        api.defaults.headers.Authorization = `Token ${storageToken}`;
        setUser(parsedUser);
        setUserType(parsedUser.type); // Sincroniza o tipo ao carregar
        setToken(storageToken);
      }
      if (storageTheme) setIsDarkMode(storageTheme === 'dark');
      setLoading(false);
    }
    loadStorageData();
  }, []);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('@NzilaPlus:theme', newMode ? 'dark' : 'light');
  };

  async function login(username: string, pass: string) {
    try {
      const response = await api.post(`${API_URL}/api/login/`, { username, password: pass });
      
      // Captura exata conforme o teu backend Django envia
      const { token: receivedToken, user_id, user_type, username: registeredName } = response.data;
      
      const userData = { 
        id: user_id, 
        type: user_type, // 'cliente' ou 'motorista'
        username: registeredName 
      };

      api.defaults.headers.Authorization = `Token ${receivedToken}`;
      
      // Persistência no AsyncStorage
      await AsyncStorage.setItem('@NzilaPlus:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@NzilaPlus:token', receivedToken);
      
      setToken(receivedToken);
      setUserType(user_type);
      setUser(userData); 
    } catch (error: any) {
      const serverError = error.response?.data;
      const message =
        serverError?.error ||
        serverError?.detail ||
        serverError?.non_field_errors?.[0] ||
        serverError?.message ||
        (typeof serverError === 'string' ? serverError : null) ||
        'Erro no login';
      throw new Error(message);
    }
  }

  async function register(data: any) {
    try {
      const response = await api.post(`${API_URL}/api/register/`, data);
      return response.data;
    } catch (error: any) {
      const serverError = error.response?.data;
      throw new Error(serverError ? Object.values(serverError).flat()[0] as string : 'Erro no registo');
    }
  }

  function logout() {
    AsyncStorage.multiRemove(['@NzilaPlus:user', '@NzilaPlus:token']).then(() => {
      setUser(null);
      setUserType(null);
      setToken(null);
      api.defaults.headers.Authorization = '';
    });
  }

  return (
    <AuthContext.Provider value={{ 
      signed: !!user, user, userType, token, loading, login, register, logout, API_URL, theme, isDarkMode, toggleTheme 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() { return useContext(AuthContext); }