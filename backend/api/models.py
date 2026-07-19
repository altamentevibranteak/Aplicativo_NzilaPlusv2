from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from django.db.models import Avg

STATUS_CHOICES = [
    ('PENDENTE', 'Pendente'),
    ('ACEITE', 'Aceite'),          # Motorista aceitou, ainda não recolheu
    ('EM_TRANSITO', 'Em Trânsito'), # Recolha confirmada, a caminho do destino
    ('ENTREGUE', 'Entregue'),
    ('CANCELADO', 'Cancelado'),
]

TIPO_SERVICO_CHOICES = [
    ('IMEDIATO', 'Serviço Imediato'),
    ('AGENDADO', 'Serviço Agendado'),
]

class Veiculo(models.Model):
    modelo = models.CharField(max_length=100)
    placa = models.CharField(max_length=20)
    capacidade_kg = models.DecimalField(max_digits=10, decimal_places=2)
    cor = models.CharField(max_length=50, blank=True, verbose_name="Cor do veículo")

    foto_placa = models.ImageField(upload_to='veiculos/placas/', blank=True, null=True)
    foto_veiculo = models.ImageField(upload_to='veiculos/fotos/', blank=True, null=True)

    def __str__(self):
        return f"{self.modelo} ({self.placa}) — {self.cor}"

    
