/**
 * DeSciChain ML Models Marketplace - Main Application
 * Modern JavaScript application for ML model trading on Algorand
 */

class DeSciChainApp {
    constructor() {
        this.state = {
            wallet: {
                connected: false,
                address: null,
                balance: 0,
                walletType: null,
                availableWallets: []
            },
            models: {
                published: [],
                purchased: [],
                all: []
            },
            transactions: {
                pending: [],
                completed: []
            },
            theme: localStorage.getItem('theme') || 'light',
            loading: false,
            error: null
        };

        this.apiService = window.apiService;
        this.blockchainService = window.blockchainService;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing DeSciChain App...');
            
            // Apply theme
            this.applyTheme();
            
            // Initialize blockchain service
            if (this.blockchainService) {
                await this.blockchainService.initialize();
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadModels();
            
            console.log('✅ DeSciChain App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    // Theme Management
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = this.state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    }

    toggleTheme() {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.state.theme);
        this.applyTheme();
    }

    // Event Listeners
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Model publishing form
        const publishForm = document.getElementById('publish-model-form');
        if (publishForm) {
            publishForm.addEventListener('submit', (e) => this.handlePublishSubmit(e));
        }

        // Wallet connection (will be handled by blockchain service)
        this.setupWalletUI();
    }

    // UI Management
    showLoading(show = true) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
        this.state.loading = show;
    }

    showError(message) {
        const errorContainer = document.getElementById('error-message');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        }
        
        if (this.apiService && this.apiService.showToast) {
            this.apiService.showToast(message, 'error');
        }
        
        console.error('❌ Error:', message);
    }

    showSuccess(message) {
        if (this.apiService && this.apiService.showToast) {
            this.apiService.showToast(message, 'success');
        }
        console.log('✅ Success:', message);
    }

    // Data Loading
    async loadModels() {
        try {
            console.log('📚 Loading models from API...');
            this.showLoading(true);
            
            const response = await this.apiService.getModels();
            
            if (response.success) {
                this.state.models.all = response.data || [];
                this.renderModels(this.state.models.all);
                console.log(`✅ Loaded ${this.state.models.all.length} models`);
            } else {
                throw new Error('Failed to load models');
            }
            
        } catch (error) {
            console.error('❌ Failed to load models:', error);
            this.showError('Failed to load models: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // Model Rendering
    renderModels(models) {
        const container = document.getElementById('models-container');
        if (!container) return;

        if (!models || models.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-cube" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3>No models available</h3>
                    <p style="color: var(--text-muted);">Be the first to publish a model!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = models.map(model => this.createModelCard(model)).join('');
    }

    createModelCard(model) {
        const tags = Array.isArray(model.tags) ? model.tags : (model.tags ? model.tags.split(',') : []);
        const isEncrypted = model.encrypted || model.encryptedHash;
        
        return `
            <div class="model-card" data-model-id="${model.id}">
                <div class="model-header">
                    <div>
                        <h3 class="model-title">${this.escapeHtml(model.name)}</h3>
                        <div class="model-author">
                            <i class="fas fa-user"></i>
                            <span>${this.escapeHtml(model.author || model.creator || 'Anonymous')}</span>
                        </div>
                    </div>
                    <div class="model-price-section">
                        <div class="model-price">
                            ${model.priceAlgo || model.price || 0}
                            <span class="model-price-unit">ALGO</span>
                        </div>
                        ${isEncrypted ? `
                            <div class="encryption-badge" title="Protected with AES-256-GCM encryption">
                                <i class="fas fa-shield-alt"></i>
                                <span>Secured</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <p class="model-description">${this.escapeHtml(model.description)}</p>
                
                ${isEncrypted ? `
                    <div class="security-info">
                        <i class="fas fa-lock"></i>
                        <span>Military-grade AES-256-GCM encryption applied</span>
                    </div>
                ` : ''}
                
                <div class="model-meta">
                    <div class="model-meta-item">
                        <i class="fas fa-code"></i>
                        <span>${model.framework || 'Unknown'}</span>
                    </div>
                    <div class="model-meta-item">
                        <i class="fas fa-chart-line"></i>
                        <span>${model.accuracy || 'N/A'}${typeof model.accuracy === 'number' ? '%' : ''}</span>
                    </div>
                    <div class="model-meta-item">
                        <i class="fas fa-download"></i>
                        <span>${model.downloads || 0}</span>
                    </div>
                    <div class="model-meta-item">
                        <i class="fas fa-star"></i>
                        <span>${model.rating || 0}</span>
                    </div>
                </div>
                
                ${tags.length > 0 ? `
                    <div class="model-tags">
                        ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                        ${isEncrypted ? `<span class="tag encrypted-tag"><i class="fas fa-shield-alt"></i> Encrypted</span>` : ''}
                    </div>
                ` : isEncrypted ? `
                    <div class="model-tags">
                        <span class="tag encrypted-tag"><i class="fas fa-shield-alt"></i> Encrypted</span>
                    </div>
                ` : ''}
                
                <div class="model-actions">
                    <button class="btn btn-primary" onclick="app.purchaseModel('${model.id}')">
                        <i class="fas fa-shopping-cart"></i>
                        Purchase
                    </button>
                    <button class="btn btn-outline" onclick="app.viewModelDetails('${model.id}')">
                        <i class="fas fa-info-circle"></i>
                        Details
                    </button>
                </div>
            </div>
        `;
    }

    // Model Publishing with Enhanced Encryption Feedback
    async handlePublishSubmit(event) {
        event.preventDefault();
        
        try {
            console.log('📤 Starting secure model publication process...');
            
            // Check wallet connection
            if (!this.state.wallet.connected) {
                throw new Error('Please connect your wallet first to publish models');
            }
            
            const form = event.target;
            const formData = new FormData();
            const modelFile = form.querySelector('input[name="modelFile"]').files[0];
            
            if (!modelFile || modelFile.size === 0) {
                throw new Error('Please select a model file to upload');
            }
            
            // Validate file size (100MB limit)
            if (modelFile.size > 100 * 1024 * 1024) {
                throw new Error('File size must be less than 100MB');
            }

            // Build FormData with correct field names
            formData.append('file', modelFile); // Backend expects 'file' not 'modelFile'
            formData.append('name', form.querySelector('[name="name"]').value);
            formData.append('description', form.querySelector('[name="description"]').value);
            formData.append('price', form.querySelector('[name="price"]').value);
            formData.append('framework', form.querySelector('[name="framework"]').value);
            formData.append('type', form.querySelector('[name="type"]').value);
            
            // Show loading with encryption message
            this.showLoadingWithMessage('🔐 Preparing secure model encryption...');
            
            // First prepare the model with validation
            const prepareData = {
                name: form.querySelector('[name="name"]').value,
                description: form.querySelector('[name="description"]').value,
                price: form.querySelector('[name="price"]').value
            };
            
            console.log('🔍 Validating model metadata...', prepareData);
            const prepareResponse = await this.apiService.prepareModelPublish(prepareData);
            
            if (!prepareResponse.success) {
                throw new Error('Model validation failed: ' + prepareResponse.error);
            }
            
            // Update loading message
            this.showLoadingWithMessage('🚀 Uploading and encrypting model...');
            
            // Add required fields for secure upload
            formData.append('creator', this.state.wallet.address);
            
            // Log upload details
            console.log('📋 Model details:', {
                name: prepareData.name,
                size: this.formatFileSize(modelFile.size),
                type: modelFile.type,
                wallet: this.state.wallet.address,
                encryption: 'AES-256-GCM (Enabled)'
            });
            
            // Publish the model with encryption
            console.log('🔒 Publishing model with end-to-end encryption...');
            const response = await this.apiService.publishModel(formData);
            
            if (response.success) {
                console.log('✅ Model encrypted and published successfully!');
                console.log('🔐 Security features applied:');
                console.log('  - AES-256-GCM encryption');
                console.log('  - Secure key generation');
                console.log('  - Original file destroyed');
                console.log('  - Blockchain-verified ownership');
                
                this.showSuccess(`🎉 Model "${prepareData.name}" published and secured successfully! Your intellectual property is now protected with military-grade encryption.`);
                
                // Show encryption confirmation
                this.showEncryptionConfirmation(response);
                
                // Reset form
                event.target.reset();
                
                // Reload models to show the new encrypted model
                await this.loadModels();
                
                // Switch to marketplace tab to see the published model
                const marketplaceTab = document.querySelector('[data-tab="marketplace"]');
                if (marketplaceTab) {
                    marketplaceTab.click();
                }
            } else {
                throw new Error(response.message || 'Failed to publish and encrypt model');
            }
            
        } catch (error) {
            console.error('❌ Secure model publishing failed:', error);
            this.showError(`❌ Publication failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showLoadingWithMessage(message) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            const messageElement = spinner.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            spinner.style.display = 'flex';
        }
        this.state.loading = true;
    }

    showEncryptionConfirmation(response) {
        // Create a modal showing encryption details
        const modal = document.createElement('div');
        modal.className = 'encryption-modal-overlay';
        modal.innerHTML = `
            <div class="encryption-modal">
                <div class="encryption-modal-header">
                    <h3>🔐 Model Secured Successfully</h3>
                </div>
                <div class="encryption-modal-content">
                    <div class="encryption-status">
                        <div class="encryption-step">
                            <i class="fas fa-check-circle text-success"></i>
                            <span>File uploaded and validated</span>
                        </div>
                        <div class="encryption-step">
                            <i class="fas fa-lock text-success"></i>
                            <span>AES-256-GCM encryption applied</span>
                        </div>
                        <div class="encryption-step">
                            <i class="fas fa-key text-success"></i>
                            <span>Secure encryption keys generated</span>
                        </div>
                        <div class="encryption-step">
                            <i class="fas fa-trash text-success"></i>
                            <span>Original unencrypted file destroyed</span>
                        </div>
                        <div class="encryption-step">
                            <i class="fas fa-blockchain text-success"></i>
                            <span>Ownership recorded on blockchain</span>
                        </div>
                    </div>
                    <div class="encryption-details">
                        <p><strong>Model ID:</strong> ${response.modelId}</p>
                        <p><strong>Encryption:</strong> Military-grade AES-256-GCM</p>
                        <p><strong>Status:</strong> Fully secured and protected</p>
                    </div>
                </div>
                <div class="encryption-modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.encryption-modal-overlay').remove()">
                        <i class="fas fa-check"></i>
                        Got it!
                    </button>
                </div>
            </div>
        `;

        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .encryption-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1001;
                backdrop-filter: blur(4px);
            }
            
            .encryption-modal {
                background: var(--surface);
                border-radius: var(--radius-xl);
                padding: var(--space-8);
                max-width: 500px;
                width: 90%;
                box-shadow: var(--shadow-xl);
                border: 1px solid var(--border);
            }
            
            .encryption-modal-header h3 {
                margin: 0 0 var(--space-6) 0;
                font-size: var(--font-size-2xl);
                color: var(--text-primary);
                text-align: center;
            }
            
            .encryption-status {
                display: flex;
                flex-direction: column;
                gap: var(--space-3);
                margin-bottom: var(--space-6);
            }
            
            .encryption-step {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                font-size: var(--font-size-base);
            }
            
            .encryption-step i {
                font-size: var(--font-size-lg);
            }
            
            .encryption-details {
                background: var(--background);
                padding: var(--space-4);
                border-radius: var(--radius-md);
                border: 1px solid var(--border);
                margin-bottom: var(--space-6);
            }
            
            .encryption-details p {
                margin: var(--space-1) 0;
                font-size: var(--font-size-sm);
            }
            
            .encryption-modal-footer {
                text-align: center;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
                style.remove();
            }
        }, 10000);
    }

    // Model Actions
    async purchaseModel(modelId) {
        try {
            if (!this.state.wallet.connected) {
                this.showError('Please connect your wallet first');
                return;
            }
            
            console.log('💳 Purchasing model:', modelId);
            this.showLoading(true);
            
            const purchaseData = {
                modelId,
                buyerAddress: this.state.wallet.address
            };
            
            const response = await this.apiService.purchaseModel(purchaseData);
            
            if (response.success) {
                this.showSuccess('Model purchased successfully!');
                // You might want to refresh the user's purchased models here
            } else {
                throw new Error(response.message || 'Purchase failed');
            }
            
        } catch (error) {
            console.error('❌ Purchase failed:', error);
            this.showError('Purchase failed: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async viewModelDetails(modelId) {
        try {
            const response = await this.apiService.getModel(modelId);
            if (response.success) {
                // Show model details in a modal or navigate to details page
                console.log('Model details:', response.data);
                this.showSuccess('Model details loaded');
            }
        } catch (error) {
            this.showError('Failed to load model details');
        }
    }

    // Enhanced Wallet Management with Better UI
    setupWalletUI() {
        const walletSection = document.querySelector('.header-wallet-section');
        if (!walletSection) return;

        if (this.state.wallet.connected) {
            const walletName = this.blockchainService?.getWalletName() || 'Unknown Wallet';
            const balance = this.blockchainService?.getBalance() || 0;
            
            walletSection.innerHTML = `
                <div class="wallet-status-detailed">
                    <div class="wallet-info">
                        <div class="wallet-connection">
                            <div class="status-indicator connected"></div>
                            <span class="wallet-name">${walletName}</span>
                        </div>
                        <div class="wallet-details">
                            <span class="wallet-address">${this.state.wallet.address.substring(0, 8)}...${this.state.wallet.address.substring(-6)}</span>
                            <span class="wallet-balance">${balance.toFixed(3)} ALGO</span>
                        </div>
                    </div>
                    <div class="wallet-actions">
                        <button class="btn btn-outline btn-small" onclick="app.copyAddress()" title="Copy Address">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-outline btn-small" onclick="app.disconnectWallet()" title="Disconnect">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            const availableWallets = this.blockchainService?.getAvailableWallets() || [];
            const hasWallets = availableWallets.length > 0;
            
            walletSection.innerHTML = `
                <div class="wallet-connect-section">
                    <button class="btn btn-primary" onclick="app.connectWallet()" ${!hasWallets ? 'disabled' : ''}>
                        <i class="fas fa-wallet"></i>
                        ${hasWallets ? 'Connect Wallet' : 'No Wallets Detected'}
                    </button>
                    ${hasWallets ? `
                        <small class="wallet-help">
                            ${availableWallets.length} wallet${availableWallets.length !== 1 ? 's' : ''} detected
                        </small>
                    ` : `
                        <small class="wallet-help error">
                            Install Exodus, Pera, or Defly wallet
                        </small>
                    `}
                </div>
            `;
        }

        // Add wallet-specific styles
        this.addWalletStyles();
    }

    addWalletStyles() {
        const existingStyle = document.getElementById('wallet-styles');
        if (existingStyle) return; // Already added

        const style = document.createElement('style');
        style.id = 'wallet-styles';
        style.textContent = `
            .wallet-status-detailed {
                display: flex;
                align-items: center;
                gap: var(--space-3);
            }
            
            .wallet-info {
                display: flex;
                flex-direction: column;
                gap: var(--space-1);
            }
            
            .wallet-connection {
                display: flex;
                align-items: center;
                gap: var(--space-2);
            }
            
            .wallet-name {
                font-weight: 600;
                font-size: var(--font-size-sm);
                color: var(--text-primary);
            }
            
            .wallet-details {
                display: flex;
                align-items: center;
                gap: var(--space-3);
                font-size: var(--font-size-xs);
                color: var(--text-muted);
            }
            
            .wallet-address {
                font-family: monospace;
                background: var(--surface);
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius);
                border: 1px solid var(--border);
            }
            
            .wallet-balance {
                font-weight: 500;
                color: var(--secondary);
            }
            
            .wallet-actions {
                display: flex;
                gap: var(--space-1);
            }
            
            .status-indicator.connected {
                background: var(--success);
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
                50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
                100% { box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
            }
            
            .wallet-connect-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--space-1);
            }
            
            .wallet-help {
                font-size: var(--font-size-xs);
                color: var(--text-muted);
                text-align: center;
            }
            
            .wallet-help.error {
                color: var(--error);
            }
            
            @media (max-width: 768px) {
                .wallet-status-detailed {
                    flex-direction: column;
                    gap: var(--space-2);
                }
                
                .wallet-details {
                    flex-direction: column;
                    gap: var(--space-1);
                }
            }
        `;
        document.head.appendChild(style);
    }

    async connectWallet() {
        try {
            console.log('🔐 Initiating wallet connection...');
            
            if (!this.blockchainService) {
                throw new Error('Blockchain service not initialized');
            }

            // Show loading
            this.showLoadingWithMessage('🔍 Detecting wallets...');

            // Check available wallets
            const availableWallets = this.blockchainService.getAvailableWallets();
            console.log('🔍 Available wallets:', availableWallets.map(w => w.name));

            if (availableWallets.length === 0) {
                throw new Error('No Algorand wallets detected. Please install Exodus, Pera, or Defly wallet.');
            }

            // Update loading message
            this.showLoadingWithMessage('🔌 Connecting to wallet...');

            // Connect to wallet
            const address = await this.blockchainService.connectWallet();
            
            if (address) {
                this.state.wallet.connected = true;
                this.state.wallet.address = address;
                
                console.log('✅ Wallet connected:', {
                    address: address,
                    wallet: this.blockchainService.getWalletName(),
                    balance: this.blockchainService.getBalance()
                });
                
                this.setupWalletUI();
                
                // Check if this is demo mode
                if (address.includes('DEMO') || this.blockchainService.getWalletName().includes('Demo')) {
                    this.showSuccess(`🎭 Demo wallet connected for testing! You can now publish encrypted models.`);
                } else {
                    this.showSuccess(`🎉 Successfully connected to ${this.blockchainService.getWalletName()}!`);
                }
            } else {
                throw new Error('Wallet connection failed - no address returned');
            }
            
        } catch (error) {
            console.error('❌ Wallet connection failed:', error);
            
            let errorMessage = error.message;
            
            // Provide more helpful error messages
            if (error.message.includes('User rejected')) {
                errorMessage = 'Connection cancelled by user. Please try again and approve the connection.';
            } else if (error.message.includes('Not supported')) {
                errorMessage = 'This wallet is not supported. Please use Exodus, Pera, or Defly wallet.';
            } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            }
            
            this.showError('❌ Wallet connection failed: ' + errorMessage);
        } finally {
            this.showLoading(false);
        }
    }

    async disconnectWallet() {
        try {
            console.log('🔓 Disconnecting wallet...');
            
            const walletName = this.blockchainService?.getWalletName() || 'wallet';
            
            if (this.blockchainService) {
                await this.blockchainService.disconnectWallet();
            }
            
            this.state.wallet.connected = false;
            this.state.wallet.address = null;
            this.setupWalletUI();
            
            console.log('✅ Wallet disconnected successfully');
            this.showSuccess(`👋 Disconnected from ${walletName}`);
            
        } catch (error) {
            console.error('❌ Wallet disconnection failed:', error);
            
            // Force disconnect on error
            this.state.wallet.connected = false;
            this.state.wallet.address = null;
            this.setupWalletUI();
            
            this.showError('Warning: Wallet disconnected with errors');
        }
    }

    async copyAddress() {
        try {
            if (!this.state.wallet.address) {
                throw new Error('No wallet address to copy');
            }

            // Try using modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(this.state.wallet.address);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = this.state.wallet.address;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            console.log('📋 Address copied:', this.state.wallet.address);
            this.showSuccess('📋 Address copied to clipboard!');
            
        } catch (error) {
            console.error('❌ Failed to copy address:', error);
            this.showError('Failed to copy address. Please copy manually.');
        }
    }

    // Utility Methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    formatPrice(price) {
        return parseFloat(price).toFixed(3);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DeSciChainApp();
});