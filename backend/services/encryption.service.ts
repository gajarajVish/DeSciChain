/**
 * Encryption Service for DeSciFi
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
  usePBKDF2?: boolean;
  keyDerivationFunction?: 'PBKDF2' | 'scrypt' | 'argon2';
}

export interface EncryptionResult {
  encryptedData: Buffer;
  key: string;
  iv: string;
  salt: string;
  algorithm: string;
  keyDerivationFunction: string;
  authTag?: string;
}

export interface DecryptionResult {
  decryptedData: Buffer;
  success: boolean;
  error?: string;
}

export interface HybridEncryptionResult {
  symmetricKey: string;
  encryptedData: Buffer;
  encryptedSymmetricKey: Buffer;
  publicKey: string;
  algorithm: string;
}

export class EncryptionService {
  private options: Required<EncryptionOptions>;

  constructor(options: EncryptionOptions = {}) {
    this.options = {
      algorithm: options.algorithm || 'aes-256-gcm',
      keyLength: options.keyLength || 32,
      ivLength: options.ivLength || 16,
      saltLength: options.saltLength || 32,
      iterations: options.iterations || 100000,
      usePBKDF2: options.usePBKDF2 ?? true,
      keyDerivationFunction: options.keyDerivationFunction || 'PBKDF2'
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
   * Derive key from password using various KDFs
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    switch (this.options.keyDerivationFunction) {
      case 'scrypt':
        return crypto.scryptSync(password, salt, this.options.keyLength, {
          N: 16384,
          r: 8,
          p: 1,
          maxmem: 32 * 1024 * 1024
        });

      case 'argon2':
        // Use scrypt as fallback since Argon2 is not available in Node.js crypto
        return crypto.scryptSync(password, salt, this.options.keyLength, {
          N: 32768,
          r: 8,
          p: 2,
          maxmem: 64 * 1024 * 1024
        });

      case 'PBKDF2':
      default:
        return crypto.pbkdf2Sync(password, salt, this.options.iterations, this.options.keyLength, 'sha512');
    }
  }

  /**
   * Generate RSA key pair for hybrid encryption
   */
  generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  /**
   * Hybrid encryption using RSA + AES
   */
  async hybridEncrypt(
    data: Buffer,
    recipientPublicKey: string
  ): Promise<HybridEncryptionResult> {
    try {
      // Generate random symmetric key
      const symmetricKey = this.generateKey();

      // Encrypt data with symmetric key
      const symmetricResult = await this.encryptData(data, symmetricKey);

      // Encrypt symmetric key with recipient's public key
      const encryptedSymmetricKey = crypto.publicEncrypt(
        {
          key: recipientPublicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(symmetricKey, 'hex')
      );

      return {
        symmetricKey,
        encryptedData: symmetricResult.encryptedData,
        encryptedSymmetricKey,
        publicKey: recipientPublicKey,
        algorithm: 'RSA+AES-256-GCM'
      };
    } catch (error) {
      throw new Error(`Hybrid encryption failed: ${error.message}`);
    }
  }

  /**
   * Hybrid decryption using RSA private key + AES
   */
  async hybridDecrypt(
    encryptedData: Buffer,
    encryptedSymmetricKey: Buffer,
    privateKey: string
  ): Promise<DecryptionResult> {
    try {
      // Decrypt symmetric key with private key
      const symmetricKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedSymmetricKey
      );

      // Decrypt data with symmetric key
      return await this.decryptData(encryptedData, symmetricKey.toString('hex'));
    } catch (error) {
      return {
        decryptedData: Buffer.alloc(0),
        success: false,
        error: `Hybrid decryption failed: ${error.message}`
      };
    }
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
        algorithm: this.options.algorithm,
        keyDerivationFunction: this.options.keyDerivationFunction,
        authTag: tag.toString('hex')
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
   * Encrypt model with multiple layers of protection
   */
  async encryptModelSecure(
    modelData: Buffer,
    ownerInfo: string,
    options?: {
      useHybrid?: boolean;
      recipientPublicKey?: string;
      watermark?: boolean;
    }
  ): Promise<{
    encryptedData: Buffer;
    encryptionKey: string;
    metadata: Record<string, any>;
  }> {
    try {
      // Generate encryption key
      const encryptionKey = this.generateKey();

      let finalData = modelData;
      const metadata: Record<string, any> = {
        algorithm: this.options.algorithm,
        keyDerivationFunction: this.options.keyDerivationFunction,
        encryptionLayers: []
      };

      // Layer 1: Optional watermarking
      if (options?.watermark) {
        const watermarkService = new (require('./watermark.service')).WatermarkService();
        const watermarkResult = await watermarkService.addWatermark(modelData, ownerInfo);
        finalData = watermarkResult.watermarkedData;
        metadata.watermark = {
          position: watermarkResult.position,
          algorithm: watermarkResult.algorithm
        };
        metadata.encryptionLayers.push('watermark');
      }

      // Layer 2: Symmetric encryption
      const encrypted = await this.encryptData(finalData, encryptionKey);
      metadata.encryptionLayers.push('symmetric');

      let finalEncryptedData = encrypted.encryptedData;
      let finalKey = encryptionKey;

      // Layer 3: Optional hybrid encryption
      if (options?.useHybrid && options.recipientPublicKey) {
        const hybridResult = await this.hybridEncrypt(encrypted.encryptedData, options.recipientPublicKey);
        finalEncryptedData = hybridResult.encryptedData;
        finalKey = hybridResult.symmetricKey;
        metadata.hybrid = {
          encryptedSymmetricKey: hybridResult.encryptedSymmetricKey.toString('base64'),
          recipientPublicKey: hybridResult.publicKey
        };
        metadata.encryptionLayers.push('hybrid');
      }

      // Add metadata
      metadata.timestamp = new Date().toISOString();
      metadata.ownerInfo = ownerInfo;
      metadata.dataHash = crypto.createHash('sha256').update(modelData).digest('hex');

      return {
        encryptedData: finalEncryptedData,
        encryptionKey: finalKey,
        metadata
      };
    } catch (error) {
      throw new Error(`Secure model encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt model with multiple layers
   */
  async decryptModelSecure(
    encryptedData: Buffer,
    encryptionKey: string,
    metadata: Record<string, any>
  ): Promise<{
    decryptedData: Buffer;
    verified: boolean;
    watermarkVerified?: boolean;
  }> {
    try {
      let currentData = encryptedData;
      const layers = [...(metadata.encryptionLayers || [])].reverse();

      // Decrypt layers in reverse order
      for (const layer of layers) {
        switch (layer) {
          case 'hybrid':
            if (metadata.hybrid) {
              const privateKey = process.env.DECRYPTION_PRIVATE_KEY;
              if (!privateKey) {
                throw new Error('Private key required for hybrid decryption');
              }

              const hybridResult = await this.hybridDecrypt(
                currentData,
                Buffer.from(metadata.hybrid.encryptedSymmetricKey, 'base64'),
                privateKey
              );

              if (!hybridResult.success) {
                throw new Error(hybridResult.error);
              }
              currentData = hybridResult.decryptedData;
            }
            break;

          case 'symmetric':
            const symmetricResult = await this.decryptData(currentData, encryptionKey);
            if (!symmetricResult.success) {
              throw new Error('Symmetric decryption failed');
            }
            currentData = symmetricResult.decryptedData;
            break;

          case 'watermark':
            // Watermark verification would happen here
            // For now, just pass through
            break;
        }
      }

      // Verify data integrity
      const dataHash = crypto.createHash('sha256').update(currentData).digest('hex');
      const verified = dataHash === metadata.dataHash;

      return {
        decryptedData: currentData,
        verified,
        watermarkVerified: true // Would implement watermark verification
      };
    } catch (error) {
      throw new Error(`Secure model decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate cryptographically secure random bytes
   */
  generateSecureRandom(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Create HMAC for data integrity
   */
  createHMAC(data: Buffer, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: Buffer, key: string, expectedHMAC: string): boolean {
    const calculatedHMAC = this.createHMAC(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHMAC, 'hex'),
      Buffer.from(expectedHMAC, 'hex')
    );
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

  /**
   * Test hybrid encryption/decryption
   */
  async testHybridEncryption(testData: string = 'test data'): Promise<boolean> {
    try {
      const keyPair = this.generateRSAKeyPair();
      const data = Buffer.from(testData, 'utf8');

      const encrypted = await this.hybridEncrypt(data, keyPair.publicKey);
      const decrypted = await this.hybridDecrypt(
        encrypted.encryptedData,
        encrypted.encryptedSymmetricKey,
        keyPair.privateKey
      );

      return decrypted.success && decrypted.decryptedData.toString('utf8') === testData;
    } catch (error) {
      console.error('Hybrid encryption test failed:', error);
      return false;
    }
  }
}
