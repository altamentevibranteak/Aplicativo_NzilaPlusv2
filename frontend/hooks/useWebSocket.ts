import { useEffect, useRef } from 'react';

interface WebSocketProps {
  url: string;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export function useWebSocket({ url, onMessage, onConnect, onError, onClose }: WebSocketProps) {
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
  }, [onMessage, onConnect]);

  useEffect(() => {
    if (!url) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const conectar = () => {
      if (destroyed) return;

      console.log('🔌 Tentando conectar ao WebSocket:', url);
      socket = new WebSocket(url);

      socket.onopen = () => {
        console.log('✅ WebSocket conectado:', url);
        onConnectRef.current?.();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Mensagem recebida:', data);
          onMessageRef.current?.(data);
        } catch (e) {
          console.error('❌ Erro ao parse:', e);
        }
      };

      socket.onerror = (error) => {
        console.error('⚠️ Erro no WebSocket:', error);
        onError?.(error);
      };

      socket.onclose = () => {
        console.log('❌ WebSocket desconectado');
        socket = null;
        onClose?.();

        if (!destroyed) {
          reconnectTimeout = setTimeout(conectar, 3000);
        }
      };
    };

    conectar();

    return () => {
      destroyed = true;
      console.log('🔴 useWebSocket CLEANUP — componente desmontou');
      if (reconnectTimeout !== null) clearTimeout(reconnectTimeout);
      if (socket) {
        console.log('🔌 Fechando WebSocket');
        socket.close();
        socket = null;
      }
    };
  }, [url]);
}