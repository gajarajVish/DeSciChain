/**
 * Simple API Service for DeSciFi
 * Works with the test backend endpoints
 */

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:3001/api';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Generic request handler with error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        // Don't set Content-Type for FormData, let browser handle it
        const headers = options.body instanceof FormData 
            ? { ...options.headers }  // Skip default headers for FormData
            : { ...this.defaultHeaders, ...options.headers };
        
        const config = {
            headers,
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
                return data.success !== undefined ? data : { success: true, data: data };
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
        console.log('🌐 Making API request to:', `${this.baseURL}/models`);
        try {
            const response = await this.request('/models');
            console.log('📦 API response:', response);
            return response;
        } catch (error) {
            console.warn('⚠️ Backend not available, returning mock data for demo:', error.message);
            // Return mock data for demo purposes
            return {
                success: true,
                data: this.getMockModels()
            };
        }
    }

    /**
     * Generate mock models for demo when backend is not available
     */
    getMockModels() {
        return [
            {
                id: 'model_' + Date.now(),
                name: 'Radiology Diagnostic AI',
                description: 'FDA-validated chest X-ray pneumonia detection model with 94% accuracy. Trained on 100,000+ medical images.',
                publisherAddress: 'SELLER1WALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789A',
                creator: 'SELLER1WALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789A',
                framework: 'PyTorch',
                type: 'Diagnostic Imaging',
                price: 5.0,
                priceAlgo: 5.0,
                licenseTerms: 'MIT',
                tags: ['radiology', 'pneumonia', 'fda-approved', 'medical-imaging'],
                fileSize: 45000000,
                encrypted: true,
                createdAt: new Date().toISOString(),
                status: 'published',
                downloads: 127,
                rating: 4.8,
                accuracy: 94.2
            },
            {
                id: 'model_' + (Date.now() + 1),
                name: 'Genomics Variant Classifier',
                description: 'Deep learning model for classifying genetic variants in cancer research. Supports BRCA1/BRCA2 analysis.',
                publisherAddress: 'SELLER2WALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789B',
                creator: 'SELLER2WALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789B',
                framework: 'TensorFlow',
                type: 'Genomics',
                price: 8.5,
                priceAlgo: 8.5,
                licenseTerms: 'Apache-2.0',
                tags: ['genomics', 'cancer', 'brca', 'variant-classification'],
                fileSize: 78000000,
                encrypted: true,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                status: 'published',
                downloads: 89,
                rating: 4.6,
                accuracy: 91.7
            },
            {
                id: 'model_' + (Date.now() + 2),
                name: 'Drug Discovery Molecular Predictor',
                description: 'AI model for predicting molecular properties in drug discovery. Trained on ChEMBL database.',
                publisherAddress: 'SELLER3WALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789C',
                creator: 'SELLER3WALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789C',
                framework: 'Scikit-Learn',
                type: 'Drug Discovery',
                price: 12.0,
                priceAlgo: 12.0,
                licenseTerms: 'GPL-3.0',
                tags: ['drug-discovery', 'molecules', 'chembl', 'prediction'],
                fileSize: 34000000,
                encrypted: true,
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                status: 'published',
                downloads: 245,
                rating: 4.9,
                accuracy: 87.3
            }
        ];
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
        console.log('🌐 API: Sending prepare-publish request with FormData');
        console.log('🌐 API: FormData type:', formData.constructor.name);
        
        return this.request('/models/prepare-publish', {
            method: 'POST',
            body: formData
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
        try {
            return await this.request('/models/purchase', {
                method: 'POST',
                body: JSON.stringify(purchaseData)
            });
        } catch (error) {
            console.warn('⚠️ Backend not available, simulating purchase for demo:', error.message);
            // Simulate successful purchase for demo
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
            return {
                success: true,
                data: {
                    purchaseId: 'demo_purchase_' + Date.now(),
                    modelId: purchaseData.modelId,
                    buyerAddress: purchaseData.buyerAddress,
                    price: purchaseData.price,
                    transactionId: purchaseData.transactionId,
                    status: 'completed',
                    completedAt: new Date().toISOString()
                }
            };
        }
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

    /**
     * Get user's purchased models
     */
    async getUserPurchases(address) {
        return this.request(`/models/purchases/${address}`);
    }

    /**
     * Get user's published models
     */
    async getUserModels(address) {
        return this.request(`/models/user/${address}`);
    }

    /**
     * Resolve address to human-readable name
     */
    async resolveAddressToName(address) {
        return this.request(`/names/resolve-address/${address}`);
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