/**
 * Core encryption module - Double-layer AES-GCM encryption with PBKDF2 key derivation
 * Uses Web Crypto API for all cryptographic operations
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const MAGIC_HEADER = new Uint8Array([0x45, 0x4e, 0x43, 0x32]); // "ENC2"

/**
 * Derive an AES-GCM 256-bit key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with a single layer of AES-GCM
 */
async function encryptLayer(
  data: ArrayBuffer,
  password: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; iv: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    iv,
  };
}

/**
 * Decrypt a single layer of AES-GCM
 */
async function decryptLayer(
  encrypted: Uint8Array,
  password: string,
  salt: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const key = await deriveKey(password, salt);

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encrypted as BufferSource
  );
}

/**
 * Double-layer encryption: encrypt with password1, then encrypt result with password2
 * Output format: [MAGIC(4)][SALT1(16)][IV1(12)][SALT2(16)][IV2(12)][ENCRYPTED_DATA]
 */
export async function doubleEncrypt(
  data: ArrayBuffer,
  password1: string,
  password2: string
): Promise<Uint8Array> {
  // Layer 1: encrypt with password1
  const layer1 = await encryptLayer(data, password1);

  // Layer 2: encrypt layer1 output with password2
  const layer2 = await encryptLayer(layer1.encrypted.buffer as ArrayBuffer, password2);

  // Pack: MAGIC + SALT1 + IV1 + SALT2 + IV2 + ENCRYPTED
  const totalLength =
    MAGIC_HEADER.length +
    SALT_LENGTH + IV_LENGTH +
    SALT_LENGTH + IV_LENGTH +
    layer2.encrypted.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;

  result.set(MAGIC_HEADER, offset); offset += MAGIC_HEADER.length;
  result.set(layer1.salt, offset);   offset += SALT_LENGTH;
  result.set(layer1.iv, offset);     offset += IV_LENGTH;
  result.set(layer2.salt, offset);   offset += SALT_LENGTH;
  result.set(layer2.iv, offset);     offset += IV_LENGTH;
  result.set(layer2.encrypted, offset);

  return result;
}

/**
 * Double-layer decryption: decrypt with password2 first, then decrypt with password1
 */
export async function doubleDecrypt(
  packed: Uint8Array,
  password1: string,
  password2: string
): Promise<ArrayBuffer> {
  // Verify magic header
  const magic = packed.slice(0, MAGIC_HEADER.length);
  if (!magic.every((v, i) => v === MAGIC_HEADER[i])) {
    throw new Error('Invalid encrypted data format (magic header mismatch)');
  }

  let offset = MAGIC_HEADER.length;

  const salt1 = packed.slice(offset, offset + SALT_LENGTH); offset += SALT_LENGTH;
  const iv1 = packed.slice(offset, offset + IV_LENGTH);     offset += IV_LENGTH;
  const salt2 = packed.slice(offset, offset + SALT_LENGTH); offset += SALT_LENGTH;
  const iv2 = packed.slice(offset, offset + IV_LENGTH);     offset += IV_LENGTH;
  const encryptedData = packed.slice(offset);

  // Decrypt layer 2 (password2)
  const layer1Decrypted = await decryptLayer(encryptedData, password2, salt2, iv2);

  // Decrypt layer 1 (password1)
  const originalData = await decryptLayer(new Uint8Array(layer1Decrypted), password1, salt1, iv1);

  return originalData;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt text message with double-layer encryption
 */
export async function encryptText(
  text: string,
  password1: string,
  password2: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text).buffer;
  return doubleEncrypt(data, password1, password2);
}

/**
 * Decrypt to text message with double-layer decryption
 */
export async function decryptText(
  packed: Uint8Array,
  password1: string,
  password2: string
): Promise<string> {
  const data = await doubleDecrypt(packed, password1, password2);
  const decoder = new TextDecoder();
  return decoder.decode(data);
}

/**
 * Encrypt file (ArrayBuffer) with double-layer encryption
 * Prepends file metadata (name, type, size) before encryption
 */
