/**
 * IPFS Service for DeSciFi
 * Handles file upload and download to IPFS
 */
import { Readable } from 'stream';
export interface IPFSConfig {
    host: string;
    port: number;
    protocol: string;
    headers?: Record<string, string>;
}
export interface UploadResult {
    cid: string;
    size: number;
    path: string;
}
export interface DownloadResult {
    data: Buffer;
    cid: string;
    size: number;
}
export declare class IPFSService {
    private client;
    private config;
    constructor(config: IPFSConfig);
    /**
     * Upload file to IPFS
     */
    uploadFile(fileBuffer: Buffer, options?: {
        pin?: boolean;
        wrapWithDirectory?: boolean;
        progress?: (progress: number) => void;
    }): Promise<UploadResult>;
    /**
     * Upload file from stream to IPFS
     */
    uploadFileFromStream(stream: Readable, options?: {
        pin?: boolean;
        wrapWithDirectory?: boolean;
        progress?: (progress: number) => void;
    }): Promise<UploadResult>;
    /**
     * Download file from IPFS
     */
    downloadFile(cid: string): Promise<DownloadResult>;
    /**
     * Download file as stream from IPFS
     */
    downloadFileAsStream(cid: string): Promise<Readable>;
    /**
     * Pin file to IPFS
     */
    pinFile(cid: string): Promise<void>;
    /**
     * Unpin file from IPFS
     */
    unpinFile(cid: string): Promise<void>;
    /**
     * Get file information from IPFS
     */
    getFileInfo(cid: string): Promise<{
        cid: string;
        size: number;
        cumulativeSize: number;
        blocks: number;
        type: string;
    }>;
    /**
     * Check if file exists in IPFS
     */
    fileExists(cid: string): Promise<boolean>;
    /**
     * Upload JSON metadata to IPFS
     */
    uploadMetadata(metadata: Record<string, any>): Promise<UploadResult>;
    /**
     * Download and parse JSON metadata from IPFS
     */
    downloadMetadata(cid: string): Promise<Record<string, any>>;
    /**
     * Upload multiple files as a directory
     */
    uploadDirectory(files: Array<{
        path: string;
        content: Buffer;
    }>, options?: {
        pin?: boolean;
        progress?: (progress: number) => void;
    }): Promise<UploadResult>;
    /**
     * Get pinned files
     */
    getPinnedFiles(): Promise<Array<{
        cid: string;
        type: string;
        size: number;
    }>>;
    /**
     * Test IPFS connection
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=ipfs.service.d.ts.map