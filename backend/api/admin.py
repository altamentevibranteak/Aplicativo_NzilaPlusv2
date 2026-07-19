from decimal import Decimal
from django.contrib import admin
from .models import Veiculo, Motorista, Cliente, Carga, PushToken
from django.db.models import Sum


@admin.register(Veiculo)
class VeiculoAdmin(admin.ModelAdmin):
    list_display = ['modelo', 'placa', 'capacidade_kg']
    search_fields = ['modelo', 'placa']


@admin.register(Motorista)
class MotoristaAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'telefone', 'viagens_disponiveis', 'bi', 'bi_verificado', 'carta_verificado', 'saldo']
    list_filter = ['bi_verificado', 'carta_verificado']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'bi']
    readonly_fields = ['foto_bi_frente', 'foto_bi_verso', 'foto_carta_frente', 'foto_carta_verso', 'foto_livrete']

    # 2. Painel de Resumo de Saldo dos Motoristas
    def changelist_view(self, request, extra_context=None):
        # Soma o saldo atual de todos os motoristas cadastrados
        total_carteiras = Motorista.objects.aggregate(Sum('saldo'))['saldo__sum'] or 0
        
        extra_context = extra_context or {}
        # Formatação para o Kwanza (ex: 1.000,00 Kz)
        extra_context['lucro_total_nzila'] = f"{total_carteiras:,.2f} Kz".replace(",", "X").replace(".", ",").replace("X", ".")
        
        # O título da página agora mostra o montante total em posse dos motoristas
        extra_context['title'] = f"Gestão de Motoristas — Saldo Total: {extra_context['lucro_total_nzila']}"
        
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'telefone', 'bi', 'endereco']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'bi']


@admin.register(Carga)
class CargaAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'cliente', 'motorista', 'status', 'categoria', 'preco_frete', 'comissao_nzila', 'distancia_km', 'avaliacao', 'data_criacao']
    list_filter = ['status', 'categoria', 'tipo_servico']
    search_fields = ['titulo', 'origem', 'destino']
    readonly_fields = ['data_criacao', 'preco_frete']

    def comissao_nzila(self, obj):
        if obj.status == 'ENTREGUE' and obj.preco_frete:
            # Retorna formatado com Kz para ficar bonito na tabela
            valor = obj.preco_frete * Decimal('0.05')
            return f"{valor:,.2f} Kz".replace(",", "X").replace(".", ",").replace("X", ".")
        return "0,00 Kz"
    comissao_nzila.short_description = "Lucro Nzila (5%)"

    def changelist_view(self, request, extra_context=None):
        # 1. Calculamos o total de fretes entregues
        total_frete = Carga.objects.filter(status='ENTREGUE').aggregate(Sum('preco_frete'))['preco_frete__sum'] or 0
        lucro_total = total_frete * Decimal('0.05')
        
        # 2. Passamos para o template
        extra_context = extra_context or {}
        extra_context['lucro_total_nzila'] = f"{lucro_total:,.2f} Kz".replace(",", "X").replace(".", ",").replace("X", ".")
        
        return super().changelist_view(request, extra_context=extra_context)

@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'token', 'atualizado_em']
    