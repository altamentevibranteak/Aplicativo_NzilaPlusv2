import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from .models import Carga


class CargaConsumer(AsyncWebsocketConsumer):
    """Consumer genérico para atualizações de todas as cargas"""

    async def connect(self):
        self.group_name = 'cargas'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def carga_update(self, event):
        await self.send(text_data=json.dumps(event['data']))


class CargaDetailConsumer(AsyncWebsocketConsumer):
    """Consumer específico para uma carga individual com validação de token"""

    async def connect(self):
        self.carga_id = self.scope['url_route']['kwargs']['id']

        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_param = params.get('token', [None])[0]

        if not token_param:
            print(f"❌ Conexão rejeitada: sem token para carga {self.carga_id}")
            await self.close()
            return

        self.user = await self.get_user_from_token(token_param)
        if not self.user:
            print(f"❌ Conexão rejeitada: token inválido para carga {self.carga_id}")
            await self.close()
            return

        carga = await self.get_carga_if_allowed(self.carga_id, self.user)
        if not carga:
            print(f"❌ Conexão rejeitada: utilizador não tem acesso à carga {self.carga_id}")
            await self.close()
            return

        self.group_name = f'cargas_{self.carga_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        print(f"✅ Cliente {self.user.username} conectado ao WebSocket da carga {self.carga_id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            print(f"❌ Cliente desconectado da carga {self.carga_id}")

    async def receive(self, text_data):
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Conectado ao rastreamento da carga {self.carga_id}',
            'id': self.carga_id
        }))

    async def carga_update(self, event):
        await self.send(text_data=json.dumps({
            'id': event.get('id'),
            'status': event.get('status'),
            'titulo': event.get('titulo'),
            'data': event.get('data'),
        }))

    @database_sync_to_async
    def get_user_from_token(self, token_param):
        try:
            token = Token.objects.select_related('user').get(key=token_param)
            return token.user
        except Token.DoesNotExist:
            return None

    @database_sync_to_async
    def get_carga_if_allowed(self, carga_id, user):
        try:
            carga = Carga.objects.select_related().get(id=carga_id)
        except Carga.DoesNotExist:
            print(f"❌ Conexão rejeitada: carga {carga_id} não existe")
            return None

        if getattr(user, 'is_superuser', False):
            return carga

        cliente_user = getattr(user, 'cliente', None)
        motorista_user = getattr(user, 'motorista', None)

        if cliente_user and carga.cliente == cliente_user:
            return carga

        if motorista_user and carga.motorista == motorista_user:
            return carga

        return None