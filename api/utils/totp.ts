import { authenticator } from 'otplib';

// Configurar otplib para usar SHA1, 6 dígitos, 30 segundos (padrão TOTP)
authenticator.options = {
  step: 30,
  digits: 6,
  window: 1,
};

export function generateTOTP(secret: string): number {
  const token = authenticator.generate(secret);
  return parseInt(token, 10);
}

export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  try {
    // Configurar window se necessário
    if (window > 1) {
      authenticator.options = { ...authenticator.options, window };
    }
    
    const isValid = authenticator.verify({
      token,
      secret,
    });
    
    // Resetar window
    if (window > 1) {
      authenticator.options = { ...authenticator.options, window: 1 };
    }
    
    return isValid;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

export async function generateSecret(): Promise<string> {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  return bytesToBase32(array);
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const code = Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || '';
    codes.push(code);
  }
  return codes;
}

// Funções auxiliares para generateSecret (usa crypto nativo agora via otplib)
function bytesToBase32(input: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of input) {
    bits += byte.toString(2).padStart(8, '0');
  }
  const output: string[] = [];
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output.push(alphabet[parseInt(bits.slice(i, i + 5), 2)]);
  }
  if (bits.length % 5 !== 0) {
    const remaining = bits.slice(-(bits.length % 5));
    output.push(alphabet[parseInt(remaining.padEnd(5, '0'), 2)]);
  }
  return output.join('');
}

// Funções de crypto não são mais necessárias - otplib usa implementação nativa
