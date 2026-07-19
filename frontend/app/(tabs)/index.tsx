import { Redirect } from 'expo-router';

export default function Index() {
  // Este ficheiro agora não renderiza nada visual.
  // Ele apenas serve de gatilho para o RootLayout decidir para onde o user vai.
  return <Redirect href="/(auth)/login" />;
}