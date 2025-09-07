"use strict";
/**
 * IPFS Service for DeSciFi
 * Handles file upload and download to IPFS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSService = void 0;
const ipfs_http_client_1 = require("ipfs-http-client");
const stream_1 = require("stream");
class IPFSService {
    constructor(config) {
        this.config = config;
        this.client = (0, ipfs_http_client_1.create)({
            host: config.host,
            port: config.port,
            protocol: config.protocol,
            headers: config.headers
        });
    }
    /**
     * Upload file to IPFS
     */
    async uploadFile(fileBuffer, options) {
        try {
            const uploadOptions = {
                pin: options?.pin ?? true,
                wrapWithDirectory: options?.wrapWithDirectory ?? false,
                progress: options?.progress
            };
            const result = await this.client.add(fileBuffer, uploadOptions);
            return {
                cid: result.cid.toString(),
                size: result.size,
                path: result.path
            };
        }
        catch (error) {
            throw new Error(`Failed to upload file to IPFS: ${error.message}`);
        }
    }
    /**
     * Upload file from stream to IPFS
     */
    async uploadFileFromStream(stream, options) {
        try {
            const uploadOptions = {
                pin: options?.pin ?? true,
                wrapWithDirectory: options?.wrapWithDirectory ?? false,
                progress: options?.progress
            };
            const result = await this.client.add(stream, uploadOptions);
            return {
                cid: result.cid.toString(),
                size: result.size,
                path: result.path
            };
        }
        catch (error) {
            throw new Error(`Failed to upload stream to IPFS: ${error.message}`);
        }
    }
    /**
     * Download file from IPFS
     */
    async downloadFile(cid) {
        try {
            const chunks = [];
            for await (const chunk of this.client.cat(cid)) {
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks);
            // Get file stats
            const stats = await this.client.stat(cid);
            return {
                data,
                cid,
                size: stats.size
            };
        }
        catch (error) {
            throw new Error(`Failed to download file from IPFS: ${error.message}`);
        }
    }
    /**
     * Download file as stream from IPFS
     */
    async downloadFileAsStream(cid) {
        try {
            const stream = this.client.cat(cid);
            return stream_1.Readable.from(stream);
        }
        catch (error) {
            throw new Error(`Failed to download file stream from IPFS: ${error.message}`);
        }
    }
    /**
     * Pin file to IPFS
     */
    async pinFile(cid) {
        try {
            await this.client.pin.add(cid);
        }
        catch (error) {
            throw new Error(`Failed to pin file: ${error.message}`);
        }
    }
    /**
     * Unpin file from IPFS
     */
    async unpinFile(cid) {
        try {
            await this.client.pin.rm(cid);
        }
        catch (error) {
            throw new Error(`Failed to unpin file: ${error.message}`);
        }
    }
    /**
     * Get file information from IPFS
     */
    async getFileInfo(cid) {
        try {
            const stats = await this.client.stat(cid);
            return {
                cid: stats.cid.toString(),
                size: stats.size,
                cumulativeSize: stats.cumulativeSize,
                blocks: stats.blocks,
                type: stats.type
            };
        }
        catch (error) {
            throw new Error(`Failed to get file info: ${error.message}`);
        }
    }
    /**
     * Check if file exists in IPFS
     */
    async fileExists(cid) {
        try {
            await this.client.stat(cid);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Upload JSON metadata to IPFS
     */
    async uploadMetadata(metadata) {
        try {
            const jsonString = JSON.stringify(metadata, null, 2);
            const buffer = Buffer.from(jsonString, 'utf8');
            return await this.uploadFile(buffer, {
                pin: true,
                wrapWithDirectory: false
            });
        }
        catch (error) {
            throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
        }
    }
    /**
     * Download and parse JSON metadata from IPFS
     */
    async downloadMetadata(cid) {
        try {
            const result = await this.downloadFile(cid);
            const jsonString = result.data.toString('utf8');
            return JSON.parse(jsonString);
        }
        catch (error) {
            throw new Error(`Failed to download metadata from IPFS: ${error.message}`);
        }
    }
    /**
     * Upload multiple files as a directory
     */
    async uploadDirectory(files, options) {
        try {
            const uploadOptions = {
                pin: options?.pin ?? true,
                wrapWithDirectory: true,
                progress: options?.progress
            };
            const result = await this.client.addAll(files, uploadOptions);
            // Get the last result (directory root)
            let lastResult;
            for await (const item of result) {
                lastResult = item;
            }
            if (!lastResult) {
                throw new Error('No files were uploaded');
            }
            return {
                cid: lastResult.cid.toString(),
                size: lastResult.size,
                path: lastResult.path
            };
        }
        catch (error) {
            throw new Error(`Failed to upload directory to IPFS: ${error.message}`);
        }
    }
    /**
     * Get pinned files
     */
    async getPinnedFiles() {
        try {
            const pins = [];
            for await (const pin of this.client.pin.ls()) {
                pins.push({
                    cid: pin.cid.toString(),
                    type: pin.type,
                    size: pin.size || 0
                });
            }
            return pins;
        }
        catch (error) {
            throw new Error(`Failed to get pinned files: ${error.message}`);
        }
    }
    /**
     * Test IPFS connection
     */
    async testConnection() {
        try {
            await this.client.version();
            return true;
        }
        catch (error) {
            console.error('IPFS connection test failed:', error);
            return false;
        }
    }
}
exports.IPFSService = IPFSService;
//# sourceMappingURL=ipfs.service.js.map