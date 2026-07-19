/**
 * Normaliza qualquer número angolano para o formato internacional
 * usado pelo WhatsApp: 244XXXXXXXXX (12 dígitos, sem + nem espaços)
 *
 * Casos suportados:
 *  - "923456789"        → "244923456789"
 *  - "0923456789"       → "244923456789"
 *  - "244923456789"     → "244923456789"
 *  - "+244923456789"    → "244923456789"
 *  - "00244923456789"   → "244923456789"
 */
export function formatarTelefoneAngola(telefoneRaw: string): string | null {
  if (!telefoneRaw) return null;

  // 1. Remove tudo que não é dígito
  let numero = telefoneRaw.replace(/\D/g, '');

  // 2. Remove prefixos internacionais (00244 ou 244 no início)
  if (numero.startsWith('00244')) {
    numero = numero.slice(5);
  } else if (numero.startsWith('244') && numero.length === 12) {
    numero = numero.slice(3);
  }

  // 3. Remove zero inicial (ex: 0923456789 → 923456789)
  if (numero.startsWith('0')) {
    numero = numero.slice(1);
  }

  // 4. Valida: deve ter exactamente 9 dígitos
  if (numero.length !== 9) return null;

  return `244${numero}`;
}

export function urlWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}
