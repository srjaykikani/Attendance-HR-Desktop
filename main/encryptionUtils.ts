// main/encryptionUtils.ts
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'your-secret-key';

export function encrypt(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

export function decrypt(ciphertext: string): any {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) {
      return null;
    }
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}