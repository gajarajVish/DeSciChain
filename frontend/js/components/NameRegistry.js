/**
 * Name Registry Component
 * UI component for browsing and resolving DeSci names
 */

class NameRegistryComponent {
    constructor() {
        this.nameRegistryService = window.nameRegistryService;
        this.currentNames = [];
        this.selectedName = null;
        this.init();
    }

    init() {
        this.createNameRegistryHTML();
        this.setupEventListeners();
        this.loadMarketplace();
        console.log('✅ Name Registry Component initialized');
    }

    createNameRegistryHTML() {
        // Check if container already exists
        let container = document.getElementById('name-registry-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'name-registry-container';
            container.className = 'name-registry-container';
        }

        container.innerHTML = `
            <div class="name-registry">
                <div class="registry-header">
                    <h2>🏷️ DeSci Name Registry</h2>
                    <p>Human-readable names for DeSci labs and researchers</p>
                </div>

                <!-- Name Search & Resolution -->
                <div class="name-resolver">
                    <div class="resolver-input">
                        <input 
                            type="text" 
                            id="name-search-input" 
                            placeholder="Enter name to resolve (e.g., smith.desci)" 
                            class="form-input"
                        >
                        <button id="resolve-name-btn" class="btn btn-primary">
                            🔍 Resolve
                        </button>
                    </div>
                    <div id="resolution-result" class="resolution-result" style="display: none;">
                        <!-- Resolution results will appear here -->
                    </div>
                </div>

                <!-- Name Marketplace -->
                <div class="name-marketplace">
                    <div class="marketplace-header">
                        <h3>📱 Name Marketplace</h3>
                        <div class="marketplace-controls">
                            <button id="refresh-marketplace-btn" class="btn btn-secondary">
                                🔄 Refresh
                            </button>
                            <span id="names-count" class="names-count">0 names</span>
                        </div>
                    </div>
                    
                    <div id="marketplace-loading" class="loading-spinner" style="display: none;">
                        Loading marketplace...
                    </div>
                    
                    <div id="marketplace-error" class="error-message" style="display: none;">
                        <!-- Error messages will appear here -->
                    </div>
                    
                    <div id="names-grid" class="names-grid">
                        <!-- Name cards will be populated here -->
                    </div>
                </div>

                <!-- Name Registration Form (for future use) -->
                <div class="name-registration" style="display: none;">
                    <h3>➕ Register New Name</h3>
                    <form id="name-registration-form">
                        <div class="form-group">
                            <label for="reg-name">Name:</label>
                            <input type="text" id="reg-name" placeholder="yourname.desci" required>
                        </div>
                        <div class="form-group">
                            <label for="reg-cid">IPFS CID:</label>
                            <input type="text" id="reg-cid" placeholder="QmHash..." required>
                        </div>
                        <div class="form-group">
                            <label for="reg-price">Price (ALGO):</label>
                            <input type="number" id="reg-price" min="0" step="0.1" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Register Name</button>
                    </form>
                </div>
            </div>
        `;

        // Add CSS styles
        this.addNameRegistryStyles();
    }