class Motorista(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    telefone = models.CharField(max_length=20)
    bi = models.CharField(max_length=20, unique=True, verbose_name="Bilhete de Identidade")
    endereco = models.CharField(max_length=255, blank=True, null=True)
    carta_conducao = models.CharField(max_length=50, unique=True)
    veiculo = models.ForeignKey(Veiculo, on_delete=models.SET_NULL, null=True, blank=True)

    foto_bi_frente = models.ImageField(upload_to='documentos/bi/frente/', blank=True, null=True)
    foto_bi_verso = models.ImageField(upload_to='documentos/bi/verso/', blank=True, null=True)
    foto_carta_frente = models.ImageField(upload_to='documentos/carta/frente/', blank=True, null=True)
    foto_carta_verso = models.ImageField(upload_to='documentos/carta/verso/', blank=True, null=True)
    foto_livrete = models.ImageField(upload_to='documentos/livretes/', blank=True, null=True)
    bi_verificado = models.BooleanField(default=False)
    carta_verificado = models.BooleanField(default=False)
    livrete_verificado = models.BooleanField(default=False)
    
    documentos_enviados = models.BooleanField(default=False)
    foto_perfil = models.ImageField(upload_to='perfis/motoristas/', blank=True, null=True)

    # Carteira digital — saldo acumulado de entregas (95% do frete)
    saldo = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Saldo da carteira (Kz)")

    viagens_disponiveis = models.IntegerField(default=0, verbose_name="Viagens Disponíveis")
    primeira_viagem_gratis = models.BooleanField(default=True)

    # 🛠️ ADICIONA ISTO AQUI:
    def __str__(self):
        # Retorna o nome completo ou o username do utilizador associado
        return f"{self.user.get_full_name() or self.user.username} - ID: {self.id}"

    def get_media_avaliacao(self):
        # Calcula a média de todas as cargas finalizadas deste motorista
        media = self.entregas.filter(status='ENTREGUE', avaliacao__isnull=False).aggregate(Avg('avaliacao'))['avaliacao__avg']
        return round(media, 1) if media else 0    

    def processar_aceitacao_viagem(self, valor_frete):
        """
        Regras de negócio para aceitação de viagem:
        1. Primeira viagem grátis
        2. Pacote Premium (999 = ilimitado)
        3. Pacote Normal (desconta 1 unidade + verifica saldo para comissão de 5%)
        4. Sem créditos — bloqueia
        """
        valor_frete = Decimal(str(valor_frete))
        comissao = valor_frete * Decimal('0.05')

        # 1. Primeira viagem grátis
        if self.primeira_viagem_gratis:
            self.primeira_viagem_gratis = False
            self.save()
            return True

        # 2. Pacote Premium (ilimitado)
        if self.viagens_disponiveis >= 999:
            return True

        # 3. Pacote Normal
        if self.viagens_disponiveis > 0:
            if self.saldo < comissao:
                return False  # Bloqueia — saldo insuficiente para a comissão
            self.viagens_disponiveis -= 1
            self.saldo -= comissao
            self.save()
            return True

        # 4. Sem créditos
        return False

    def adicionar_saldo_pacote(self, tipo_pacote):
        pacotes = {
            'FACIL': 10,
            'PLUS': 30,
            'PREMIUM': 999,
        }
        self.viagens_disponiveis += pacotes.get(tipo_pacote, 0)
        self.save()

class Cliente(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    telefone = models.CharField(max_length=20)
    endereco = models.CharField(max_length=255, blank=True)
    bi = models.CharField(max_length=20, unique=True, verbose_name="Bilhete de Identidade")
    
    foto_perfil = models.ImageField(upload_to='perfis/clientes/', blank=True, null=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Carga(models.Model):
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    foto_carga = models.ImageField(upload_to='cargas/%Y/%m/%d', null=True, blank=True)
    origem = models.CharField(max_length=255)
    destino = models.CharField(max_length=255)
    origem_coords = models.CharField(max_length=255, blank=True, verbose_name="Coordenadas de Origem (lat,long)")
    destino_coords = models.CharField(max_length=255, blank=True, verbose_name="Coordenadas de Destino (lat,long)")
    preco_frete = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    
    tipo_servico = models.CharField(
        max_length=20, 
        choices=TIPO_SERVICO_CHOICES, 
        default='IMEDIATO',
        verbose_name="Tipo de Serviço"
    )
    data_agendamento = models.DateTimeField(null=True, blank=True, verbose_name="Data do Agendamento")

    acompanhada = models.BooleanField(
        default=False, 
        verbose_name="Cliente vai acompanhar a carga?"
    )
    
    CATEGORIA_CHOICES = [
        ('construcao', 'Materiais de Construção'),
        ('mobilia', 'Mobiliário/Casa'),
        ('eletro', 'Eletrodomésticos'),
        ('outros', 'Geral / Outros'),
    ]
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='outros')

    distancia_km = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Distância em km (calculada pelo frontend)"
    )

    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name='minhas_cargas')
    motorista = models.ForeignKey(Motorista, on_delete=models.SET_NULL, null=True, blank=True, related_name='entregas')

    data_criacao = models.DateTimeField(auto_now_add=True)
    data_entrega = models.DateTimeField(null=True, blank=True, verbose_name="Data de Entrega")

    avaliacao = models.PositiveSmallIntegerField(
        null=True, blank=True,
        verbose_name="Avaliação do motorista (1-5 estrelas)"
    )
    comentario_avaliacao = models.TextField(null=True, blank=True, verbose_name="Comentário do Cliente")

    motoristas_recusaram = models.ManyToManyField(
        'Motorista',
        blank=True,
        related_name='cargas_recusadas'
    )

    def calcular_preco_estimado(self):
        PRECO_BASE = Decimal('3000')
        TAXA_DISTANCIA = Decimal('600')
        distancia = self.distancia_km if self.distancia_km else Decimal('5')
        TAXA_CATEGORIA = {
            'construcao': Decimal('1.3'),
            'mobilia': Decimal('1.2'),
            'eletro': Decimal('1.1'),
            'outros': Decimal('1.0'),
        }
        taxa_cat = TAXA_CATEGORIA.get(self.categoria, Decimal('1.0'))
        preco = (PRECO_BASE + (distancia * TAXA_DISTANCIA)) * taxa_cat
        return preco

    def save(self, *args, **kwargs):
        if self.preco_frete is None:
            self.preco_frete = self.calcular_preco_estimado()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titulo} - {self.status}"


class PushToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='push_token')
    token = models.CharField(max_length=255)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.token[:20]}..."