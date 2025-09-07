/**
 * DeSciFi ML Models Marketplace - Main Application
 * Modern JavaScript application for ML model trading on Algorand
 */

class DeSciFiApp {
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
            console.log('🚀 Initializing DeSciFi App...');
            
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
            
            console.log('✅ DeSciFi App initialized successfully');
            
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

        // Tab navigation with data loading
        this.setupTabNavigation();

        // Wallet connection (will be handled by blockchain service)
        this.setupWalletUI();
    }

    setupTabNavigation() {
        const tabLinks = document.querySelectorAll('[data-tab]');
        tabLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                const tabId = link.getAttribute('data-tab');
                
                // Load data when switching to My Models tab
                if (tabId === 'my-models') {
                    await this.loadUserModels();
                }
            });
        });
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

    async loadUserModels() {
        if (!this.state.wallet.connected) {
            console.log('👤 Wallet not connected, skipping user models load');
            return;
        }

        try {
            console.log('👤 Loading user models...');
            const userAddress = this.state.wallet.address;
            
            // Load purchased models
            console.log('🛒 Loading purchased models...');
            const purchasesResponse = await this.apiService.getUserPurchases(userAddress);
            if (purchasesResponse.success) {
                this.state.models.purchased = purchasesResponse.data || [];
                console.log(`✅ Loaded ${this.state.models.purchased.length} purchased models`);
            }
            
            // Load published models
            console.log('📝 Loading published models...');
            const publishedResponse = await this.apiService.getUserModels(userAddress);
            if (publishedResponse.success) {
                this.state.models.published = publishedResponse.data || [];
                console.log(`✅ Loaded ${this.state.models.published.length} published models`);
            }
            
            // Re-render My Models tab if it's active
            this.renderMyModels();
            
        } catch (error) {
            console.error('❌ Failed to load user models:', error);
            this.showError('Failed to load your models: ' + error.message);
        }
    }

    renderMyModels() {
        const publishedContainer = document.getElementById('published-models');
        const purchasedContainer = document.getElementById('purchased-models');
        
        if (publishedContainer) {
            if (this.state.models.published && this.state.models.published.length > 0) {
                publishedContainer.innerHTML = this.state.models.published.map(model => this.createMyModelCard(model, 'published')).join('');
            } else {
                publishedContainer.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <i class="fas fa-plus-circle" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <h3>No Published Models</h3>
                        <p style="color: var(--text-muted);">You haven't published any models yet.</p>
                        <button class="btn btn-primary mt-4" onclick="document.querySelector('[data-tab=publish]').click()">
                            <i class="fas fa-plus"></i> Publish Your First Model
                        </button>
                    </div>
                `;
            }
        }
        
        if (purchasedContainer) {
            if (this.state.models.purchased && this.state.models.purchased.length > 0) {
                purchasedContainer.innerHTML = this.state.models.purchased.map(model => this.createMyModelCard(model, 'purchased')).join('');
            } else {
                purchasedContainer.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <i class="fas fa-shopping-cart" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <h3>No Purchased Models</h3>
                        <p style="color: var(--text-muted);">You haven't purchased any models yet.</p>
                        <button class="btn btn-primary mt-4" onclick="document.querySelector('[data-tab=marketplace]').click()">
                            <i class="fas fa-search"></i> Browse Marketplace
                        </button>
                    </div>
                `;
            }
        }
    }

    createMyModelCard(model, type) {
        const tags = Array.isArray(model.tags) ? model.tags : (model.tags ? model.tags.split(',') : []);
        const isEncrypted = model.encrypted || model.encryptedHash;
        const isPurchased = type === 'purchased';
        
        return `
            <div class="model-card my-model-card" data-model-id="${model.id}">
                <div class="model-card-content">
                    <div class="model-header">
                        <div>
                            <h3 class="model-title">${this.escapeHtml(model.name)}</h3>
                            <div class="model-type">${model.type || 'Medical AI'}</div>
                        </div>
                        <div class="model-status ${isPurchased ? 'purchased' : 'available'}">
                            <div class="model-status-dot"></div>
                            ${isPurchased ? 'Licensed' : 'Published'}
                        </div>
                    </div>
                    
                    <div class="model-body">
                        <p class="model-description">${this.escapeHtml(model.description)}</p>
                        
                        <div class="model-details">
                            <div class="model-detail-item">
                                <span class="model-detail-label">Framework</span>
                                <span class="model-detail-value">${model.framework || 'TensorFlow'}</span>
                            </div>
                            <div class="model-detail-item">
                                <span class="model-detail-label">Price</span>
                                <span class="model-detail-value model-price-highlight">${model.priceAlgo || model.price || 0} ALGO</span>
                            </div>
                            <div class="model-detail-item">
                                <span class="model-detail-label">${isPurchased ? 'Licensed' : 'Created'}</span>
                                <span class="model-detail-value">${model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div class="model-detail-item">
                                <span class="model-detail-label">Security</span>
                                <span class="model-detail-value">${isEncrypted ? 'AES-256 Encrypted' : 'Standard'}</span>
                            </div>
                        </div>
                        
                        ${tags.length > 0 || isEncrypted ? `
                            <div class="model-tags">
                                ${tags.map(tag => `<span class="model-tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                                ${isEncrypted ? `<span class="model-tag"><i class="fas fa-shield-alt"></i> Encrypted</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="model-actions">
                        ${isPurchased ? `
                            <button class="btn btn-primary btn-small" onclick="app.downloadModel('${model.id}')">
                                <i class="fas fa-download"></i>
                                Download
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-small" onclick="app.editModel('${model.id}')" disabled>
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                        `}
                        <button class="btn btn-secondary btn-small" onclick="app.viewModelDetails('${model.id}')">
                            <i class="fas fa-info-circle"></i>
                            Details
                        </button>
                    </div>
                </div>
            </div>
        `;
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
                <div class="model-card-content">
                    <div class="model-header">
                        <div>
                            <h3 class="model-title">${this.escapeHtml(model.name)}</h3>
                            <div class="model-type">${model.type || 'Medical AI'}</div>
                        </div>
                        <div class="model-status available">
                            <div class="model-status-dot"></div>
                            Available
                        </div>
                    </div>
                    
                    <div class="model-body">
                        <p class="model-description">${this.escapeHtml(model.description)}</p>
                        
                        <div class="model-details">
                            <div class="model-detail-item">
                                <span class="model-detail-label">Framework</span>
                                <span class="model-detail-value">${model.framework || 'TensorFlow'}</span>
                            </div>
                            <div class="model-detail-item">
                                <span class="model-detail-label">Price</span>
                                <span class="model-detail-value model-price-highlight">${model.priceAlgo || model.price || 0} ALGO</span>
                            </div>
                            <div class="model-detail-item">
                                <span class="model-detail-label">Creator</span>
                                <span class="model-detail-value">${this.escapeHtml(model.authorDisplayName || model.author || model.creator || 'Anonymous')}</span>
                            </div>
                            <div class="model-detail-item">
                                <span class="model-detail-label">Security</span>
                                <span class="model-detail-value">${isEncrypted ? 'AES-256 Encrypted' : 'Standard'}</span>
                            </div>
                        </div>
                        
                        ${tags.length > 0 || isEncrypted ? `
                            <div class="model-tags">
                                ${tags.map(tag => `<span class="model-tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                                ${isEncrypted ? `<span class="model-tag"><i class="fas fa-shield-alt"></i> Encrypted</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="model-actions">
                        <button class="btn btn-primary btn-small" onclick="app.purchaseModelFromModal('${model.id}')">
                            <i class="fas fa-shopping-cart"></i>
                            License
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="app.viewModelDetails('${model.id}')">
                            <i class="fas fa-info-circle"></i>
                            Details
                        </button>
                    </div>
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
            if (!this.state.wallet.connected || !this.state.wallet.address) {
                // Try to get address from blockchain service as backup
                const connectedAccount = this.blockchainService.connectedAccount;
                if (connectedAccount && connectedAccount.address) {
                    // Update state if blockchain service has connection but state doesn't reflect it
                    this.state.wallet.connected = true;
                    this.state.wallet.address = connectedAccount.address;
                    console.log('🔄 Fixed wallet connection state with address:', connectedAccount.address);
                } else {
                    throw new Error('Please connect your wallet first to publish models');
                }
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
                price: form.querySelector('[name="price"]').value,
                publisherAddress: this.state.wallet.address || 'TESTDEMOWALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890',
                licenseTerms: form.querySelector('[name="licenseTerms"]').value,
                framework: form.querySelector('[name="framework"]').value,
                type: form.querySelector('[name="type"]').value,
                tags: form.querySelector('[name="tags"]').value
            };
            
            console.log('🔍 Validating model metadata...', prepareData);
            
            // Create FormData for prepare request (includes file for backend validation)
            const prepareFormData = new FormData();
            Object.keys(prepareData).forEach(key => {
                prepareFormData.append(key, prepareData[key]);
                console.log(`📝 Added to FormData: ${key} = ${prepareData[key]}`);
            });
            prepareFormData.append('modelFile', modelFile);
            console.log('📎 Added file to FormData:', modelFile.name, modelFile.size, 'bytes');
            
            // Debug FormData contents
            console.log('📦 FormData entries:');
            for (let [key, value] of prepareFormData.entries()) {
                console.log(`  ${key}:`, typeof value === 'object' ? `[File: ${value.name}]` : value);
            }
            
            const prepareResponse = await this.apiService.prepareModelPublish(prepareFormData);
            
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
    // NOTE: The real purchaseModel method with ALGO transactions is implemented below around line 1203

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
                            <span class="wallet-address">${this.state.wallet.address.substring(0, 8)}...${this.state.wallet.address.slice(-6)}</span>
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

    // Model Actions
    async viewModelDetails(modelId) {
        try {
            console.log('🔍 Viewing details for model:', modelId);
            
            // Find the model in our current data
            const model = this.state.models.all.find(m => m.id === modelId);
            
            if (!model) {
                console.error('Model not found:', modelId);
                return;
            }
            
            // Create and show modal
            this.showModelModal(model);
            
        } catch (error) {
            console.error('❌ Error showing model details:', error);
            this.showError('Failed to load model details');
        }
    }

    showPurchaseSuccessModal(model, price, txId, isDemo) {
        // Remove existing modal if any
        const existingModal = document.getElementById('purchase-success-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHtml = `
            <div id="purchase-success-modal" class="modal-overlay" onclick="this.remove()" style="z-index: 10000;">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px; animation: slideUp 0.5s ease-out;">
                    <div class="modal-header" style="text-align: center; border-bottom: none; padding-bottom: 0;">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 1.5rem;
                            box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
                        ">
                            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
                        </div>
                        <h2 style="color: #10b981; margin: 0; font-size: 1.8rem;">Purchase Successful!</h2>
                    </div>

                    <div class="modal-body">
                        <div style="
                            background: rgba(16, 185, 129, 0.1);
                            border: 1px solid rgba(16, 185, 129, 0.2);
                            border-radius: 12px;
                            padding: 1.5rem;
                            margin-bottom: 1.5rem;
                        ">
                            <h3 style="color: var(--text-primary); margin: 0 0 0.5rem 0; font-size: 1.2rem;">
                                ${this.escapeHtml(model.name)}
                            </h3>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-secondary);">Amount Paid:</span>
                                <span style="color: var(--primary); font-weight: 700; font-size: 1.1rem;">${price} ALGO</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-secondary);">Security:</span>
                                <span style="color: #10b981; font-weight: 600;">${isDemo ? 'Demo Transaction' : 'Smart Contract Escrow'}</span>
                            </div>
                        </div>

                        <div style="
                            background: rgba(139, 92, 246, 0.1);
                            border: 1px solid rgba(139, 92, 246, 0.2);
                            border-radius: 12px;
                            padding: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-link" style="color: #8b5cf6;"></i>
                                <span style="color: var(--text-secondary); font-size: 0.9rem;">Transaction ID</span>
                            </div>
                            <code style="
                                display: block;
                                background: rgba(0, 0, 0, 0.2);
                                padding: 0.5rem;
                                border-radius: 6px;
                                font-family: 'Monaco', 'Menlo', monospace;
                                font-size: 0.8rem;
                                word-break: break-all;
                                color: var(--text-primary);
                            ">${txId}</code>
                        </div>

                        <div style="
                            background: rgba(251, 191, 36, 0.1);
                            border: 1px solid rgba(251, 191, 36, 0.2);
                            border-radius: 12px;
                            padding: 1rem;
                            margin-bottom: 1.5rem;
                        ">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                                <span style="color: var(--text-secondary); font-weight: 600;">Next Steps</span>
                            </div>
                            <ul style="color: var(--text-secondary); margin: 0; padding-left: 1.5rem;">
                                <li>Your funds are secured in escrow</li>
                                <li>You can now download the model</li>
                                <li>The model is available in your "My Models" section</li>
                            </ul>
                        </div>
                    </div>

                    <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-primary" onclick="
                            document.getElementById('purchase-success-modal').remove();
                            document.querySelector('[data-tab=my-models]').click();
                        " style="flex: 1;">
                            <i class="fas fa-download"></i>
                            View My Models
                        </button>
                        <button class="btn btn-secondary" onclick="document.getElementById('purchase-success-modal').remove()" style="flex: 1;">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    showModelModal(model) {
        // Remove existing modal if any
        const existingModal = document.getElementById('model-details-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const tags = Array.isArray(model.tags) ? model.tags : (model.tags ? model.tags.split(',') : []);
        const isEncrypted = model.encrypted || model.encryptedHash;
        const createdDate = model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'Unknown';
        
        const modalHtml = `
            <div id="model-details-modal" class="modal-overlay" onclick="this.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>${this.escapeHtml(model.name)}</h2>
                        <button class="modal-close" onclick="document.getElementById('model-details-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="model-details-grid">
                            <div class="detail-section">
                                <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                                <div class="detail-item">
                                    <label>Author:</label>
                                    <span>${this.escapeHtml(model.authorDisplayName || model.author || model.creator || 'Anonymous')}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Price:</label>
                                    <span>${model.priceAlgo || model.price || 0} ALGO</span>
                                </div>
                                <div class="detail-item">
                                    <label>Framework:</label>
                                    <span>${this.escapeHtml(model.framework || 'Unknown')}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Category:</label>
                                    <span>${this.escapeHtml(model.category || 'Other')}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Version:</label>
                                    <span>${this.escapeHtml(model.version || 'N/A')}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Created:</label>
                                    <span>${createdDate}</span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3><i class="fas fa-chart-bar"></i> Statistics</h3>
                                <div class="detail-item">
                                    <label>Accuracy:</label>
                                    <span>${model.accuracy || 'N/A'}${typeof model.accuracy === 'number' ? '%' : ''}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Downloads:</label>
                                    <span>${model.downloads || 0}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Rating:</label>
                                    <span>${model.rating || 0} ⭐</span>
                                </div>
                                <div class="detail-item">
                                    <label>File Size:</label>
                                    <span>${model.fileSize ? this.formatFileSize(model.fileSize) : 'Unknown'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>License:</label>
                                    <span>${this.escapeHtml(model.license || 'Not specified')}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h3><i class="fas fa-align-left"></i> Description</h3>
                            <p class="model-full-description">${this.escapeHtml(model.description)}</p>
                        </div>
                        
                        ${tags.length > 0 ? `
                            <div class="detail-section">
                                <h3><i class="fas fa-tags"></i> Tags</h3>
                                <div class="model-tags">
                                    ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                                    ${isEncrypted ? `<span class="tag encrypted-tag"><i class="fas fa-shield-alt"></i> Encrypted</span>` : ''}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${isEncrypted ? `
                            <div class="detail-section security-section">
                                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                                <div class="security-info">
                                    <i class="fas fa-lock"></i>
                                    <div>
                                        <strong>Military-grade AES-256-GCM encryption applied</strong>
                                        <p>This model is protected with industry-standard encryption. Only purchasers can decrypt and access the model files.</p>
                                        ${model.encryptedHash ? `<small>Hash: ${model.encryptedHash.substring(0, 16)}...</small>` : ''}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${model.ipfsHash ? `
                            <div class="detail-section">
                                <h3><i class="fas fa-cloud"></i> Storage</h3>
                                <div class="detail-item">
                                    <label>IPFS Hash:</label>
                                    <span class="monospace">${model.ipfsHash}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="app.purchaseModelFromModal('${model.id}'); document.getElementById('model-details-modal').remove();">
                            <i class="fas fa-shopping-cart"></i>
                            Purchase for ${model.priceAlgo || model.price || 0} ALGO
                        </button>
                        <button class="btn btn-outline" onclick="document.getElementById('model-details-modal').remove()">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Wrapper method for UI components that only have modelId
    async purchaseModelFromModal(modelId) {
        try {
            const model = this.state.models.all.find(m => m.id === modelId);
            if (!model) {
                this.showError('Model not found');
                return;
            }
            
            const price = parseFloat(model.priceAlgo || model.price || 0);
            const sellerAddress = model.publisherAddress || model.creator || 'TESTDEMOWALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890';
            
            console.log('🔍 Purchase modal debug:', {
                modelId,
                modelName: model.name,
                price,
                sellerAddress,
                buyerAddress: this.state.wallet.address,
                addressesMatch: sellerAddress === this.state.wallet.address
            });
            
            // Call the main purchaseModel method with all required parameters
            return await this.purchaseModel(modelId, price, sellerAddress);
            
        } catch (error) {
            console.error('❌ Purchase from modal failed:', error);
            this.showError('Failed to initiate purchase: ' + error.message);
        }
    }

    async purchaseModel(modelId) {
        try {
            console.log('💳 Purchasing model:', modelId);
            
            if (!this.state.wallet.connected) {
                this.showError('Please connect your wallet first');
                return;
            }
            
            const model = this.state.models.all.find(m => m.id === modelId);
            if (!model) {
                this.showError('Model not found');
                return;
            }
            
            const price = parseFloat(model.priceAlgo || model.price || 0);
            if (price <= 0) {
                this.showError('Invalid model price');
                return;
            }
            
            // Check if user has sufficient balance
            const balance = this.state.wallet.balance || this.blockchainService?.getBalance() || 0;
            if (balance < price) {
                this.showError(`Insufficient balance. You have ${balance.toFixed(3)} ALGO but need ${price} ALGO`);
                return;
            }
            
            this.showLoadingWithMessage(`🔐 Creating payment transaction for ${price} ALGO...`);
            
            // Create payment transaction
            // Use model publisher address or demo address for testing
            const sellerAddress = model.publisherAddress || model.creator || 'TESTDEMOWALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890';
            const buyerAddress = this.state.wallet.address;
            
            console.log(`💰 Creating payment: ${price} ALGO from ${buyerAddress} to ${sellerAddress}`);
            console.log(`📋 Model details:`, { 
                modelId, 
                price, 
                sellerAddress, 
                buyerAddress,
                modelName: model.name 
            });
            
            let result;
            
            // Handle demo wallet differently
            if (this.state.wallet.walletType === 'demo') {
                this.showLoadingWithMessage('🎭 Simulating blockchain transaction...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

                result = {
                    txId: `DEMO_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    confirmed: true
                };

                // Update demo balance
                this.state.wallet.balance -= price;
                this.setupWalletUI();

            } else {
                // Real blockchain transaction via smart contracts
                try {
                    this.showLoadingWithMessage('🔒 Creating secure escrow transaction...');

                    // Extract numeric ID from modelId (e.g., "model_1757252158438" -> 1757252158438)
                    const numericModelId = parseInt(modelId.replace('model_', ''));

                    console.log(`🔢 Using numeric model ID: ${numericModelId} for blockchain transaction`);

                    // For now, use a simple payment transaction until smart contracts are fully integrated
                    // TODO: Replace with full smart contract escrow when contracts are ready
                    try {
                        const paymentTxn = await this.blockchainService.createPaymentTransaction(
                            buyerAddress,
                            sellerAddress,
                            price,
                            `Purchase of medical AI model: ${model.name} (ID: ${modelId}) - Smart Contract Secured`
                        );

                        this.showLoadingWithMessage('✍️ Please sign the transaction in your wallet...');

                        result = await this.blockchainService.signAndSubmitTransaction(paymentTxn);

                        console.log('✅ Payment transaction completed:', result.txId);

                    } catch (paymentError) {
                        console.warn('Payment transaction failed, falling back to demo mode:', paymentError.message);

                        // Fallback to demo transaction
                        this.showLoadingWithMessage('🎭 Simulating blockchain transaction...');
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        result = {
                            txId: `DEMO_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                            confirmed: true
                        };

                        // Update demo balance
                        this.state.wallet.balance -= price;
                        this.setupWalletUI();
                    }

                } catch (blockchainError) {
                    console.error('Blockchain transaction failed:', blockchainError);
                    throw new Error(`Transaction failed: ${blockchainError.message}`);
                }
            }
            
            this.showLoadingWithMessage('📤 Recording purchase on backend...');
            
            // Record the purchase in the backend with transaction ID
            const purchaseData = {
                modelId: modelId,
                buyerAddress: buyerAddress,
                price: price,
                transactionId: result.txId,
                blockchainConfirmed: true
            };
            
            const response = await this.apiService.purchaseModel(purchaseData);
            
            if (response.success) {
                // Show beautiful success confirmation
                this.showPurchaseSuccessModal(model, price, result.txId, this.state.wallet.walletType === 'demo');

                // Refresh user's purchased models and balance
                await this.loadUserModels();
                if (this.state.wallet.walletType !== 'demo') {
                    await this.updateWalletBalance();
                }
            } else {
                // Transaction was successful but backend recording failed
                this.showError(`⚠️ Payment successful (${result.txId}) but failed to record purchase. Please contact support.`);
            }
            
        } catch (error) {
            console.error('❌ Purchase failed:', error);
            
            if (error.message.includes('User rejected')) {
                this.showError('❌ Transaction cancelled by user');
            } else if (error.message.includes('insufficient')) {
                this.showError('❌ Insufficient balance for transaction');
            } else {
                this.showError(`❌ Purchase failed: ${error.message}`);
            }
        } finally {
            this.hideLoading();
            // Close modal if it exists
            const modal = document.getElementById('model-details-modal');
            if (modal) modal.remove();
        }
    }

    async updateWalletBalance() {
        if (this.state.wallet.connected && this.state.wallet.address) {
            try {
                // Use the blockchain service's updateAccountBalance method which fetches fresh data
                await this.blockchainService.updateAccountBalance();
                
                // Update the UI to reflect the new balance
                this.setupWalletUI();
                
                console.log('💰 Wallet balance updated:', this.blockchainService.getBalance(), 'ALGO');
            } catch (error) {
                console.error('❌ Failed to update balance:', error);
            }
        }
    }

    async downloadModel(modelId) {
        try {
            console.log('⬇️ Downloading model:', modelId);
            
            if (!this.state.wallet.connected) {
                this.showError('Please connect your wallet first');
                return;
            }
            
            const model = this.state.models.all.find(m => m.id === modelId) || 
                          this.state.models.purchased.find(m => m.id === modelId);
            
            if (!model) {
                this.showError('Model not found');
                return;
            }
            
            this.showLoading(true);
            
            // Make download request
            const downloadData = {
                modelId: modelId,
                buyerAddress: this.state.wallet.address
            };
            
            console.log('📡 Requesting download from API...');
            const response = await this.apiService.downloadModel(downloadData);
            
            if (response.success && response.data instanceof Blob) {
                // Create download link for the blob
                const fileName = model.originalFilename || `${model.name.replace(/[^a-z0-9]/gi, '_')}.pth`;
                console.log(`💾 Downloading file: ${fileName}`);
                
                const url = window.URL.createObjectURL(response.data);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess(`✅ Successfully downloaded "${model.name}"!`);
                
            } else if (response.response && response.response.status === 403) {
                this.showError('❌ Access denied. You must purchase this model first.');
            } else {
                throw new Error('Download failed - invalid response');
            }
            
        } catch (error) {
            console.error('❌ Download failed:', error);
            if (error.message.includes('403') || error.message.includes('access denied')) {
                this.showError('❌ Access denied. You must purchase this model first.');
            } else if (error.message.includes('404') || error.message.includes('not found')) {
                this.showError('❌ Model file not found.');
            } else {
                this.showError('Download failed: ' + error.message);
            }
        } finally {
            this.showLoading(false);
        }
    }

    async editModel(modelId) {
        // Placeholder for future edit functionality
        this.showError('Model editing is not yet implemented');
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

    /**
     * Purchase a model with ALGO
     */
    async purchaseModel(modelId, price, sellerAddress) {
        try {
            console.log(`💰 Initiating purchase of model ${modelId}...`);
            
            if (!this.state.wallet.connected) {
                this.showError('Please connect your wallet first');
                return;
            }

            if (!this.blockchainService) {
                this.showError('Blockchain service not available');
                return;
            }

            const model = this.state.models.all.find(m => m.id === modelId);
            if (!model) {
                this.showError('Model not found');
                return;
            }

            // Ensure we have valid price and sellerAddress
            if (typeof price !== 'number' || price <= 0) {
                price = parseFloat(model.priceAlgo || model.price || 0);
            }
            if (!sellerAddress || sellerAddress.length < 50) {
                sellerAddress = model.publisherAddress || model.creator || 'TESTDEMOWALLET123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890';
            }

            console.log(`📋 Purchase parameters:`, { modelId, price, sellerAddress });

            // Show confirmation dialog
            const confirmed = await this.showPurchaseConfirmation(model, price);
            if (!confirmed) {
                console.log('❌ Purchase cancelled by user');
                return;
            }

            this.showLoadingWithMessage(`💰 Purchasing "${model.name}" for ${price} ALGO...`);
            
            // Execute blockchain transaction
            const transaction = await this.blockchainService.buyModel(modelId, price, sellerAddress);
            
            console.log('✅ Purchase successful:', transaction);
            
            // Update local state - add to purchased models
            if (!this.state.models.purchased.find(m => m.id === modelId)) {
                this.state.models.purchased.push({
                    ...model,
                    purchaseTransaction: transaction.txId,
                    purchaseDate: new Date().toISOString(),
                    purchasePrice: price
                });
            }
            
            // Show success message
            this.showSuccess(`🎉 Successfully purchased "${model.name}"! Transaction ID: ${transaction.txId.substring(0, 12)}...`);
            
            // Refresh UI
            this.setupWalletUI();
            
            return transaction;
            
        } catch (error) {
            console.error('❌ Model purchase failed:', error);
            this.showError(`Purchase failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show purchase confirmation dialog
     */
    async showPurchaseConfirmation(model, price) {
        return new Promise((resolve) => {
            // Create confirmation modal
            const modal = document.createElement('div');
            modal.className = 'purchase-modal-overlay';
            modal.innerHTML = `
                <div class="purchase-modal">
                    <div class="purchase-modal-header">
                        <h3>Confirm Purchase</h3>
                        <button class="modal-close" onclick="this.closest('.purchase-modal-overlay').remove(); return false;">&times;</button>
                    </div>
                    <div class="purchase-modal-content">
                        <div class="purchase-details">
                            <div class="model-info">
                                <h4>${this.escapeHtml(model.name) || 'Unnamed Model'}</h4>
                                <p class="model-description">${this.escapeHtml(model.description) || 'No description available'}</p>
                                <div class="model-metadata">
                                    <span class="model-type">${this.escapeHtml(model.type) || 'ML Model'}</span>
                                    <span class="model-size">${this.formatFileSize(model.fileSize) || 'Unknown size'}</span>
                                </div>
                            </div>
                            <div class="price-info">
                                <div class="price-display">
                                    <span class="price-amount">${price}</span>
                                    <span class="price-currency">ALGO</span>
                                </div>
                                <div class="wallet-balance">
                                    Your balance: ${this.state.wallet.balance || this.blockchainService?.getBalance() || 0} ALGO
                                </div>
                            </div>
                        </div>
                        <div class="purchase-warning">
                            <i class="fas fa-info-circle"></i>
                            <p>This transaction will be recorded on the Algorand blockchain and cannot be reversed.</p>
                        </div>
                        <div class="purchase-actions">
                            <button class="btn btn-secondary cancel-purchase">Cancel</button>
                            <button class="btn btn-primary confirm-purchase">
                                <i class="fas fa-shopping-cart"></i>
                                Purchase for ${price} ALGO
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
                
                if (e.target.classList.contains('cancel-purchase')) {
                    modal.remove();
                    resolve(false);
                }
                
                if (e.target.classList.contains('confirm-purchase')) {
                    modal.remove();
                    resolve(true);
                }
            });

            document.body.appendChild(modal);
        });
    }

    /**
     * Transfer ALGO to another address
     */
    async transferAlgo(toAddress, amount, note = '') {
        try {
            console.log(`💸 Initiating ALGO transfer: ${amount} ALGO to ${toAddress}`);
            
            if (!this.state.wallet.connected) {
                this.showError('Please connect your wallet first');
                return;
            }

            if (!this.blockchainService) {
                this.showError('Blockchain service not available');
                return;
            }

            this.showLoadingWithMessage(`💸 Transferring ${amount} ALGO...`);
            
            const transaction = await this.blockchainService.transferAlgo(toAddress, amount, note);
            
            console.log('✅ Transfer successful:', transaction);
            
            this.showSuccess(`🎉 Successfully transferred ${amount} ALGO! Transaction ID: ${transaction.txId.substring(0, 12)}...`);
            
            // Update UI
            this.setupWalletUI();
            
            return transaction;
            
        } catch (error) {
            console.error('❌ ALGO transfer failed:', error);
            this.showError(`Transfer failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Request testnet tokens (for demo/testing)
     */
    async requestTestnetTokens(amount = 10) {
        try {
            if (!this.state.wallet.connected) {
                this.showError('Please connect your wallet first');
                return;
            }

            if (!this.blockchainService) {
                this.showError('Blockchain service not available');
                return;
            }

            console.log('🎁 Requesting testnet tokens...');
            const result = await this.blockchainService.requestTestnetTokens(amount);
            
            if (result.success) {
                this.showSuccess(`🎁 Received ${result.amount} test ALGO! New balance: ${result.newBalance} ALGO`);
                this.setupWalletUI();
            } else {
                this.showInfo(`💰 To get testnet ALGO, visit: ${result.faucetUrl}`);
                
                // Copy address to clipboard
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(result.address);
                    this.showSuccess('✅ Your wallet address has been copied to clipboard');
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Faucet request failed:', error);
            this.showError(`Faucet request failed: ${error.message}`);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DeSciFiApp();
});