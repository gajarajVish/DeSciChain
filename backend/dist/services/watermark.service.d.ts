/**
 * Watermark Service for DeSciFi
 * Handles watermarking of ML models for ownership verification
 */
export interface WatermarkOptions {
    algorithm?: string;
    strength?: number;
    position?: 'beginning' | 'end' | 'middle' | 'random';
    encoding?: 'hex' | 'base64' | 'utf8';
}
export interface WatermarkResult {
    watermarkedData: Buffer;
    watermark: string;
    position: number;
    algorithm: string;
}
export interface WatermarkVerification {
    isValid: boolean;
    confidence: number;
    watermark?: string;
    position?: number;
}
export declare class WatermarkService {
    private options;
    constructor(options?: WatermarkOptions);
    /**
     * Generate a watermark based on model data and owner info
     */
    generateWatermark(modelData: Buffer, ownerInfo: string, customData?: string): string;
    /**
     * Add watermark to model data
     */
    addWatermark(modelData: Buffer, ownerInfo: string, customData?: string, options?: Partial<WatermarkOptions>): Promise<WatermarkResult>;
    /**
     * Verify watermark in model data
     */
    verifyWatermark(watermarkedData: Buffer, ownerInfo: string, expectedWatermark?: string, options?: Partial<WatermarkOptions>): Promise<WatermarkVerification>;
    /**
     * Remove watermark from model data
     */
    removeWatermark(watermarkedData: Buffer, watermark: string, position: number, options?: Partial<WatermarkOptions>): Promise<Buffer>;
    /**
     * Add multiple watermarks for enhanced security
     */
    addMultipleWatermarks(modelData: Buffer, ownerInfo: string, count?: number, customData?: string): Promise<{
        watermarkedData: Buffer;
        watermarks: Array<{
            watermark: string;
            position: number;
        }>;
    }>;
    /**
     * Verify multiple watermarks
     */
    verifyMultipleWatermarks(watermarkedData: Buffer, ownerInfo: string, expectedWatermarks: Array<{
        watermark: string;
        position: number;
    }>): Promise<{
        isValid: boolean;
        verifiedCount: number;
        totalCount: number;
        confidence: number;
    }>;
    /**
     * Generate a steganographic watermark (hidden in model weights)
     */
    addSteganographicWatermark(modelData: Buffer, ownerInfo: string, strength?: number): Promise<WatermarkResult>;
    /**
     * Verify steganographic watermark
     */
    verifySteganographicWatermark(watermarkedData: Buffer, ownerInfo: string, strength?: number): Promise<WatermarkVerification>;
    /**
     * Get watermark length based on encoding
     */
    private getWatermarkLength;
    /**
     * Get possible watermark positions
     */
    private getPossiblePositions;
    /**
     * Convert string to bits
     */
    private stringToBits;
    /**
     * Convert bits to string
     */
    private bitsToString;
    /**
     * Set least significant bit
     */
    private setLSB;
    /**
     * Get least significant bit
     */
    private getLSB;
    /**
     * Calculate string similarity
     */
    private calculateSimilarity;
}
//# sourceMappingURL=watermark.service.d.ts.map