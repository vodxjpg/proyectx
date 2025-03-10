// utils/encryption.ts
import crypto from "crypto";

// We'll use AES-256-CBC. The key must be 32 bytes (256 bits).
const ALGORITHM = "aes-256-cbc";

// Store your 32-byte key in hex form in an environment variable, e.g. DATA_ENCRYPTION_KEY
export function encryptData(plaintext: string, hexKey: string): string {
  if (!hexKey) throw new Error("Missing encryption key in environment.");
  const keyBuffer = Buffer.from(hexKey, "hex");

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  // We'll store IV (hex) + ciphertext (base64), separated by ':'
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptData(encrypted: string, hexKey: string): string {
  if (!hexKey) throw new Error("Missing decryption key in environment.");
  const [ivHex, ciphertext] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const keyBuffer = Buffer.from(hexKey, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