    addNameRegistryStyles() {
        if (document.getElementById('name-registry-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'name-registry-styles';
        styles.textContent = `
            .name-registry {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }

            .registry-header {
                text-align: center;
                margin-bottom: 30px;
            }

            .registry-header h2 {
                color: #2563eb;
                margin-bottom: 8px;
            }

            .name-resolver {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .resolver-input {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .resolver-input input {
                flex: 1;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 16px;
            }

            .resolver-input input:focus {
                outline: none;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }

            .resolution-result {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 15px;
            }

            .name-marketplace {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .marketplace-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .marketplace-header h3 {
                margin: 0;
                color: #374151;
            }

            .marketplace-controls {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .names-count {
                color: #6b7280;
                font-size: 14px;
            }

            .names-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }

            .name-card {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .name-card:hover {
                border-color: #2563eb;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }

            .name-card.selected {
                border-color: #2563eb;
                background: #eff6ff;
            }

            .name-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 8px;
            }

            .name-price {
                font-size: 16px;
                font-weight: 500;
                color: #059669;
                margin-bottom: 8px;
            }

            .name-description {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 8px;
            }

            .name-cid {
                font-family: monospace;
                font-size: 12px;
                color: #6b7280;
                background: #f3f4f6;
                padding: 4px 6px;
                border-radius: 4px;
                word-break: break-all;
            }

            .loading-spinner {
                text-align: center;
                padding: 40px;
                color: #6b7280;
            }

            .error-message {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 20px;
            }

            .btn {
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-primary {
                background: #2563eb;
                color: white;
            }

            .btn-primary:hover {
                background: #1d4ed8;
            }

            .btn-secondary {
                background: #e5e7eb;
                color: #374151;
            }

            .btn-secondary:hover {
                background: #d1d5db;
            }

            .form-input {
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 16px;
                width: 100%;
            }

            @media (max-width: 768px) {
                .name-registry {
                    padding: 10px;
                }
                
                .resolver-input {
                    flex-direction: column;
                }
                
                .marketplace-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .names-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    setupEventListeners() {
        // Resolve name button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'resolve-name-btn') {
                this.resolveName();
            }
            
            if (e.target.id === 'refresh-marketplace-btn') {
                this.refreshMarketplace();
            }
            
            if (e.target.closest('.name-card')) {
                this.selectNameCard(e.target.closest('.name-card'));
            }
        });

        // Enter key in search input
        document.addEventListener('keypress', (e) => {
            if (e.target.id === 'name-search-input' && e.key === 'Enter') {
                this.resolveName();
            }
        });
    }

    async loadMarketplace() {
        this.showLoading(true);
        this.hideError();

        try {
            const names = await this.nameRegistryService.getMarketplace();
            this.currentNames = names;
            this.renderNameCards(names);
            this.updateNamesCount(names.length);
        } catch (error) {
            console.error('Failed to load marketplace:', error);
            this.showError('Failed to load name marketplace: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async resolveName() {
        const nameInput = document.getElementById('name-search-input');
        const resultDiv = document.getElementById('resolution-result');
        
        if (!nameInput || !resultDiv) return;

        const name = nameInput.value.trim();
        if (!name) {
            this.showResolutionError('Please enter a name to resolve');
            return;
        }

        // Validate name format
        const validation = this.nameRegistryService.validateName(name);
        if (!validation.valid) {
            this.showResolutionError(validation.error);
            return;
        }

        try {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div style="text-align: center; color: #6b7280;">Resolving...</div>';

            const nameData = await this.nameRegistryService.resolveName(name);
            this.showResolutionResult(nameData);
        } catch (error) {
            console.error('Name resolution failed:', error);
            this.showResolutionError(`Failed to resolve "${name}": ${error.message}`);
        }
    }

    showResolutionResult(nameData) {
        const resultDiv = document.getElementById('resolution-result');
        if (!resultDiv) return;

        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="resolution-success">
                <h4 style="margin: 0 0 12px 0; color: #059669;">✅ Name Resolved: ${nameData.name}</h4>
                <div class="name-details">
                    <div class="detail-item">
                        <strong>Owner:</strong> 
                        <span class="monospace">${nameData.owner || 'Unknown'}</span>
                    </div>
                    ${nameData.price_algo !== undefined ? `
                    <div class="detail-item">
                        <strong>Price:</strong> 
                        <span class="price">${this.nameRegistryService.formatPrice(nameData.price_algo)}</span>
                    </div>` : ''}
                    ${nameData.cid ? `
                    <div class="detail-item">
                        <strong>IPFS CID:</strong> 
                        <span class="monospace cid">${nameData.cid}</span>
                    </div>` : ''}
                    ${nameData.timestamp ? `
                    <div class="detail-item">
                        <strong>Last Updated:</strong> 
                        <span>${new Date(nameData.timestamp * 1000).toLocaleDateString()}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    showResolutionError(message) {
        const resultDiv = document.getElementById('resolution-result');
        if (!resultDiv) return;

        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <div class="resolution-error" style="color: #dc2626;">
                ❌ ${message}
            </div>
        `;
    }

    renderNameCards(names) {
        const grid = document.getElementById('names-grid');
        if (!grid) return;

        if (names.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 40px;">
                    No names registered yet
                </div>
            `;
            return;
        }

        grid.innerHTML = names.map(name => `
            <div class="name-card" data-name="${name.name}">
                <div class="name-title">${name.name}</div>
                <div class="name-price">${this.nameRegistryService.formatPrice(name.price_algo)}</div>
                <div class="name-description">${name.description || 'No description available'}</div>
                <div class="name-cid">${name.cid}</div>
            </div>
        `).join('');
    }

    selectNameCard(card) {
        // Remove selection from other cards
        document.querySelectorAll('.name-card').forEach(c => c.classList.remove('selected'));
        
        // Select this card
        card.classList.add('selected');
        
        const name = card.dataset.name;
        this.selectedName = name;
        
        // Auto-fill search input
        const searchInput = document.getElementById('name-search-input');
        if (searchInput) {
            searchInput.value = name;
        }
    }

    async refreshMarketplace() {
        this.nameRegistryService.clearCache();
        await this.loadMarketplace();
    }

    updateNamesCount(count) {
        const countSpan = document.getElementById('names-count');
        if (countSpan) {
            countSpan.textContent = `${count} name${count !== 1 ? 's' : ''}`;
        }
    }

    showLoading(show) {
        const loadingDiv = document.getElementById('marketplace-loading');
        if (loadingDiv) {
            loadingDiv.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('marketplace-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    hideError() {
        const errorDiv = document.getElementById('marketplace-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Public method to render the component in a specific container
    render(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const registryContainer = document.getElementById('name-registry-container');
            if (registryContainer) {
                container.appendChild(registryContainer);
            }
        }
    }
}

// Make component globally available
window.NameRegistryComponent = NameRegistryComponent;

console.log('✅ Name Registry Component loaded');