"use strict";
/**
 * Watermark Service for DeSciFi
 * Handles watermarking of ML models for ownership verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatermarkService = void 0;
const crypto_1 = require("crypto");
class WatermarkService {
    constructor(options = {}) {
        this.options = {
            algorithm: options.algorithm || 'sha256',
            strength: options.strength || 1,
            position: options.position || 'end',
            encoding: options.encoding || 'hex'
        };
    }
    /**
     * Generate a watermark based on model data and owner info
     */
    generateWatermark(modelData, ownerInfo, customData) {
        const combinedData = `${ownerInfo}:${modelData.length}:${customData || ''}`;
        const hash = (0, crypto_1.createHash)(this.options.algorithm).update(combinedData).digest(this.options.encoding);
        return hash;
    }
    /**
     * Add watermark to model data
     */
    async addWatermark(modelData, ownerInfo, customData, options) {
        try {
            const opts = { ...this.options, ...options };
            // Generate watermark
            const watermark = this.generateWatermark(modelData, ownerInfo, customData);
            // Determine position
            let position;
            switch (opts.position) {
                case 'beginning':
                    position = 0;
                    break;
                case 'end':
                    position = modelData.length;
                    break;
                case 'middle':
                    position = Math.floor(modelData.length / 2);
                    break;
                case 'random':
                    position = Math.floor(Math.random() * modelData.length);
                    break;
                default:
                    position = modelData.length;
            }
            // Create watermarked data
            const watermarkBuffer = Buffer.from(watermark, opts.encoding);
            const watermarkedData = Buffer.concat([
                modelData.subarray(0, position),
                watermarkBuffer,
                modelData.subarray(position)
            ]);
            return {
                watermarkedData,
                watermark,
                position,
                algorithm: opts.algorithm
            };
        }
        catch (error) {
            throw new Error(`Failed to add watermark: ${error.message}`);
        }
    }
    /**
     * Verify watermark in model data
     */
    async verifyWatermark(watermarkedData, ownerInfo, expectedWatermark, options) {
        try {
            const opts = { ...this.options, ...options };
            // Try to find watermark at different positions
            const watermarkLength = this.getWatermarkLength(opts.encoding);
            const positions = this.getPossiblePositions(watermarkedData.length, watermarkLength);
            for (const position of positions) {
                try {
                    // Extract potential watermark
                    const potentialWatermark = watermarkedData.subarray(position, position + watermarkLength);
                    const watermarkStr = potentialWatermark.toString(opts.encoding);
                    // Verify watermark
                    const expectedData = watermarkedData.subarray(0, position).concat(watermarkedData.subarray(position + watermarkLength));
                    const expectedHash = this.generateWatermark(expectedData, ownerInfo);
                    if (watermarkStr === expectedHash) {
                        return {
                            isValid: true,
                            confidence: 1.0,
                            watermark: watermarkStr,
                            position
                        };
                    }
                }
                catch (error) {
                    // Continue to next position
                    continue;
                }
            }
            // If expected watermark provided, try direct comparison
            if (expectedWatermark) {
                const watermarkBuffer = Buffer.from(expectedWatermark, opts.encoding);
                const watermarkIndex = watermarkedData.indexOf(watermarkBuffer);
                if (watermarkIndex !== -1) {
                    return {
                        isValid: true,
                        confidence: 0.8,
                        watermark: expectedWatermark,
                        position: watermarkIndex
                    };
                }
            }
            return {
                isValid: false,
                confidence: 0
            };
        }
        catch (error) {
            return {
                isValid: false,
                confidence: 0
            };
        }
    }
    /**
     * Remove watermark from model data
     */
    async removeWatermark(watermarkedData, watermark, position, options) {
        try {
            const opts = { ...this.options, ...options };
            const watermarkBuffer = Buffer.from(watermark, opts.encoding);
            // Verify watermark exists at position
            const actualWatermark = watermarkedData.subarray(position, position + watermarkBuffer.length);
            if (!actualWatermark.equals(watermarkBuffer)) {
                throw new Error('Watermark not found at specified position');
            }
            // Remove watermark
            const originalData = Buffer.concat([
                watermarkedData.subarray(0, position),
                watermarkedData.subarray(position + watermarkBuffer.length)
            ]);
            return originalData;
        }
        catch (error) {
            throw new Error(`Failed to remove watermark: ${error.message}`);
        }
    }
    /**
     * Add multiple watermarks for enhanced security
     */
    async addMultipleWatermarks(modelData, ownerInfo, count = 3, customData) {
        try {
            let currentData = modelData;
            const watermarks = [];
            for (let i = 0; i < count; i++) {
                const custom = customData ? `${customData}:${i}` : `${i}`;
                const result = await this.addWatermark(currentData, ownerInfo, custom);
                currentData = result.watermarkedData;
                watermarks.push({
                    watermark: result.watermark,
                    position: result.position
                });
            }
            return {
                watermarkedData: currentData,
                watermarks
            };
        }
        catch (error) {
            throw new Error(`Failed to add multiple watermarks: ${error.message}`);
        }
    }
    /**
     * Verify multiple watermarks
     */
    async verifyMultipleWatermarks(watermarkedData, ownerInfo, expectedWatermarks) {
        try {
            let verifiedCount = 0;
            for (const expected of expectedWatermarks) {
                const verification = await this.verifyWatermark(watermarkedData, ownerInfo, expected.watermark);
                if (verification.isValid && verification.position === expected.position) {
                    verifiedCount++;
                }
            }
            const confidence = verifiedCount / expectedWatermarks.length;
            return {
                isValid: verifiedCount === expectedWatermarks.length,
                verifiedCount,
                totalCount: expectedWatermarks.length,
                confidence
            };
        }
        catch (error) {
            return {
                isValid: false,
                verifiedCount: 0,
                totalCount: expectedWatermarks.length,
                confidence: 0
            };
        }
    }
    /**
     * Generate a steganographic watermark (hidden in model weights)
     */
    async addSteganographicWatermark(modelData, ownerInfo, strength = 0.01) {
        try {
            // Convert model data to Float32Array (assuming it's a model file)
            const modelArray = new Float32Array(modelData.buffer, modelData.byteOffset, modelData.length / 4);
            const watermark = this.generateWatermark(modelData, ownerInfo);
            const watermarkBits = this.stringToBits(watermark);
            // Embed watermark in least significant bits
            let bitIndex = 0;
            for (let i = 0; i < modelArray.length && bitIndex < watermarkBits.length; i++) {
                if (Math.random() < strength) {
                    const bit = watermarkBits[bitIndex % watermarkBits.length];
                    modelArray[i] = this.setLSB(modelArray[i], bit);
                    bitIndex++;
                }
            }
            const watermarkedData = Buffer.from(modelArray.buffer);
            return {
                watermarkedData,
                watermark,
                position: 0, // Steganographic watermarks don't have a specific position
                algorithm: 'steganographic'
            };
        }
        catch (error) {
            throw new Error(`Failed to add steganographic watermark: ${error.message}`);
        }
    }
    /**
     * Verify steganographic watermark
     */
    async verifySteganographicWatermark(watermarkedData, ownerInfo, strength = 0.01) {
        try {
            const modelArray = new Float32Array(watermarkedData.buffer, watermarkedData.byteOffset, watermarkedData.length / 4);
            const expectedWatermark = this.generateWatermark(watermarkedData, ownerInfo);
            const expectedBits = this.stringToBits(expectedWatermark);
            let extractedBits = [];
            let bitIndex = 0;
            for (let i = 0; i < modelArray.length && bitIndex < expectedBits.length; i++) {
                if (Math.random() < strength) {
                    const bit = this.getLSB(modelArray[i]);
                    extractedBits.push(bit);
                    bitIndex++;
                }
            }
            const extractedWatermark = this.bitsToString(extractedBits);
            const confidence = this.calculateSimilarity(expectedWatermark, extractedWatermark);
            return {
                isValid: confidence > 0.8,
                confidence,
                watermark: extractedWatermark
            };
        }
        catch (error) {
            return {
                isValid: false,
                confidence: 0
            };
        }
    }
    /**
     * Get watermark length based on encoding
     */
    getWatermarkLength(encoding) {
        switch (encoding) {
            case 'hex':
                return 64; // SHA256 hex length
            case 'base64':
                return 44; // SHA256 base64 length
            case 'utf8':
                return 32; // SHA256 raw length
            default:
                return 64;
        }
    }
    /**
     * Get possible watermark positions
     */
    getPossiblePositions(dataLength, watermarkLength) {
        const positions = [];
        // Check beginning
        positions.push(0);
        // Check end
        if (dataLength > watermarkLength) {
            positions.push(dataLength - watermarkLength);
        }
        // Check middle
        if (dataLength > watermarkLength) {
            positions.push(Math.floor(dataLength / 2));
        }
        // Check random positions
        for (let i = 0; i < 5; i++) {
            const pos = Math.floor(Math.random() * (dataLength - watermarkLength));
            if (!positions.includes(pos)) {
                positions.push(pos);
            }
        }
        return positions;
    }
    /**
     * Convert string to bits
     */
    stringToBits(str) {
        const bits = [];
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            for (let j = 7; j >= 0; j--) {
                bits.push((charCode >> j) & 1);
            }
        }
        return bits;
    }
    /**
     * Convert bits to string
     */
    bitsToString(bits) {
        let str = '';
        for (let i = 0; i < bits.length; i += 8) {
            let charCode = 0;
            for (let j = 0; j < 8 && i + j < bits.length; j++) {
                charCode = (charCode << 1) | bits[i + j];
            }
            str += String.fromCharCode(charCode);
        }
        return str;
    }
    /**
     * Set least significant bit
     */
    setLSB(value, bit) {
        return Math.floor(value) + (bit ? 1 : 0) - (Math.floor(value) % 2);
    }
    /**
     * Get least significant bit
     */
    getLSB(value) {
        return Math.floor(value) % 2;
    }
    /**
     * Calculate string similarity
     */
    calculateSimilarity(str1, str2) {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0)
            return 1;
        let matches = 0;
        const minLength = Math.min(str1.length, str2.length);
        for (let i = 0; i < minLength; i++) {
            if (str1[i] === str2[i]) {
                matches++;
            }
        }
        return matches / maxLength;
    }
}
exports.WatermarkService = WatermarkService;
//# sourceMappingURL=watermark.service.js.map