export async function encryptFile(
  fileData: ArrayBuffer,
  fileName: string,
  fileType: string,
  password1: string,
  password2: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const meta = JSON.stringify({ name: fileName, type: fileType, size: fileData.byteLength });
  const metaBytes = encoder.encode(meta);
  const metaLen = new Uint32Array([metaBytes.length]);
  const metaLenBytes = new Uint8Array(metaLen.buffer);

  // Pack: [META_LEN(4)][META][FILE_DATA]
  const packed = new Uint8Array(4 + metaBytes.length + fileData.byteLength);
  packed.set(metaLenBytes, 0);
  packed.set(metaBytes, 4);
  packed.set(new Uint8Array(fileData), 4 + metaBytes.length);

  return doubleEncrypt(packed.buffer, password1, password2);
}

/**
 * Decrypt file data and extract metadata
 */
export async function decryptFile(
  packed: Uint8Array,
  password1: string,
  password2: string
): Promise<{ data: ArrayBuffer; name: string; type: string }> {
  const decrypted = await doubleDecrypt(packed, password1, password2);
  const decryptedView = new Uint8Array(decrypted);

  const metaLenBytes = decryptedView.slice(0, 4);
  const metaLen = new Uint32Array(metaLenBytes.buffer)[0];

  const decoder = new TextDecoder();
  const metaBytes = decryptedView.slice(4, 4 + metaLen);
  const meta = JSON.parse(decoder.decode(metaBytes));

  const fileData = decryptedView.slice(4 + metaLen);

  return {
    data: fileData.buffer,
    name: meta.name,
    type: meta.type,
  };
}

// ============================================================
// Auto-password & Self-contained payload
// ============================================================

/**
 * Generate a random password with given length
 * Uses characters that are easy to copy but hard to guess
 */
export function generatePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * Pack data with auto-generated passwords into a self-contained payload.
 * Format: [P1_LEN(1)][P1][P2_LEN(1)][P2][ENCRYPTED_DATA]
 * The passwords are embedded so the receiver doesn't need to know them.
 */
export async function selfContainedEncrypt(
  data: ArrayBuffer,
  isFile: boolean = false
): Promise<{ payload: Uint8Array; password1: string; password2: string }> {
  const password1 = generatePassword(16);
  const password2 = generatePassword(16);

  const encrypted = await doubleEncrypt(data, password1, password2);

  // Pack passwords with encrypted data
  const encoder = new TextEncoder();
  const p1Bytes = encoder.encode(password1);
  const p2Bytes = encoder.encode(password2);

  // Format: [FLAG(1)][P1_LEN(1)][P1][P2_LEN(1)][P2][ENCRYPTED]
  // FLAG: 0x01 = text, 0x02 = file
  const flag = isFile ? 0x02 : 0x01;
  const totalLen = 1 + 1 + p1Bytes.length + 1 + p2Bytes.length + encrypted.length;
  const payload = new Uint8Array(totalLen);

  let offset = 0;
  payload[offset++] = flag;
  payload[offset++] = p1Bytes.length;
  payload.set(p1Bytes, offset); offset += p1Bytes.length;
  payload[offset++] = p2Bytes.length;
  payload.set(p2Bytes, offset); offset += p2Bytes.length;
  payload.set(encrypted, offset);

  return { payload, password1, password2 };
}

/**
 * Decrypt a self-contained payload (passwords are embedded)
 */
export async function selfContainedDecrypt(
  payload: Uint8Array
): Promise<{ data: ArrayBuffer; isFile: boolean }> {
  let offset = 0;

  const flag = payload[offset++];
  const isFile = flag === 0x02;

  const p1Len = payload[offset++];
  const decoder = new TextDecoder();
  const password1 = decoder.decode(payload.slice(offset, offset + p1Len));
  offset += p1Len;

  const p2Len = payload[offset++];
  const password2 = decoder.decode(payload.slice(offset, offset + p2Len));
  offset += p2Len;

  const encrypted = payload.slice(offset);

  const data = await doubleDecrypt(encrypted, password1, password2);

  return { data, isFile };
}
