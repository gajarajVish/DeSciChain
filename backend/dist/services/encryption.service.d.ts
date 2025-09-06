/**
 * Encryption Service for DeSciChain
 * Handles AES-256 encryption/decryption for model files
 */
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
     * Derive key from password using PBKDF2
     */
    private deriveKey;
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
     * Test encryption/decryption cycle
     */
    testEncryption(testData?: string): Promise<boolean>;
}
//# sourceMappingURL=encryption.service.d.ts.map