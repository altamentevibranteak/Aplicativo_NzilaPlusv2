from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Carga, Motorista, Veiculo, Cliente
from django.utils import timezone


class CargaSerializer(serializers.ModelSerializer):
    foto_carga = serializers.ImageField(required=False)

    cliente_telefone = serializers.SerializerMethodField()
    cliente_nome = serializers.SerializerMethodField()
    motorista_telefone = serializers.SerializerMethodField()
    motorista_nome = serializers.SerializerMethodField()

    motorista_media = serializers.ReadOnlyField(source='motorista.get_media_avaliacao')
    motorista_nome = serializers.ReadOnlyField(source='motorista.user.first_name')

    class Meta:
        model = Carga
        fields = [
            'id', 'titulo', 'descricao', 'foto_carga',
            'origem', 'destino', 'origem_coords', 'destino_coords',
            'distancia_km', 'preco_frete', 'status', 'tipo_servico',
            'data_agendamento', 'data_entrega','acompanhada', 'categoria', 'cliente',
            'motorista', 'data_criacao', 'avaliacao',
            'cliente_telefone', 'cliente_nome',
            'motorista_telefone', 'motorista_nome', 'motorista_media',
        ]
        read_only_fields = ['cliente', 'status', 'data_criacao', 'avaliacao']

    def get_cliente_telefone(self, obj):
        # Acesso directo — select_related('cliente') na view evita N+1
        cliente = getattr(obj, 'cliente', None)
        return getattr(cliente, 'telefone', None)

    def get_cliente_nome(self, obj):
        cliente = getattr(obj, 'cliente', None)
        if not cliente:
            return None
        user = getattr(cliente, 'user', None)
        if not user:
            return None
        return user.get_full_name() or user.username

    def get_motorista_telefone(self, obj):
        motorista = getattr(obj, 'motorista', None)
        return getattr(motorista, 'telefone', None)

    def get_motorista_nome(self, obj):
        motorista = getattr(obj, 'motorista', None)
        if not motorista:
            return None
        user = getattr(motorista, 'user', None)
        if not user:
            return None
        return user.get_full_name() or user.username


class VeiculoSerializer(serializers.ModelSerializer):
    """Serializer dedicado ao veículo — reutilizável noutros contextos."""

    class Meta:
        model = Veiculo
        fields = ['id', 'modelo', 'placa', 'cor', 'capacidade_kg']


