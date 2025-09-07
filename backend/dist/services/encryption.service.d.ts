/**
 * Encryption Service for DeSciFi
 * Handles AES-256 encryption/decryption for model files
 */
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
export declare class EncryptionService {
    private options;
    constructor(options?: EncryptionOptions);
    /**
     * Generate a random encryption key
     */
    generateKey(): string;
    /**
     * Generate a random IV
     */
    generateIV(): string;
    /**
     * Generate a random salt
     */
    generateSalt(): string;
    /**
     * Derive key from password using various KDFs
     */
    private deriveKey;
    /**
     * Generate RSA key pair for hybrid encryption
     */
    generateRSAKeyPair(): {
        publicKey: string;
        privateKey: string;
    };
    /**
     * Hybrid encryption using RSA + AES
     */
    hybridEncrypt(data: Buffer, recipientPublicKey: string): Promise<HybridEncryptionResult>;
    /**
     * Hybrid decryption using RSA private key + AES
     */
    hybridDecrypt(encryptedData: Buffer, encryptedSymmetricKey: Buffer, privateKey: string): Promise<DecryptionResult>;
    /**
     * Encrypt data with AES-256-GCM
     */
    encryptData(data: Buffer, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<EncryptionResult>;
    /**
     * Decrypt data with AES-256-GCM
     */
    decryptData(encryptedData: Buffer, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<DecryptionResult>;
    /**
     * Encrypt file from buffer
     */
    encryptModel(fileBuffer: Buffer, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<EncryptionResult>;
    /**
     * Decrypt file to buffer
     */
    decryptModel(encryptedBuffer: Buffer, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<DecryptionResult>;
    /**
     * Encrypt file from stream
     */
    encryptFileFromStream(inputStream: NodeJS.ReadableStream, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<EncryptionResult>;
    /**
     * Decrypt file to stream
     */
    decryptFileToStream(encryptedBuffer: Buffer, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<NodeJS.ReadableStream>;
    /**
     * Encrypt file from file path
     */
    encryptFileFromPath(filePath: string, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<EncryptionResult>;
    /**
     * Decrypt file to file path
     */
    decryptFileToPath(encryptedBuffer: Buffer, outputPath: string, key: string, options?: {
        iv?: string;
        salt?: string;
    }): Promise<boolean>;
    /**
     * Hash a key for storage (one-way hash)
     */
    hashKey(key: string): string;
    /**
     * Verify key against hash
     */
    verifyKey(key: string, hash: string): boolean;
    /**
     * Generate a secure random password
     */
    generateSecurePassword(length?: number): string;
    /**
     * Encrypt model with multiple layers of protection
     */
    encryptModelSecure(modelData: Buffer, ownerInfo: string, options?: {
        useHybrid?: boolean;
        recipientPublicKey?: string;
        watermark?: boolean;
    }): Promise<{
        encryptedData: Buffer;
        encryptionKey: string;
        metadata: Record<string, any>;
    }>;
    /**
     * Decrypt model with multiple layers
     */
    decryptModelSecure(encryptedData: Buffer, encryptionKey: string, metadata: Record<string, any>): Promise<{
        decryptedData: Buffer;
        verified: boolean;
        watermarkVerified?: boolean;
    }>;
    /**
     * Generate cryptographically secure random bytes
     */
    generateSecureRandom(length: number): Buffer;
    /**
     * Create HMAC for data integrity
     */
    createHMAC(data: Buffer, key: string): string;
    /**
     * Verify HMAC
     */
    verifyHMAC(data: Buffer, key: string, expectedHMAC: string): boolean;
    /**
     * Test encryption/decryption cycle
     */
    testEncryption(testData?: string): Promise<boolean>;
    /**
     * Test hybrid encryption/decryption
     */
    testHybridEncryption(testData?: string): Promise<boolean>;
}
//# sourceMappingURL=encryption.service.d.ts.map