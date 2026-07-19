# INSTRUÇÕES DE INTEGRAÇÃO: WebSocket Frontend + Backend
# Data: 25 de março de 2026

## ✅ O que foi alterado no Backend

### 1. **api/consumers.py** (JÁ ATUALIZADO PARA VOCÊ)
Agora tem 2 consumers:
- `CargaConsumer` - genérico (grupo `cargas`)
- `CargaDetailConsumer` - específico por carga (grupo `cargas_{id}`) com autenticação

### 2. **api/routing.py** (PRECISA ATUALIZAR MANUALMENTE)

**Substitui o conteúdo atual POR:**

```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WebSocket genérico para todas as cargas
    re_path(r'ws/cargas/$', consumers.CargaConsumer.as_asgi()),
    
    # WebSocket específico por carga com validação
    re_path(r'ws/cargas/(?P<id>\d+)/$', consumers.CargaDetailConsumer.as_asgi()),
]
```

**O que muda:**
- Antes: `ws://localhost:8000/ws/cargas/` (todas as cargas)
- Agora: `ws://localhost:8000/ws/cargas/5/` (apenas carga 5)

### 3. **core/asgi.py** (JÁ ESTÁ CORRETO)
Sem mudanças necessárias.

---

## ✅ O que foi feito no Frontend

### **hooks/useWebSocket.ts**
- ✅ Aceita `url` dinâmica
- ✅ Conecta ao WebSocket real
- ✅ Tenta reconectar automaticamente
- ✅ Limpeza de memória após desconexão

### **app/(cliente)/detalhe-carga.tsx**
- ✅ Importa e usa `useWebSocket`
- ✅ Constrói URL: `ws://baseurl/ws/cargas/{id}/?token={token}`
- ✅ Atualiza status em tempo real
- ✅ Indicador visual de conexão (verde/cinzento)

---

## 🚀 COMO TESTAR

### Backend:
```bash
cd nzila-plus-backend-main
python manage.py runserver
# Ou com Daphne (melhor para WebSocket):
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

### Frontend:
```bash
cd NzilaPlus
npx expo start -c
# Abre no telemóvel
# Vai para uma carga PENDENTE
# Deverá ver indicador 🟢 Verde no Header
```

### Backend simula alteração:
```bash
# No Python manage.py shell:
python manage.py shell

# Cole isto:
from api.models import Carga
from api.views import notificar_atualizacao_carga
carga = Carga.objects.first()
carga.status = 'EM_TRANSITO'
carga.save()
notificar_atualizacao_carga(carga)
# Todos os clientes conectados receberão a atualização em tempo real!
```

---

## 📊 FLUXO COMPLETO

```
1. Cliente abre detalhe-carga.tsx
   ↓
2. Monta URL: ws://192.168.41.184:8000/ws/cargas/5/?token=abc123
   ↓
3. useWebSocket conecta (onConnect chamado)
   ↓
4. Indicador fica 🟢 Verde
   ↓
5. Backend: notificar_atualizacao_carga(carga)
   ↓
6. Mensagem enviada para grupo cargas_5
   ↓
7. Frontend recebe (onMessage chamado)
   ↓
8. setCarga({ ...carga, status: 'EM_TRANSITO' })
   ↓
9. UI re-renderiza com novo status ✅
```

---

## ⚠️ IMPORTANTE

1. **Token na URL:** O backend agora valida o token extraído da query string
2. **Autorização:** Apenas o dono da carga (cliente) ou motorista atribuído pode conectar
3. **Grupo específico:** Cada carga tem seu próprio grupo `cargas_{id}`
4. **Reconexão automática:** Se a conexão cair, tenta reconectar

---

## 📱 NO TELEMÓVEL

Quando vai à carga:
- ✅ `ws://` converte para protocolo correto automaticamente
- ✅ Suporta HTTP, HTTPS, WS, WSS
- ✅ Sem precisa de certificados no Expo Go

---

**Próximos passos:**
1. Atualiza `api/routing.py` com o código acima
2. Testa no telemóvel
3. Simula alterações de status no shell Django
4. Verifica se a UI atualiza em tempo real!

Tá pronto! 🚀