class MotoristaSerializer(serializers.ModelSerializer):
    # Campos do utilizador (read_only — alterados via update())
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    media_avaliacao = serializers.SerializerMethodField()
    nome_completo = serializers.SerializerMethodField()

    # Estatísticas de entregas
    total_entregas = serializers.SerializerMethodField()
    entregas_em_transito = serializers.SerializerMethodField()
    entregas_aceites = serializers.SerializerMethodField()
    entregas_concluidas = serializers.SerializerMethodField()
    viagens_realizadas_hoje = serializers.SerializerMethodField()

    # Campos de escrita para veículo (evita sub-objecto aninhado no PATCH)
    veiculo_modelo = serializers.CharField(write_only=True, required=False, allow_blank=True)
    veiculo_placa = serializers.CharField(write_only=True, required=False, allow_blank=True)
    veiculo_cor = serializers.CharField(write_only=True, required=False, allow_blank=True)
    veiculo_capacidade_kg = serializers.CharField(write_only=True, required=False, allow_blank=True)

    saldo = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False, read_only=True)

    class Meta:
        model = Motorista
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nome_completo', 'telefone', 'bi', 'documentos_enviados', 'media_avaliacao', 'endereco',
            'carta_conducao', 'foto_bi_frente', 'foto_bi_verso',
            'foto_carta_frente', 'foto_carta_verso', 'foto_livrete',
            'foto_perfil', 'veiculo',
            'total_entregas', 'entregas_em_transito', 'entregas_aceites',
            'entregas_concluidas',
            'saldo', 'viagens_disponiveis', 'primeira_viagem_gratis',
            'viagens_realizadas_hoje',
            'veiculo_modelo', 'veiculo_placa', 'veiculo_cor', 'veiculo_capacidade_kg',
        ]
        read_only_fields = ['saldo', 'viagens_disponiveis', 'primeira_viagem_gratis']
        depth = 1

    # ------------------------------------------------------------------ #
    # Métodos auxiliares                                                   #
    # ------------------------------------------------------------------ #

    def get_nome_completo(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def _entregas_qs(self, obj):
        """QuerySet base para as entregas deste motorista."""
        return Carga.objects.filter(motorista=obj)

    def get_total_entregas(self, obj):
        return self._entregas_qs(obj).count()

    def get_entregas_em_transito(self, obj):
        return self._entregas_qs(obj).filter(status='EM_TRANSITO').count()

    def get_entregas_aceites(self, obj):
        return self._entregas_qs(obj).filter(status='ACEITE').count()

    def get_entregas_concluidas(self, obj):
        return self._entregas_qs(obj).filter(status='ENTREGUE').count()

    def get_viagens_realizadas_hoje(self, obj):
        hoje = timezone.now().date()
        return self._entregas_qs(obj).filter(
            status='ENTREGUE',
            data_entrega__date=hoje,
        ).count()
    
    # Esta função define o que vai aparecer no campo 'media_avaliacao'
    def get_media_avaliacao(self, obj):
        # Chamamos a função que criaste no Model
        return obj.get_media_avaliacao()

    # ------------------------------------------------------------------ #
    # Update                                                               #
    # ------------------------------------------------------------------ #

    def update(self, instance, validated_data):
        # Dados do utilizador
        user_data = validated_data.pop('user', {})
        if user_data:
            user = instance.user
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.save(update_fields=['first_name', 'last_name'])

        # Campos simples do motorista
        for field in ('telefone', 'bi', 'endereco'):
            value = validated_data.pop(field, None)
            if value is not None:
                setattr(instance, field, value)

        # Dados do veículo (apenas actualiza se algum campo for fornecido)
        veiculo_fields = {
            'modelo': validated_data.pop('veiculo_modelo', None),
            'placa': validated_data.pop('veiculo_placa', None),
            'cor': validated_data.pop('veiculo_cor', None),
            'capacidade_kg': validated_data.pop('veiculo_capacidade_kg', None),
        }
        veiculo_updates = {k: v for k, v in veiculo_fields.items() if v is not None}

        if veiculo_updates:
            if instance.veiculo_id:
                # Actualiza o veículo existente
                Veiculo.objects.filter(pk=instance.veiculo_id).update(**veiculo_updates)
            else:
                # Cria um novo veículo e associa
                veiculo = Veiculo.objects.create(**veiculo_updates)
                instance.veiculo = veiculo

        instance.save()
        return instance


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    tipo_usuario = serializers.ChoiceField(choices=[('cliente', 'Cliente'), ('motorista', 'Motorista')])
    bi = serializers.CharField(max_length=50)
    telefone = serializers.CharField(max_length=20)
    morada = serializers.CharField(required=False, allow_blank=True)
    carta_conducao = serializers.CharField(required=False, allow_blank=True)

    # ------------------------------------------------------------------ #
    # Validações individuais                                               #
    # ------------------------------------------------------------------ #

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nome de utilizador já está registado.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está registado.")
        return value

    def validate_bi(self, value):
        """Impede BI duplicado em clientes e motoristas."""
        bi_em_cliente = Cliente.objects.filter(bi=value).exists()
        bi_em_motorista = Motorista.objects.filter(bi=value).exists()
        if bi_em_cliente or bi_em_motorista:
            raise serializers.ValidationError("Este BI já está registado.")
        return value

    def validate(self, attrs):
        """Validação cruzada: motorista precisa de carta de condução."""
        if attrs.get('tipo_usuario') == 'motorista' and not attrs.get('carta_conducao'):
            raise serializers.ValidationError(
                {"carta_conducao": "A carta de condução é obrigatória para motoristas."}
            )
        return attrs

    # ------------------------------------------------------------------ #
    # Criação                                                              #
    # ------------------------------------------------------------------ #

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

        common = dict(
            user=user,
            bi=validated_data['bi'],
            telefone=validated_data['telefone'],
            endereco=validated_data.get('morada', ''),
        )

        if validated_data['tipo_usuario'] == 'cliente':
            Cliente.objects.create(**common)
        else:
            Motorista.objects.create(
                **common,
                carta_conducao=validated_data.get('carta_conducao', ''),
            )

        return user