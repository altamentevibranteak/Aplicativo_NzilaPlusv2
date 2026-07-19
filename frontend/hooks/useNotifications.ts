import { useEffect } from 'react';
// import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configuração visual da notificação
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//  }),
//}); /

const API_URL = 'http://192.168.0.98:8000';

// export function useNotifications(token: string | null) {
//   useEffect(() => {
//     async function register() {
//       if (!Device.isDevice || !token) return;

//       try {
//         // Android precisa de canal de notificação
//         if (Platform.OS === 'android') {
//           await Notifications.setNotificationChannelAsync('default', {
//             name: 'default',
//             importance: Notifications.AndroidImportance.MAX,
//           });
//         }

//         const { status: existingStatus } = await Notifications.getPermissionsAsync();
//         let finalStatus = existingStatus;

//         if (existingStatus !== 'granted') {
//           const { status } = await Notifications.requestPermissionsAsync();
//           finalStatus = status;
//         }

//         if (finalStatus !== 'granted') {
//           console.warn('Permissão de notificações não concedida.');
//           return;
//         }

//         const tokenData = await Notifications.getExpoPushTokenAsync();
//         const pushToken = tokenData.data;

//         await fetch(`${API_URL}/api/usuarios/registar-token/`, {
//           method: 'POST',
//           headers: {
//             'Authorization': `Token ${token}`,
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({ push_token: pushToken }),
//         });

//         console.log('✅ Push Token registado no Django:', pushToken);
//       } catch (error) {
//         // Não crasha o app — apenas avisa na consola
//         // Acontece quando o build não tem suporte nativo a notificações
//         console.warn('Notificações não disponíveis neste build:', error);
//       }
//     }

//     register();
//   }, [token]);
// }