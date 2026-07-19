from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WebSocket genérico para todas as cargas
    re_path(r'ws/cargas/$', consumers.CargaConsumer.as_asgi()),
    
    # WebSocket específico por carga com validação
    re_path(r'ws/cargas/(?P<id>\d+)/$', consumers.CargaDetailConsumer.as_asgi()),
]