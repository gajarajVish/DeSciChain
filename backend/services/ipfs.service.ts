/**
 * IPFS Service for DeSciChain
 * Handles file upload and download to IPFS
 */

import { create, IPFSHTTPClient } from 'ipfs-http-client';
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

export class IPFSService {
  private client: IPFSHTTPClient;
  private config: IPFSConfig;

  constructor(config: IPFSConfig) {
    this.config = config;
    this.client = create({
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      headers: config.headers
    });
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(fileBuffer: Buffer, options?: {
    pin?: boolean;
    wrapWithDirectory?: boolean;
    progress?: (progress: number) => void;
  }): Promise<UploadResult> {
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
    } catch (error) {
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload file from stream to IPFS
   */
  async uploadFileFromStream(
    stream: Readable, 
    options?: {
      pin?: boolean;
      wrapWithDirectory?: boolean;
      progress?: (progress: number) => void;
    }
  ): Promise<UploadResult> {
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
    } catch (error) {
      throw new Error(`Failed to upload stream to IPFS: ${error.message}`);
    }
  }

  /**
   * Download file from IPFS
   */
  async downloadFile(cid: string): Promise<DownloadResult> {
    try {
      const chunks: Uint8Array[] = [];
      
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
    } catch (error) {
      throw new Error(`Failed to download file from IPFS: ${error.message}`);
    }
  }

  /**
   * Download file as stream from IPFS
   */
  async downloadFileAsStream(cid: string): Promise<Readable> {
    try {
      const stream = this.client.cat(cid);
      return Readable.from(stream);
    } catch (error) {
      throw new Error(`Failed to download file stream from IPFS: ${error.message}`);
    }
  }

  /**
   * Pin file to IPFS
   */
  async pinFile(cid: string): Promise<void> {
    try {
      await this.client.pin.add(cid);
    } catch (error) {
      throw new Error(`Failed to pin file: ${error.message}`);
    }
  }

  /**
   * Unpin file from IPFS
   */
  async unpinFile(cid: string): Promise<void> {
    try {
      await this.client.pin.rm(cid);
    } catch (error) {
      throw new Error(`Failed to unpin file: ${error.message}`);
    }
  }

  /**
   * Get file information from IPFS
   */
  async getFileInfo(cid: string): Promise<{
    cid: string;
    size: number;
    cumulativeSize: number;
    blocks: number;
    type: string;
  }> {
    try {
      const stats = await this.client.stat(cid);
      
      return {
        cid: stats.cid.toString(),
        size: stats.size,
        cumulativeSize: stats.cumulativeSize,
        blocks: stats.blocks,
        type: stats.type
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Check if file exists in IPFS
   */
  async fileExists(cid: string): Promise<boolean> {
    try {
      await this.client.stat(cid);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadMetadata(metadata: Record<string, any>): Promise<UploadResult> {
    try {
      const jsonString = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');
      
      return await this.uploadFile(buffer, {
        pin: true,
        wrapWithDirectory: false
      });
    } catch (error) {
      throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
    }
  }

  /**
   * Download and parse JSON metadata from IPFS
   */
  async downloadMetadata(cid: string): Promise<Record<string, any>> {
    try {
      const result = await this.downloadFile(cid);
      const jsonString = result.data.toString('utf8');
      
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to download metadata from IPFS: ${error.message}`);
    }
  }

  /**
   * Upload multiple files as a directory
   */
  async uploadDirectory(
    files: Array<{ path: string; content: Buffer }>,
    options?: {
      pin?: boolean;
      progress?: (progress: number) => void;
    }
  ): Promise<UploadResult> {
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
    } catch (error) {
      throw new Error(`Failed to upload directory to IPFS: ${error.message}`);
    }
  }

  /**
   * Get pinned files
   */
  async getPinnedFiles(): Promise<Array<{ cid: string; type: string; size: number }>> {
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
    } catch (error) {
      throw new Error(`Failed to get pinned files: ${error.message}`);
    }
  }

  /**
   * Test IPFS connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.version();
      return true;
    } catch (error) {
      console.error('IPFS connection test failed:', error);
      return false;
    }
  }
}
