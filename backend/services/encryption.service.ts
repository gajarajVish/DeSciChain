/**
 * Encryption Service for DeSciChain
 * Handles AES-256 encryption/decryption for model files
 */

import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  iterations?: number;
}

export interface EncryptionResult {
  encryptedData: Buffer;
  key: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export interface DecryptionResult {
  decryptedData: Buffer;
  success: boolean;
}

export class EncryptionService {
  private options: Required<EncryptionOptions>;

  constructor(options: EncryptionOptions = {}) {
    this.options = {
      algorithm: options.algorithm || 'aes-256-gcm',
      keyLength: options.keyLength || 32,
      ivLength: options.ivLength || 16,
      saltLength: options.saltLength || 32,
      iterations: options.iterations || 100000
    };
  }

  /**
   * Generate a random encryption key
   */
  generateKey(): string {
    return crypto.randomBytes(this.options.keyLength).toString('hex');
  }

  /**
   * Generate a random IV
   */
  generateIV(): string {
    return crypto.randomBytes(this.options.ivLength).toString('hex');
  }

  /**
   * Generate a random salt
   */
  generateSalt(): string {
    return crypto.randomBytes(this.options.saltLength).toString('hex');
  }

  /**
   * Derive key from password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.options.iterations, this.options.keyLength, 'sha512');
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encryptData(
    data: Buffer, 
    key: string, 
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<EncryptionResult> {
    try {
      const iv = options?.iv ? Buffer.from(options.iv, 'hex') : crypto.randomBytes(this.options.ivLength);
      const salt = options?.salt ? Buffer.from(options.salt, 'hex') : crypto.randomBytes(this.options.saltLength);
      
      // Derive key from password and salt
      const derivedKey = this.deriveKey(key, salt);
      
      // Create cipher
      const cipher = crypto.createCipher(this.options.algorithm, derivedKey);
      cipher.setAAD(salt); // Use salt as additional authenticated data
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine salt + tag + encrypted data
      const result = Buffer.concat([salt, tag, encrypted]);
      
      return {
        encryptedData: result,
        key,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        algorithm: this.options.algorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  async decryptData(
    encryptedData: Buffer,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<DecryptionResult> {
    try {
      // Extract salt, tag, and encrypted data
      const salt = options?.salt ? 
        Buffer.from(options.salt, 'hex') : 
        encryptedData.subarray(0, this.options.saltLength);
      
      const tag = encryptedData.subarray(this.options.saltLength, this.options.saltLength + 16);
      const encrypted = encryptedData.subarray(this.options.saltLength + 16);
      
      // Derive key from password and salt
      const derivedKey = this.deriveKey(key, salt);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.options.algorithm, derivedKey);
      decipher.setAAD(salt); // Use salt as additional authenticated data
      decipher.setAuthTag(tag);
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return {
        decryptedData: decrypted,
        success: true
      };
    } catch (error) {
      return {
        decryptedData: Buffer.alloc(0),
        success: false
      };
    }
  }

  /**
   * Encrypt file from buffer
   */
  async encryptModel(
    fileBuffer: Buffer,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<EncryptionResult> {
    return this.encryptData(fileBuffer, key, options);
  }

  /**
   * Decrypt file to buffer
   */
  async decryptModel(
    encryptedBuffer: Buffer,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<DecryptionResult> {
    return this.decryptData(encryptedBuffer, key, options);
  }

  /**
   * Encrypt file from stream
   */
  async encryptFileFromStream(
    inputStream: NodeJS.ReadableStream,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<EncryptionResult> {
    try {
      const chunks: Buffer[] = [];
      
      for await (const chunk of inputStream) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      return this.encryptData(fileBuffer, key, options);
    } catch (error) {
      throw new Error(`Failed to encrypt file from stream: ${error.message}`);
    }
  }

  /**
   * Decrypt file to stream
   */
  async decryptFileToStream(
    encryptedBuffer: Buffer,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<NodeJS.ReadableStream> {
    try {
      const result = await this.decryptData(encryptedBuffer, key, options);
      
      if (!result.success) {
        throw new Error('Decryption failed');
      }
      
      return require('stream').Readable.from(result.decryptedData);
    } catch (error) {
      throw new Error(`Failed to decrypt file to stream: ${error.message}`);
    }
  }

  /**
   * Encrypt file from file path
   */
  async encryptFileFromPath(
    filePath: string,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<EncryptionResult> {
    try {
      const fileBuffer = await require('fs').promises.readFile(filePath);
      return this.encryptData(fileBuffer, key, options);
    } catch (error) {
      throw new Error(`Failed to encrypt file from path: ${error.message}`);
    }
  }

  /**
   * Decrypt file to file path
   */
  async decryptFileToPath(
    encryptedBuffer: Buffer,
    outputPath: string,
    key: string,
    options?: {
      iv?: string;
      salt?: string;
    }
  ): Promise<boolean> {
    try {
      const result = await this.decryptData(encryptedBuffer, key, options);
      
      if (!result.success) {
        return false;
      }
      
      await require('fs').promises.writeFile(outputPath, result.decryptedData);
      return true;
    } catch (error) {
      throw new Error(`Failed to decrypt file to path: ${error.message}`);
    }
  }

  /**
   * Hash a key for storage (one-way hash)
   */
  hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Verify key against hash
   */
  verifyKey(key: string, hash: string): boolean {
    const keyHash = this.hashKey(key);
    return crypto.timingSafeEqual(Buffer.from(keyHash, 'hex'), Buffer.from(hash, 'hex'));
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Test encryption/decryption cycle
   */
  async testEncryption(testData: string = 'test data'): Promise<boolean> {
    try {
      const key = this.generateKey();
      const data = Buffer.from(testData, 'utf8');
      
      const encrypted = await this.encryptData(data, key);
      const decrypted = await this.decryptData(encrypted.encryptedData, key);
      
      return decrypted.success && decrypted.decryptedData.toString('utf8') === testData;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }
}
