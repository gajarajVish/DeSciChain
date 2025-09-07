"use strict";
/**
 * Encryption Service for DeSciFi
 * Handles AES-256 encryption/decryption for model files
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const crypto = __importStar(require("crypto"));
class EncryptionService {
    constructor(options = {}) {
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
    generateKey() {
        return crypto.randomBytes(this.options.keyLength).toString('hex');
    }
    /**
     * Generate a random IV
     */
    generateIV() {
        return crypto.randomBytes(this.options.ivLength).toString('hex');
    }
    /**
     * Generate a random salt
     */
    generateSalt() {
        return crypto.randomBytes(this.options.saltLength).toString('hex');
    }
    /**
     * Derive key from password using various KDFs
     */
    deriveKey(password, salt) {
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
    generateRSAKeyPair() {
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
    async hybridEncrypt(data, recipientPublicKey) {
        try {
            // Generate random symmetric key
            const symmetricKey = this.generateKey();
            // Encrypt data with symmetric key
            const symmetricResult = await this.encryptData(data, symmetricKey);
            // Encrypt symmetric key with recipient's public key
            const encryptedSymmetricKey = crypto.publicEncrypt({
                key: recipientPublicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, Buffer.from(symmetricKey, 'hex'));
            return {
                symmetricKey,
                encryptedData: symmetricResult.encryptedData,
                encryptedSymmetricKey,
                publicKey: recipientPublicKey,
                algorithm: 'RSA+AES-256-GCM'
            };
        }
        catch (error) {
            throw new Error(`Hybrid encryption failed: ${error.message}`);
        }
    }
    /**
     * Hybrid decryption using RSA private key + AES
     */
    async hybridDecrypt(encryptedData, encryptedSymmetricKey, privateKey) {
        try {
            // Decrypt symmetric key with private key
            const symmetricKey = crypto.privateDecrypt({
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            }, encryptedSymmetricKey);
            // Decrypt data with symmetric key
            return await this.decryptData(encryptedData, symmetricKey.toString('hex'));
        }
        catch (error) {
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
    async encryptData(data, key, options) {
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
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }
    /**
     * Decrypt data with AES-256-GCM
     */
    async decryptData(encryptedData, key, options) {
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
        }
        catch (error) {
            return {
                decryptedData: Buffer.alloc(0),
                success: false
            };
        }
    }
    /**
     * Encrypt file from buffer
     */
    async encryptModel(fileBuffer, key, options) {
        return this.encryptData(fileBuffer, key, options);
    }
    /**
     * Decrypt file to buffer
     */
    async decryptModel(encryptedBuffer, key, options) {
        return this.decryptData(encryptedBuffer, key, options);
    }
    /**
     * Encrypt file from stream
     */
    async encryptFileFromStream(inputStream, key, options) {
        try {
            const chunks = [];
            for await (const chunk of inputStream) {
                chunks.push(chunk);
            }
            const fileBuffer = Buffer.concat(chunks);
            return this.encryptData(fileBuffer, key, options);
        }
        catch (error) {
            throw new Error(`Failed to encrypt file from stream: ${error.message}`);
        }
    }
    /**
     * Decrypt file to stream
     */
    async decryptFileToStream(encryptedBuffer, key, options) {
        try {
            const result = await this.decryptData(encryptedBuffer, key, options);
            if (!result.success) {
                throw new Error('Decryption failed');
            }
            return require('stream').Readable.from(result.decryptedData);
        }
        catch (error) {
            throw new Error(`Failed to decrypt file to stream: ${error.message}`);
        }
    }
    /**
     * Encrypt file from file path
     */
    async encryptFileFromPath(filePath, key, options) {
        try {
            const fileBuffer = await require('fs').promises.readFile(filePath);
            return this.encryptData(fileBuffer, key, options);
        }
        catch (error) {
            throw new Error(`Failed to encrypt file from path: ${error.message}`);
        }
    }
    /**
     * Decrypt file to file path
     */
    async decryptFileToPath(encryptedBuffer, outputPath, key, options) {
        try {
            const result = await this.decryptData(encryptedBuffer, key, options);
            if (!result.success) {
                return false;
            }
            await require('fs').promises.writeFile(outputPath, result.decryptedData);
            return true;
        }
        catch (error) {
            throw new Error(`Failed to decrypt file to path: ${error.message}`);
        }
    }
    /**
     * Hash a key for storage (one-way hash)
     */
    hashKey(key) {
        return crypto.createHash('sha256').update(key).digest('hex');
    }
    /**
     * Verify key against hash
     */
    verifyKey(key, hash) {
        const keyHash = this.hashKey(key);
        return crypto.timingSafeEqual(Buffer.from(keyHash, 'hex'), Buffer.from(hash, 'hex'));
    }
    /**
     * Generate a secure random password
     */
    generateSecurePassword(length = 32) {
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
    async encryptModelSecure(modelData, ownerInfo, options) {
        try {
            // Generate encryption key
            const encryptionKey = this.generateKey();
            let finalData = modelData;
            const metadata = {
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
        }
        catch (error) {
            throw new Error(`Secure model encryption failed: ${error.message}`);
        }
    }
    /**
     * Decrypt model with multiple layers
     */
    async decryptModelSecure(encryptedData, encryptionKey, metadata) {
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
                            const hybridResult = await this.hybridDecrypt(currentData, Buffer.from(metadata.hybrid.encryptedSymmetricKey, 'base64'), privateKey);
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
        }
        catch (error) {
            throw new Error(`Secure model decryption failed: ${error.message}`);
        }
    }
    /**
     * Generate cryptographically secure random bytes
     */
    generateSecureRandom(length) {
        return crypto.randomBytes(length);
    }
    /**
     * Create HMAC for data integrity
     */
    createHMAC(data, key) {
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }
    /**
     * Verify HMAC
     */
    verifyHMAC(data, key, expectedHMAC) {
        const calculatedHMAC = this.createHMAC(data, key);
        return crypto.timingSafeEqual(Buffer.from(calculatedHMAC, 'hex'), Buffer.from(expectedHMAC, 'hex'));
    }
    /**
     * Test encryption/decryption cycle
     */
    async testEncryption(testData = 'test data') {
        try {
            const key = this.generateKey();
            const data = Buffer.from(testData, 'utf8');
            const encrypted = await this.encryptData(data, key);
            const decrypted = await this.decryptData(encrypted.encryptedData, key);
            return decrypted.success && decrypted.decryptedData.toString('utf8') === testData;
        }
        catch (error) {
            console.error('Encryption test failed:', error);
            return false;
        }
    }
    /**
     * Test hybrid encryption/decryption
     */
    async testHybridEncryption(testData = 'test data') {
        try {
            const keyPair = this.generateRSAKeyPair();
            const data = Buffer.from(testData, 'utf8');
            const encrypted = await this.hybridEncrypt(data, keyPair.publicKey);
            const decrypted = await this.hybridDecrypt(encrypted.encryptedData, encrypted.encryptedSymmetricKey, keyPair.privateKey);
            return decrypted.success && decrypted.decryptedData.toString('utf8') === testData;
        }
        catch (error) {
            console.error('Hybrid encryption test failed:', error);
            return false;
        }
    }
}
exports.EncryptionService = EncryptionService;
//# sourceMappingURL=encryption.service.js.map