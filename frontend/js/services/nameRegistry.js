/**
 * Name Registry Service for DeSciFi
 * Handles interaction with the Name Registry API and smart contract
 */

class NameRegistryService {
    constructor() {
        this.baseUrl = 'http://localhost:3002/api/names';
        this.registeredNames = new Map();
    }

    /**
     * Get marketplace listing of registered names
     */
    async getMarketplace() {
        try {
            const response = await fetch(`${this.baseUrl}/marketplace`);
            const data = await response.json();
            
            if (data.success) {
                // Cache registered names
                data.names.forEach(name => {
                    this.registeredNames.set(name.name, name);
                });
                return data.names;
            } else {
                throw new Error(data.error || 'Failed to fetch marketplace');
            }
        } catch (error) {
            console.error('Marketplace fetch error:', error);
            throw error;
        }
    }

    /**
     * Resolve a name to get owner, CID, and price
     */
    async resolveName(name) {
        try {
            const response = await fetch(`${this.baseUrl}/${encodeURIComponent(name)}/resolve`);
            const data = await response.json();
            
            if (data.success) {
                // Cache resolved name
                this.registeredNames.set(name, data);
                return data;
            } else {
                throw new Error(data.error || 'Name not found');
            }
        } catch (error) {
            console.error('Name resolution error:', error);
            throw error;
        }
    }

    /**
     * Check if a name exists
     */
    async nameExists(name) {
        try {
            const response = await fetch(`${this.baseUrl}/${encodeURIComponent(name)}/exists`);
            const data = await response.json();
            
            if (data.success) {
                return data.exists;
            } else {
                throw new Error(data.error || 'Failed to check name existence');
            }
        } catch (error) {
            console.error('Name exists check error:', error);
            return false;
        }
    }

    /**
     * Register a new name (requires wallet connection)
     */
    async registerName(name, cid, priceAlgos, walletMnemonic) {
        try {
            const priceMicroAlgos = Math.floor(priceAlgos * 1_000_000);
            
            const response = await fetch(`${this.baseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    cid: cid,
                    price: priceMicroAlgos,
                    senderMnemonic: walletMnemonic
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Clear cache to force refresh
                this.registeredNames.clear();
                return data;
            } else {
                throw new Error(data.error || 'Failed to register name');
            }
        } catch (error) {
            console.error('Name registration error:', error);
            throw error;
        }
    }

    /**
     * Get registry contract information
     */
    async getRegistryInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/info`);
            const data = await response.json();
            
            if (data.success) {
                return data.contract;
            } else {
                throw new Error(data.error || 'Failed to get registry info');
            }
        } catch (error) {
            console.error('Registry info error:', error);
            throw error;
        }
    }

    /**
     * Validate name format
     */
    validateName(name) {
        if (!name || name.length === 0) {
            return { valid: false, error: 'Name cannot be empty' };
        }
        
        if (name.length > 64) {
            return { valid: false, error: 'Name cannot be longer than 64 characters' };
        }
        
        // Check for allowed characters (letters, numbers, dots, hyphens)
        const namePattern = /^[a-z0-9.-]+$/;
        if (!namePattern.test(name.toLowerCase())) {
            return { valid: false, error: 'Name can only contain letters, numbers, dots, and hyphens' };
        }
        
        // Check for .desci suffix (recommended but not required)
        if (!name.toLowerCase().endsWith('.desci')) {
            return { 
                valid: true, 
                warning: 'Consider using .desci suffix for DeSci names' 
            };
        }
        
        return { valid: true };
    }

    /**
     * Format name for display
     */
    formatName(name) {
        return name.toLowerCase();
    }

    /**
     * Format price for display
     */
    formatPrice(priceAlgo) {
        return `${priceAlgo.toFixed(2)} ALGO`;
    }

    /**
     * Get cached name data
     */
    getCachedName(name) {
        return this.registeredNames.get(name);
    }

    /**
     * Clear name cache
     */
    clearCache() {
        this.registeredNames.clear();
    }
}

// Make service globally available
window.nameRegistryService = new NameRegistryService();

console.log('✅ Name Registry Service initialized');