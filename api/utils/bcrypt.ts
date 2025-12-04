/**
 * Bcrypt-like hash implementation for browser
 * Uses Web Crypto API para hashing seguro
 */

const SALT_ROUNDS = 10;

/**
 * Gera um salt aleatório
 */
async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash uma senha usando PBKDF2
 */
async function pbkdf2Hash(password: string, salt: string, iterations: number): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash uma senha
 * @param password - Senha em texto plano
 * @returns Hash da senha no formato: $2a$rounds$salt$hash
 */
export async function hash(password: string): Promise<string> {
  const salt = await generateSalt();
  const iterations = Math.pow(2, SALT_ROUNDS);
  const hashedPassword = await pbkdf2Hash(password, salt, iterations);
  
  // Formato compatível com bcrypt: $2a$rounds$salt$hash
  return `$2a$${SALT_ROUNDS}$${salt}$${hashedPassword}`;
}

/**
 * Compara uma senha em texto plano com um hash
 * @param password - Senha em texto plano
 * @param hashedPassword - Hash da senha
 * @returns true se a senha corresponde ao hash
 */
export async function compare(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // Parse do hash: $2a$rounds$salt$hash
    const parts = hashedPassword.split('$');
    if (parts.length !== 5 || parts[0] !== '' || parts[1] !== '2a') {
      return false;
    }

    const rounds = parseInt(parts[2], 10);
    const salt = parts[3];
    const originalHash = parts[4];

    // Hash da senha fornecida com o mesmo salt
    const iterations = Math.pow(2, rounds);
    const newHash = await pbkdf2Hash(password, salt, iterations);

    // Comparação constante de tempo para evitar timing attacks
    return constantTimeCompare(newHash, originalHash);
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
}

/**
 * Comparação de strings em tempo constante
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Gera um hash rápido para desenvolvimento (NÃO use em produção)
 */
export async function hashDev(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `$dev$${hashHex}`;
}

/**
 * Compara uma senha com hash dev
 */
export async function compareDev(password: string, hashedPassword: string): Promise<boolean> {
  if (!hashedPassword.startsWith('$dev$')) {
    return false;
  }
  const hash = await hashDev(password);
  return hash === hashedPassword;
}
