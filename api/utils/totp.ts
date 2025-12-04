export function generateTOTP(secret: string): number {
  const bytes = base32ToBytes(secret);
  const time = Math.floor(Date.now() / 1000 / 30);
  const hmac = hmacSHA1(bytes, time.toString());
  const offset = hmac[hmac.length - 1] & 0x0f;
  const otp = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return otp;
}

export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const tokenNum = parseInt(token, 10);
  const time = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const hmac = hmacSHA1(base32ToBytes(secret), (time + i).toString());
    const offset = hmac[hmac.length - 1] & 0x0f;
    const otp = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;

    if (otp === tokenNum) {
      return true;
    }
  }

  return false;
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

function base32ToBytes(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits: number[] = [];
  for (const char of input.replace(/=/g, '')) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error('Invalid base32 character');
    bits.push(...[128, 64, 32, 16, 8, 4, 2, 1].map((n) => (val & n) > 0 ? 1 : 0));
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  }
  return new Uint8Array(bytes);
}

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

function hmacSHA1(key: Uint8Array, message: string): Uint8Array {
  const blockSize = 64;
  const outputLength = 20;

  if (key.length > blockSize) {
    key = sha1(key);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(key);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const iKeyPadMessage = new Uint8Array(blockSize + new TextEncoder().encode(message).length);
  iKeyPadMessage.set(iKeyPad);
  iKeyPadMessage.set(new TextEncoder().encode(message), blockSize);

  const innerHash = sha1(iKeyPadMessage);

  const oKeyPadHash = new Uint8Array(blockSize + outputLength);
  oKeyPadHash.set(oKeyPad);
  oKeyPadHash.set(innerHash, blockSize);

  return sha1(oKeyPadHash);
}

function sha1(input: Uint8Array): Uint8Array {
  const h0 = 0x67452301;
  const h1 = 0xefcdab89;
  const h2 = 0x98badcfe;
  const h3 = 0x10325476;
  const h4 = 0xc3d2e1f0;

  const msg = new Uint8Array(input.length + 1 + 8);
  msg.set(input);
  msg[input.length] = 0x80;

  const bitLength = input.length * 8;
  const view = new DataView(msg.buffer, msg.byteOffset, msg.length);
  view.setUint32(msg.length - 4, bitLength >>> 0);
  view.setUint32(msg.length - 8, 0);

  let a = h0,
    b = h1,
    c = h2,
    d = h3,
    e = h4;

  for (let i = 0; i < msg.length; i += 64) {
    const w = new Uint32Array(80);
    for (let j = 0; j < 16; j++) {
      w[j] =
        ((msg[i + j * 4] << 24) |
          (msg[i + j * 4 + 1] << 16) |
          (msg[i + j * 4 + 2] << 8) |
          msg[i + j * 4 + 3]) >>>
        0;
    }

    for (let j = 16; j < 80; j++) {
      w[j] = ((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) << 1) | ((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) >>> 31);
      w[j] >>>= 0;
    }

    let ta = a,
      tb = b,
      tc = c,
      td = d,
      te = e;

    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) {
        f = (tb & tc) | (~tb & td);
        k = 0x5a827999;
      } else if (j < 40) {
        f = tb ^ tc ^ td;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (tb & tc) | (tb & td) | (tc & td);
        k = 0x8f1bbcdc;
      } else {
        f = tb ^ tc ^ td;
        k = 0xca62c1d6;
      }

      const temp = (((ta << 5) | (ta >>> 27)) + f + te + k + w[j]) >>> 0;
      te = td;
      td = tc;
      tc = ((tb << 30) | (tb >>> 2)) >>> 0;
      tb = ta;
      ta = temp;
    }

    a = (a + ta) >>> 0;
    b = (b + tb) >>> 0;
    c = (c + tc) >>> 0;
    d = (d + td) >>> 0;
    e = (e + te) >>> 0;
  }

  const result = new Uint8Array(20);
  const view2 = new DataView(result.buffer);
  view2.setUint32(0, a);
  view2.setUint32(4, b);
  view2.setUint32(8, c);
  view2.setUint32(12, d);
  view2.setUint32(16, e);

  return result;
}
