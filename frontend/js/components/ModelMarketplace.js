/**
 * ModelMarketplace Component
 * Displays available ML models for purchase
 */

const ModelMarketplace = () => {
    const { models, wallet, purchaseModel, loading, error } = useApp();
    const [filters, setFilters] = useState({
        framework: '',
        modelType: '',
        minPrice: '',
        maxPrice: '',
        search: ''
    });
    const [sortBy, setSortBy] = useState('newest');
    const [selectedModel, setSelectedModel] = useState(null);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    const handlePurchase = async (model) => {
        if (!wallet.connected) {
            alert('Please connect your wallet to purchase models');
            return;
        }

        setSelectedModel(model);
        setShowPurchaseModal(true);
    };

    const confirmPurchase = async () => {
        try {
            await purchaseModel(selectedModel.id, selectedModel.price);
            setShowPurchaseModal(false);
            setSelectedModel(null);
            alert('Purchase initiated! Check your wallet to complete the transaction.');
        } catch (err) {
            alert(`Purchase failed: ${err.message}`);
        }
    };

    const formatPrice = (price) => {
        return (price / 1000000).toFixed(2);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    className={`star ${i <= rating ? 'filled' : ''}`}
                >
                    ★
                </span>
            );
        }
        return stars;
    };

    const filteredModels = models.all.filter(model => {
        const matchesSearch = !filters.search || 
            model.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            model.description.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesFramework = !filters.framework || model.framework === filters.framework;
        const matchesType = !filters.modelType || model.modelType === filters.modelType;
        
        const matchesMinPrice = !filters.minPrice || model.price >= parseInt(filters.minPrice) * 1000000;
        const matchesMaxPrice = !filters.maxPrice || model.price <= parseInt(filters.maxPrice) * 1000000;
        
        return matchesSearch && matchesFramework && matchesType && matchesMinPrice && matchesMaxPrice;
    });

    const sortedModels = filteredModels.sort((a, b) => {
        switch (sortBy) {
            case 'price_low':
                return a.price - b.price;
            case 'price_high':
                return b.price - a.price;
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'newest':
            default:
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    return (
        <div className="model-marketplace">
            <div className="section-header">
                <h2>ML Model Marketplace</h2>
                <p>Discover and purchase machine learning models from leading research labs</p>
            </div>

            {/* Filters */}
            <div className="filters">
                <div className="filter-row">
                    <div className="filter-group">
                        <label>Search</label>
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>Framework</label>
                        <select
                            value={filters.framework}
                            onChange={(e) => setFilters({ ...filters, framework: e.target.value })}
                        >
                            <option value="">All Frameworks</option>
                            <option value="tensorflow">TensorFlow</option>
                            <option value="pytorch">PyTorch</option>
                            <option value="scikit-learn">Scikit-learn</option>
                            <option value="keras">Keras</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Model Type</label>
                        <select
                            value={filters.modelType}
                            onChange={(e) => setFilters({ ...filters, modelType: e.target.value })}
                        >
                            <option value="">All Types</option>
                            <option value="classification">Classification</option>
                            <option value="regression">Regression</option>
                            <option value="nlp">Natural Language Processing</option>
                            <option value="computer-vision">Computer Vision</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Sort By</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">Newest</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="rating">Rating</option>
                        </select>
                    </div>
                </div>

                <div className="filter-row">
                    <div className="filter-group">
                        <label>Min Price (ALGO)</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={filters.minPrice}
                            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Max Price (ALGO)</label>
                        <input
                            type="number"
                            placeholder="1000"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Models Grid */}
            <div className="models-grid">
                {sortedModels.length === 0 ? (
                    <div className="text-center">
                        <h3>No models found</h3>
                        <p>Try adjusting your filters or check back later for new models.</p>
                    </div>
                ) : (
                    sortedModels.map((model) => (
                        <div key={model.id} className="model-card">
                            <div className="model-header">
                                <h3 className="model-name">{model.name}</h3>
                                <div className="model-rating">
                                    {renderStars(model.rating || 0)}
                                    <span className="rating-text">
                                        {model.rating ? model.rating.toFixed(1) : 'N/A'} ({model.reviewCount || 0} reviews)
                                    </span>
                                </div>
                            </div>

                            <div className="model-meta">
                                <span className="model-framework">{model.framework}</span>
                                <span className="model-type">{model.modelType}</span>
                                <span className="model-publisher">by {model.publisher}</span>
                            </div>

                            <p className="model-description">{model.description}</p>

                            <div className="model-tags">
                                {model.tags && model.tags.map((tag, index) => (
                                    <span key={index} className="tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {model.performanceMetrics && Object.keys(model.performanceMetrics).length > 0 && (
                                <div className="model-performance">
                                    <h4>Performance Metrics</h4>
                                    <div className="metrics-grid">
                                        {Object.entries(model.performanceMetrics).map(([key, value]) => (
                                            <div key={key} className="metric">
                                                <span className="metric-label">{key}</span>
                                                <span className="metric-value">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="model-footer">
                                <div className="model-price">
                                    <span className="price-amount">{formatPrice(model.price)} ALGO</span>
                                    <span className="price-label">Price</span>
                                </div>
                                <div className="model-actions">
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setSelectedModel(model)}
                                    >
                                        View Details
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handlePurchase(model)}
                                        disabled={!wallet.connected}
                                    >
                                        {wallet.connected ? 'Purchase' : 'Connect Wallet'}
                                    </button>
                                </div>
                            </div>

                            <div className="model-date">
                                Published {formatDate(model.createdAt)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Purchase Modal */}
            {showPurchaseModal && selectedModel && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Purchase Model</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowPurchaseModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-content">
                            <div className="model-summary">
                                <h4>{selectedModel.name}</h4>
                                <p>{selectedModel.description}</p>
                                
                                <div className="model-details">
                                    <div className="detail-item">
                                        <span className="label">Framework:</span>
                                        <span className="value">{selectedModel.framework}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Type:</span>
                                        <span className="value">{selectedModel.modelType}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Publisher:</span>
                                        <span className="value">{selectedModel.publisher}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="purchase-summary">
                                <div className="price-breakdown">
                                    <div className="price-item">
                                        <span>Model Price</span>
                                        <span>{formatPrice(selectedModel.price)} ALGO</span>
                                    </div>
                                    <div className="price-item">
                                        <span>Platform Fee (2%)</span>
                                        <span>{formatPrice(selectedModel.price * 0.02)} ALGO</span>
                                    </div>
                                    <div className="price-item total">
                                        <span>Total</span>
                                        <span>{formatPrice(selectedModel.price * 1.02)} ALGO</span>
                                    </div>
                                </div>

                                <div className="wallet-info">
                                    <div className="wallet-balance">
                                        <span>Your Balance:</span>
                                        <span>{wallet.balance.toFixed(2)} ALGO</span>
                                    </div>
                                    {wallet.balance < selectedModel.price * 1.02 / 1000000 && (
                                        <div className="insufficient-balance">
                                            <p>⚠️ Insufficient balance. Please add more ALGO to your wallet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPurchaseModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={confirmPurchase}
                                disabled={wallet.balance < selectedModel.price * 1.02 / 1000000}
                            >
                                Pay {formatPrice(selectedModel.price * 1.02)} ALGO
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
