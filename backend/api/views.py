from urllib import request
from django.shortcuts import render
from django.db.models import Avg, F
from rest_framework import viewsets, generics, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Carga, Motorista
from .serializers import CargaSerializer, MotoristaSerializer, RegisterSerializer
from django.contrib.auth.models import User
from math import radians, sin, cos, sqrt, atan2

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

from rest_framework.parsers import MultiPartParser, FormParser
from drf_spectacular.utils import extend_schema, extend_schema_view
from decimal import Decimal
from django.db import transaction
from django.shortcuts import render
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser


def calcular_distancia_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


class EmptySerializer(serializers.Serializer):
    pass


@extend_schema_view(
    create=extend_schema(summary="Criar carga com imagem"),
    update=extend_schema(summary="Atualizar carga com imagem"),
)
class CargaViewSet(viewsets.ModelViewSet):
    queryset = Carga.objects.select_related(
        'cliente__user', 'motorista__user'
            ).all()
    serializer_class = CargaSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        queryset = Carga.objects.select_related(
            'cliente__user', 'motorista__user'
                ).all().order_by('-data_criacao')
        
        if hasattr(user, 'cliente'):
            queryset = queryset.filter(cliente=user.cliente)
        
        elif hasattr(user, 'motorista'):
            if self.action in ['aceitar', 'disponiveis', 'recusar']:
                # Cargas disponíveis para aceitar: só PENDENTE sem motorista
                queryset = queryset.filter(status='PENDENTE', motorista__isnull=True)
            else:
                # Todas as cargas do motorista exceto PENDENTE (que não são dele)
                queryset = queryset.filter(
                    motorista=user.motorista
                ).exclude(status='PENDENTE')
        
        return queryset

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'cliente'):
            serializer.save(cliente=self.request.user.cliente, status='PENDENTE')
        else:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Apenas utilizadores do tipo Cliente podem criar cargas.")

    @action(detail=False, methods=['get'], url_path='disponiveis')
    def disponiveis(self, request):
        """
        Lista cargas PENDENTE disponíveis para o motorista, filtradas por raio GPS.
        Parâmetros: lat, lon, raio (default 15km)
        """
        if not hasattr(request.user, 'motorista') and not request.user.is_staff:
            return Response({"erro": "Apenas motoristas podem aceder."}, status=403)

        # 3 — Cargas pendentes sem motorista
        # prefetch_related para o M2M "motoristas_recusaram"
        cargas = Carga.objects.select_related(
            'cliente__user'
        ).prefetch_related(
            'motoristas_recusaram'
        ).filter(
            status='PENDENTE',
            motorista__isnull=True
        ).exclude(
            motoristas_recusaram=request.user.motorista
        )

        try:
            lat_motorista = float(request.query_params.get('lat'))
            lon_motorista = float(request.query_params.get('lon'))
            raio_km = float(request.query_params.get('raio', 15))
            tem_localizacao = True
        except (TypeError, ValueError):
            tem_localizacao = False

        if tem_localizacao:
            cargas_com_distancia = []
            for carga in cargas:
                if not carga.origem_coords:
                    continue
                try:
                    lat_carga, lon_carga = map(float, carga.origem_coords.split(','))
                except (ValueError, AttributeError):
                    continue

                dist = calcular_distancia_km(lat_motorista, lon_motorista, lat_carga, lon_carga)
                if dist <= raio_km:
                    cargas_com_distancia.append((carga, round(dist, 2)))

            cargas_com_distancia.sort(key=lambda x: x[1])

            resultado = []
            for carga, dist in cargas_com_distancia:
                dados = CargaSerializer(carga).data
                dados['distancia_ate_origem'] = dist
                resultado.append(dados)

            return Response({
                "total": len(resultado),
                "raio_km": raio_km,
                "cargas": resultado
            })

        cargas = cargas.order_by('-data_criacao')
        serializer = self.get_serializer(cargas, many=True)
        return Response(serializer.data)

    # ──────────────────────────────────────────────────────────────
    # NOVO FLUXO DE STATUS
    # PENDENTE → [aceitar] → ACEITE → [iniciar_transito] → EM_TRANSITO → [finalizar_entrega] → ENTREGUE
    # ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='aceitar', url_name='aceitar', serializer_class=EmptySerializer)
    def aceitar(self, request, pk=None):
        """
        Motorista aceita a carga.
        PENDENTE → ACEITE
        Valida créditos, mas o desconto só ocorre na finalização.
        """
        carga = self.get_object()

        if not hasattr(request.user, 'motorista'):
            return Response({"erro": "Apenas motoristas podem aceitar cargas."}, status=403)

        motorista_logado = request.user.motorista

        # 1. Verificação de documentos
        docs_em_falta = []
        if not motorista_logado.bi_verificado: docs_em_falta.append("BI")
        if not motorista_logado.carta_verificado: docs_em_falta.append("Carta de Condução")
        if not motorista_logado.livrete_verificado: docs_em_falta.append("Livrete")

        if docs_em_falta:
            return Response({
                "erro": "Os teus documentos ainda não foram verificados.",
                "documentos_pendentes": docs_em_falta
            }, status=403)

        # 2. Bloqueia se já tem viagem em curso
        viagem_activa = Carga.objects.filter(
            motorista=motorista_logado,
            status__in=['ACEITE', 'EM_TRANSITO']
        ).exists()

        if viagem_activa:
            return Response({"erro": "Já tens uma viagem em curso. Finaliza-a primeiro."}, status=400)

        # 3. Verifica disponibilidade da carga
        if carga.motorista is not None or carga.status != 'PENDENTE':
            return Response({"erro": "Esta carga já não está disponível."}, status=400)

        # ==============================================================
        # ✅ VALIDAÇÃO DE SALDO (SEM DESCONTAR AINDA)
        # ==============================================================
        comissao_necessaria = carga.preco_frete * Decimal('0.05')
        tem_viagem_no_plano = motorista_logado.viagens_disponiveis > 0
        tem_saldo_para_taxa = motorista_logado.saldo >= comissao_necessaria

        if not tem_viagem_no_plano and not tem_saldo_para_taxa:
            return Response({
                "erro": f"Saldo insuficiente! Precisas de pelo menos {comissao_necessaria} Kz para a taxa de 5%.",
                "saldo_atual": motorista_logado.saldo,
                "viagens_disponiveis": motorista_logado.viagens_disponiveis,
            }, status=402)

        try:
            with transaction.atomic():
                # APENAS ATUALIZA A CARGA (O motorista mantém os seus créditos por enquanto)
                carga.status = 'ACEITE'
                carga.motorista = motorista_logado
                carga.save()

            # Notificações
            notificar_atualizacao_carga(carga)
            enviar_notificacao(
                carga.cliente.user,
                '🚛 Carga aceite!',
                f'A tua carga "{carga.titulo}" foi aceite por um motorista.'
            )

            serializer = CargaSerializer(carga)
            return Response({
                "mensagem": "Carga aceite! O crédito será descontado após a entrega.",
                "carga": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"erro": f"Erro ao processar: {str(e)}"}, status=400)
    
    @action(detail=True, methods=['post'], url_path='iniciar-transito', url_name='iniciar_transito', serializer_class=EmptySerializer)
    def iniciar_transito(self, request, pk=None):
        """
        Confirma a recolha da carga — motorista ou cliente confirma que a carga foi recolhida.
        ACEITE → EM_TRANSITO
        Endpoint: POST /api/cargas/{id}/iniciar-transito/
        """
        carga = self.get_object()

        # Pode ser confirmado pelo motorista atribuído ou pelo cliente dono da carga
        is_motorista_atribuido = (
            hasattr(request.user, 'motorista') and
            carga.motorista == request.user.motorista
        )
        is_cliente_dono = (
            hasattr(request.user, 'cliente') and
            carga.cliente == request.user.cliente
        )

        if not is_motorista_atribuido and not is_cliente_dono:
            return Response({
                "erro": "Apenas o motorista atribuído ou o cliente dono da carga podem confirmar a recolha."
            }, status=403)

        if carga.status != 'ACEITE':
            return Response({
                "erro": f"Não é possível iniciar o trânsito. Status atual: {carga.status}",
                "status_esperado": "ACEITE"
            }, status=400)

        try:
            carga.status = 'EM_TRANSITO'
            carga.save()
            notificar_atualizacao_carga(carga)

            # Notifica o cliente que o motorista já recolheu e está a caminho
            enviar_notificacao(
                carga.cliente.user,
                '🚚 Carga em trânsito!',
                f'A tua carga "{carga.titulo}" foi recolhida e está a caminho do destino.'
            )
            # Notifica o motorista (caso seja o cliente a confirmar)
            if is_cliente_dono and carga.motorista:
                enviar_notificacao(
                    carga.motorista.user,
                    '✅ Recolha confirmada!',
                    f'O cliente confirmou a recolha de "{carga.titulo}". Boa viagem!'
                )

            serializer = CargaSerializer(carga)
            return Response({
                "mensagem": "Recolha confirmada! Carga em trânsito.",
                "carga": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"erro": f"Erro ao atualizar: {str(e)}"}, status=400)

    @action(detail=False, methods=['get'], url_path='ativa', url_name='ativa')
    def viagem_ativa(self, request):
        """
        Devolve a viagem ativa do motorista (status ACEITE ou EM_TRANSITO).
        Endpoint: GET /api/cargas/ativa/
        Usado no frontend para mostrar o card de viagem em curso.
        """
        if not hasattr(request.user, 'motorista'):
            return Response({"erro": "Apenas motoristas podem aceder."}, status=403)

        # 5 — Carga activa do motorista autenticado
        carga = Carga.objects.select_related(
            'cliente__user', 'motorista__user'
        ).filter(
            motorista=request.user.motorista,
            status__in=['ACEITE', 'EM_TRANSITO']
        ).first()

        if not carga:
            return Response({"viagem": None}, status=200)

        serializer = CargaSerializer(carga)
        return Response(serializer.data)

    # ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='cancelar', url_name='cancelar', serializer_class=EmptySerializer)
    def cancelar(self, request, pk=None):
        """
        Cliente cancela a sua própria carga.
        Só é possível cancelar cargas com status PENDENTE ou ACEITE.
        Endpoint: POST /api/cargas/{id}/cancelar/
        """
        if not hasattr(request.user, 'cliente'):
            return Response({"erro": "Apenas clientes podem cancelar cargas."}, status=403)

        carga = self.get_object()

        if carga.cliente != request.user.cliente:
            return Response({"erro": "Não podes cancelar uma carga que não é tua."}, status=403)

        # ✅ ACTUALIZADO: permite cancelar também no status ACEITE
        if carga.status not in ['PENDENTE', 'ACEITE']:
            return Response({
                "erro": f"Só é possível cancelar cargas PENDENTES ou ACEITES. Status actual: {carga.status}"
            }, status=400)

        # Se tinha motorista (estava ACEITE), notifica-o
        if carga.motorista:
            enviar_notificacao(
                carga.motorista.user,
                '❌ Carga cancelada',
                f'O cliente cancelou a carga "{carga.titulo}".'
            )

        carga.status = 'CANCELADO'
        carga.save()

        return Response({
            "mensagem": "Carga cancelada com sucesso.",
            "carga_id": carga.id
        }, status=200)

    @action(detail=True, methods=['post'], url_path='recusar', url_name='recusar', serializer_class=EmptySerializer)
    def recusar(self, request, pk=None):
        if not hasattr(request.user, 'motorista'):
            return Response({"erro": "Apenas motoristas podem recusar cargas."}, status=403)

        try:
            carga = self.get_object()
        except:
            return Response({"erro": "Carga não encontrada."}, status=404)

        if carga.status != 'PENDENTE':
            return Response({"erro": f"Esta carga não pode ser recusada. Status: {carga.status}"}, status=400)

        carga.motoristas_recusaram.add(request.user.motorista)
        carga.save()

        return Response({
            "mensagem": "Carga recusada com sucesso!",
            "carga_id": carga.id
        }, status=200)

    @action(detail=True, methods=['post'], url_path='finalizar-entrega', url_name='finalizar_entrega', serializer_class=EmptySerializer)
    def finalizar_entrega(self, request, pk=None):
        """
        Motorista marca a carga como entregue.
        EM_TRANSITO → ENTREGUE
        """
        from django.utils import timezone
        from decimal import Decimal
        
        try:
            if not hasattr(request.user, 'motorista'):
                return Response({"erro": "Apenas motoristas podem finalizar entregas."}, status=403)

            motorista_logado = request.user.motorista
            carga = self.get_object()

            if carga.motorista != motorista_logado:
                return Response({"erro": "Apenas o motorista atribuído pode finalizar esta carga."}, status=403)

            if carga.status != 'EM_TRANSITO':
                return Response({
                    "erro": f"Status inválido: {carga.status}. Tens de confirmar a recolha primeiro.",
                    "status_atual": carga.status
                }, status=400)

            with transaction.atomic():
                # 1. Finaliza a Carga
                carga.status = 'ENTREGUE'
                carga.data_entrega = timezone.now()
                carga.save()

                # 2. Definição de valores para evitar o erro "not defined"
                valor_frete = carga.preco_frete or Decimal('0')
                ganho_liquido = valor_frete * Decimal('0.95')
                taxa_nzila = valor_frete * Decimal('0.05')

                # 3. Lógica de Desconto vs Plano
                if motorista_logado.viagens_disponiveis > 0:
                    motorista_logado.viagens_disponiveis -= 1
                else:
                    # Se não tem plano, desconta os 5% do saldo
                    motorista_logado.saldo -= taxa_nzila
                
                # 4. Adiciona o ganho (95%) ao saldo para o motorista ver no App
                motorista_logado.saldo += ganho_liquido
                motorista_logado.save()

            # --- ENVIO DE NOTIFICAÇÕES (Isolado para não travar o 200 OK) ---
            try:
                notificar_atualizacao_carga(carga)
                enviar_notificacao(
                    carga.cliente.user,
                    '✅ Carga entregue!',
                    f'A tua carga "{carga.titulo}" foi entregue com sucesso!'
                )
            except Exception as notify_err:
                print(f"Aviso: Notificação não enviada ({str(notify_err)})")

            serializer = CargaSerializer(carga)
            return Response({
                "mensagem": "Carga entregue com sucesso!",
                "ganho_desta_viagem": str(ganho_liquido),
                "novo_saldo_total": str(motorista_logado.saldo),
                "viagens_restantes": motorista_logado.viagens_disponiveis,
                "carga": serializer.data
            }, status=200)

        except Exception as e:
            return Response({"erro": f"Erro ao finalizar entrega: {str(e)}"}, status=400)

    @action(detail=True, methods=['post'], url_path='avaliar', url_name='avaliar', parser_classes=[JSONParser, MultiPartParser, FormParser])
    def avaliar(self, request, pk=None):
        if not hasattr(request.user, 'cliente'):
            return Response({"erro": "Apenas clientes podem avaliar."}, status=403)

        carga = self.get_object()

        if carga.cliente != request.user.cliente:
            return Response({"erro": "Não podes avaliar uma carga que não é tua."}, status=403)

        if carga.status != 'ENTREGUE':
            return Response({"erro": "Só podes avaliar após a entrega."}, status=400)

        if carga.avaliacao is not None:
            return Response({"erro": "Esta entrega já foi avaliada."}, status=400)

        # Pegamos a nota e o comentário do body da requisição
        nota = request.data.get('avaliacao')
        comentario = request.data.get('comentario', '') # Opcional

        if nota is None or not str(nota).isdigit() or not (1 <= int(nota) <= 5):
            return Response({"erro": "A avaliação deve ser um número entre 1 e 5."}, status=400)

        carga.avaliacao = int(nota)
        
        # Só salva o comentário se o campo existir no teu banco de dados
        if hasattr(carga, 'comentario_avaliacao'):
            carga.comentario_avaliacao = comentario
            
        carga.save()

        return Response({
            "mensagem": "Avaliação registada com sucesso!",
            "avaliacao": carga.avaliacao
        }, status=200)


