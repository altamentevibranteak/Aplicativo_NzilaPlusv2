import { Platform } from 'react-native';

// Cores base do NZILA PLUS (Inspiradas no teu Dashboard HTML)
const azulMarinho = '#0F172A'; 
const azulDestaque = '#3B82F6';
const verdeSucesso = '#16A34A';

export const Colors = {
  light: {
    text: '#1E293B',
    background: '#F8FAFC', // Cinza muito claro premium
    tint: azulDestaque,
    primary: azulMarinho,   // Adicionamos esta chave
    success: verdeSucesso,  // Adicionamos esta chave
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: azulDestaque,
    card: '#FFFFFF',
    border: '#E2E8F0',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0F172A', // No dark mode, o fundo vira o marinho
    tint: '#fff',
    primary: '#3B82F6',
    success: '#22C55E',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
    card: '#1E293B',
    border: '#334155',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
