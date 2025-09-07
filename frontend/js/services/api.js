/**
 * Simple API Service for DeSciChain
 * Works with the test backend endpoints
 */

class APIService {
    constructor() {
        this.baseURL = '/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Generic request handler with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Handle different response types
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && (contentType.includes('application/zip') || contentType.includes('application/octet-stream'))) {
                // For file downloads
                data = await response.blob();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = typeof data === 'object' ? data.error : data;
                throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
            }

            // For successful JSON responses, return the data
            if (typeof data === 'object' && data.success !== undefined) {
                return data;
            }

            // For JSON array responses (like models list)
            if (Array.isArray(data)) {
                return { success: true, data: data };
            }

            // For JSON object responses
            if (typeof data === 'object') {
                return { success: true, data: data };
            }

            // For non-JSON responses (like downloads), return the response
            return { success: true, data, response };

        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Models API

    /**
     * Get all published models
     */
    async get(endpoint) {
        return this.request(endpoint);
    }

    /**
     * Get all published models
     */
    async getModels() {
        return this.request('/models');
    }

    /**
     * Get specific model by ID
     */
    async getModel(modelId) {
        return this.request(`/models/${modelId}`);
    }

    /**
     * Prepare model for publishing
     */
    async prepareModelPublish(formData) {
        return this.request('/models/prepare-publish', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }

    /**
     * Publish model with file upload
     */
    async publishModel(formData) {
        return this.request('/models/publish', {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type for FormData
        });
    }

    /**
     * Purchase model
     */
    async purchaseModel(purchaseData) {
        return this.request('/models/purchase', {
            method: 'POST',
            body: JSON.stringify(purchaseData)
        });
    }

    /**
     * Download model
     */
    async downloadModel(downloadData) {
        const response = await this.request('/models/download', {
            method: 'POST',
            body: JSON.stringify(downloadData)
        });

        return response;
    }

    // Blockchain API

    /**
     * Get blockchain network status
     */
    async getBlockchainStatus() {
        return this.request('/blockchain/status');
    }

    /**
     * Check transaction status
     */
    async getTransactionStatus(txnId) {
        return this.request(`/blockchain/transaction/${txnId}`);
    }

    /**
     * Get account balance and information
     */
    async getAccountInfo(address) {
        return this.request(`/blockchain/account/${address}`);
    }

    // Utility Methods

    /**
     * Health check
     */
    async healthCheck() {
        return this.request('/health');
    }

    /**
     * Create download link for blob data
     */
    createDownloadLink(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                                type === 'error' ? 'fa-times-circle' : 
                                'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }
}

// Export singleton instance
window.APIService = APIService;
window.apiService = new APIService();