/**
 * API Service
 * Handles all API calls to the backend
 */

const API_BASE_URL = '/api';

class ApiService {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Models API
    async getModels(filters = {}) {
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                queryParams.append(key, filters[key]);
            }
        });

        const endpoint = `/models${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        return this.request(endpoint);
    }

    async getModel(modelId) {
        return this.request(`/models/${modelId}`);
    }

    async publishModel(formData) {
        return this.request('/models/publish', {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type for FormData
        });
    }

    async purchaseModel(modelId, buyerAddress, price) {
        return this.request('/models/purchase', {
            method: 'POST',
            body: JSON.stringify({
                modelId,
                buyerAddress,
                price
            })
        });
    }

    async downloadModel(escrowId, encryptionKey) {
        const response = await fetch(`${API_BASE_URL}/models/download?escrowId=${escrowId}&encryptionKey=${encodeURIComponent(encryptionKey)}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Download failed');
        }

        return response;
    }

    async getPurchasedModels(buyerAddress) {
        return this.request(`/models/purchases?buyer=${buyerAddress}`);
    }

    // Blockchain API
    async getBlockchainStatus() {
        return this.request('/blockchain/status');
    }

    async getTransactionStatus(txnId) {
        return this.request(`/blockchain/transaction/${txnId}`);
    }

    async getAccountBalance(address) {
        return this.request(`/blockchain/account/${address}`);
    }

    async waitForConfirmation(txnId, timeout = 10000) {
        return this.request('/blockchain/wait-confirmation', {
            method: 'POST',
            body: JSON.stringify({ txnId, timeout })
        });
    }

    // Escrow API
    async releasePayment(escrowId, publisherPrivateKey, encryptionKey) {
        return this.request('/models/escrow/release', {
            method: 'POST',
            body: JSON.stringify({
                escrowId,
                publisherPrivateKey,
                encryptionKey
            })
        });
    }

    async refundPayment(escrowId, buyerPrivateKey) {
        return this.request('/models/escrow/refund', {
            method: 'POST',
            body: JSON.stringify({
                escrowId,
                buyerPrivateKey
            })
        });
    }
}

// Export singleton instance
window.apiService = new ApiService();