from django.db.models import F # Adiciona esta importação no topo se não estiver lá

class MotoristaViewSet(viewsets.ModelViewSet):
    queryset = Motorista.objects.all()
    serializer_class = MotoristaSerializer

    @action(detail=False, methods=['post'], url_path='recarregar')
    def recarregar(self, request):
        """
        Endpoint para o motorista adquirir pacotes de viagens.
        POST /api/motorista/recarregar/ { "plano": "FACIL" }
        """
        try:
            # 1. Pegamos a instância diretamente do banco para evitar cache de sessão
            motorista = Motorista.objects.get(user=request.user)
            plano_slug = request.data.get('plano')

            config_planos = {
                'FACIL': {'unidades': 10, 'preco': 15000},
                'PLUS': {'unidades': 30, 'preco': 50000},
                'PREMIUM': {'unidades': 999, 'preco': 100000},
            }

            if plano_slug not in config_planos:
                return Response({"erro": "Plano inválido."}, status=status.HTTP_400_BAD_REQUEST)

            dados_plano = config_planos[plano_slug]
            
            # 2. Usamos F() para incrementar diretamente na base de dados (mais seguro)
            # Isso evita que o Django use um valor antigo que estava na memória
            Motorista.objects.filter(pk=motorista.pk).update(
                viagens_disponiveis=F('viagens_disponiveis') + dados_plano['unidades']
            )
            
            # 3. CRÍTICO: Recarregamos o objeto para que o Serializer pegue o valor NOVO
            motorista.refresh_from_db()

            # 4. Serializamos os dados JÁ ATUALIZADOS
            serializer = self.get_serializer(motorista)

            return Response({
                "mensagem": f"Recarga de {plano_slug} concluída!",
                "motorista_atualizado": serializer.data, # Dados fresquinhos aqui
                "novas_viagens": motorista.viagens_disponiveis,
                "saldo_atual": motorista.saldo
            }, status=status.HTTP_200_OK)

        except Motorista.DoesNotExist:
            return Response({"erro": "Motorista não encontrado."}, status=404)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='meu-perfil')
    def meu_perfil(self, request):
        """
        Retorna os dados do motorista logado.
        Forçamos o refresh aqui também para garantir sincronia total.
        """
        motorista = request.user.motorista
        motorista.refresh_from_db() # Garante que a Home/Carteira sempre veja a verdade
        serializer = self.get_serializer(motorista)
        return Response(serializer.data)

class CarteiraMotoristaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'motorista'):
            return Response({"erro": "Utilizador não é motorista."}, status=403)

        motorista = request.user.motorista
        motorista.refresh_from_db()

        entregas_pagas = motorista.entregas.filter(
            status='ENTREGUE'
        ).values('id', 'titulo', 'preco_frete', 'data_entrega', 'avaliacao').order_by('-data_entrega')

        return Response({
            "saldo": motorista.saldo,
            "total_entregas": motorista.entregas.filter(status='ENTREGUE').count(),
            "historico": list(entregas_pagas)
        })


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Usuário criado com sucesso!",
                "username": user.username,
                "email": user.email
            }, status=status.HTTP_201_CREATED)
    
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username') or request.data.get('email') or request.data.get('user')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Username/e-mail e password são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request=request, username=username, password=password)
        if user is None:
            return Response(
                {'detail': 'Credenciais inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, created = Token.objects.get_or_create(user=user)

        user_type = "desconhecido"
        if hasattr(user, 'motorista'):
            user_type = "motorista"
        elif hasattr(user, 'cliente'):
            user_type = "cliente"
        elif user.is_superuser:
            user_type = "admin"

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'user_type': user_type
        })


class PerfilClienteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, 'cliente'):
            return Response({"erro": "Utilizador não é cliente."}, status=403)
        
        cliente = user.cliente
        return Response({
            "id": cliente.id,
            "username": user.username,
            "email": user.email,
            "nome_completo": user.get_full_name(),
            "telefone": cliente.telefone,
            "bi": cliente.bi,
            "endereco": cliente.endereco,
            "foto_perfil": request.build_absolute_uri(cliente.foto_perfil.url) if cliente.foto_perfil else None,
            "total_cargas": cliente.minhas_cargas.count(),
            "cargas_pendentes": cliente.minhas_cargas.filter(status='PENDENTE').count(),
            # ✅ ACTUALIZADO: inclui ACEITE e EM_TRANSITO como "em curso"
            "cargas_aceites": cliente.minhas_cargas.filter(status='ACEITE').count(),
            "cargas_em_transito": cliente.minhas_cargas.filter(status='EM_TRANSITO').count(),
            "cargas_entregues": cliente.minhas_cargas.filter(status='ENTREGUE').count(),
        })


class PerfilMotoristaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, 'motorista'):
            return Response({"erro": "Utilizador não é motorista."}, status=403)
        
        serializer = MotoristaSerializer(user.motorista, context={'request': request})
        return Response(serializer.data)


from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def notificar_atualizacao_carga(carga):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'cargas',
        {
            'type': 'carga_update',
            'data': {
                'id': carga.id,
                'status': carga.status,
                'titulo': carga.titulo,
            }
        }
    )


from .models import PushToken


class RegistarPushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('push_token')
        if not token:
            return Response({'erro': 'Token não fornecido.'}, status=400)
        
        PushToken.objects.update_or_create(
            user=request.user,
            defaults={'token': token}
        )
        return Response({'mensagem': 'Token registado com sucesso!'})


import httpx


def enviar_notificacao(user, titulo, mensagem):
    try:
        push_token = user.push_token.token
        httpx.post('https://exp.host/--/api/v2/push/send', json={
            'to': push_token,
            'title': titulo,
            'body': mensagem,
            'sound': 'default',
        })
    except Exception as e:
        print(f'Erro ao enviar notificação: {e}')


class EditarPerfilMotoristaView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def patch(self, request):
        user = request.user
        if not hasattr(user, 'motorista'):
            return Response({"erro": "Não é motorista."}, status=403)

        motorista = user.motorista

        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'email' in request.data:
            user.email = request.data['email']
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])
            user.save()
            Token.objects.filter(user=user).delete()
            novo_token = Token.objects.create(user=user)
            token_actualizado = novo_token.key
        else:
            user.save()
            token_actualizado = None

        if 'telefone' in request.data:
            motorista.telefone = request.data['telefone']
        if 'bi' in request.data:
            motorista.bi = request.data['bi']
        if 'carta_conducao' in request.data:
            motorista.carta_conducao = request.data['carta_conducao']

        if 'foto_bi_frente' in request.FILES:
            motorista.foto_bi_frente = request.FILES['foto_bi_frente']
            motorista.bi_verificado = False
        if 'foto_bi_verso' in request.FILES:
            motorista.foto_bi_verso = request.FILES['foto_bi_verso']
            motorista.bi_verificado = False
        if 'foto_carta_frente' in request.FILES:
            motorista.foto_carta_frente = request.FILES['foto_carta_frente']
            motorista.carta_verificado = False
        if 'foto_carta_verso' in request.FILES:
            motorista.foto_carta_verso = request.FILES['foto_carta_verso']
            motorista.carta_verificado = False
        if 'foto_livrete' in request.FILES:
            motorista.foto_livrete = request.FILES['foto_livrete']
            motorista.livrete_verificado = False
        if 'foto_perfil' in request.FILES:
            motorista.foto_perfil = request.FILES['foto_perfil']

        motorista.save()

        from .models import Veiculo
        veiculo = motorista.veiculo
        veiculo_data = {
            'modelo': request.data.get('veiculo_modelo'),
            'placa': request.data.get('veiculo_placa'),
            'capacidade_kg': request.data.get('veiculo_capacidade'),
            'cor': request.data.get('veiculo_cor'),
        }
        if not veiculo and veiculo_data['modelo'] and veiculo_data['placa']:
            veiculo = Veiculo.objects.create(
                modelo=veiculo_data['modelo'],
                placa=veiculo_data['placa'],
                capacidade_kg=veiculo_data['capacidade_kg'] or 0,
                cor=veiculo_data['cor'] or ''
            )
            motorista.veiculo = veiculo
            motorista.save()
        if veiculo:
            if veiculo_data['modelo']:
                veiculo.modelo = veiculo_data['modelo']
            if veiculo_data['placa']:
                veiculo.placa = veiculo_data['placa']
            if veiculo_data['capacidade_kg']:
                veiculo.capacidade_kg = veiculo_data['capacidade_kg']
            if veiculo_data['cor']:
                veiculo.cor = veiculo_data['cor']
            if 'foto_placa' in request.FILES:
                veiculo.foto_placa = request.FILES['foto_placa']
            if 'foto_veiculo' in request.FILES:
                veiculo.foto_veiculo = request.FILES['foto_veiculo']
            veiculo.save()

        return Response({
            "mensagem": "Perfil actualizado com sucesso!",
            "bi_verificado": motorista.bi_verificado,
            "carta_verificado": motorista.carta_verificado,
            "livrete_verificado": motorista.livrete_verificado,
            "novo_token": token_actualizado,
        })


class EditarPerfilClienteView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def patch(self, request):
        user = request.user
        if not hasattr(user, 'cliente'):
            return Response({"erro": "Não é cliente."}, status=403)

        cliente = user.cliente

        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'email' in request.data:
            user.email = request.data['email']
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])
            user.save()
            Token.objects.filter(user=user).delete()
            novo_token = Token.objects.create(user=user)
            token_actualizado = novo_token.key
        else:
            user.save()
            token_actualizado = None

        if 'telefone' in request.data:
            cliente.telefone = request.data['telefone']
        if 'endereco' in request.data:
            cliente.endereco = request.data['endereco']
        if 'bi' in request.data:
            cliente.bi = request.data['bi']
        if 'foto_perfil' in request.FILES:
            cliente.foto_perfil = request.FILES['foto_perfil']
        cliente.save()

        return Response({
            "mensagem": "Perfil actualizado com sucesso!",
            "novo_token": token_actualizado,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            Token.objects.filter(user=request.user).delete()
            return Response({"mensagem": "Logout efectuado com sucesso."})
        except Exception as e:
            return Response({"erro": str(e)}, status=400)


def termos_privacidade(request):
    return render(request, 'legal/termos_privacidade.html')